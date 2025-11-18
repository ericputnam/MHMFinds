import { prisma } from '@/lib/prisma';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedMod {
  title: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  tags: string[];
  thumbnail?: string;
  images: string[];
  downloadUrl?: string;
  sourceUrl: string;
  source: string;
  author?: string;
  isFree: boolean;
  isNSFW: boolean;
  publishedAt?: Date;
}

export class MustHaveModsScraper {
  private baseUrl = 'https://musthavemods.com';
  private delay = 2000; // 2 seconds between requests to be respectful

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all blog post URLs from WordPress sitemap index
   */
  async getAllBlogPostUrls(): Promise<string[]> {
    console.log('🔍 Fetching blog post URLs from sitemap index...');
    const allUrls: string[] = [];

    try {
      // Step 1: Fetch the main sitemap index
      const mainSitemapUrl = `${this.baseUrl}/sitemap.xml`;
      console.log('   Fetching main sitemap:', mainSitemapUrl);

      const mainResponse = await axios.get(mainSitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const $main = cheerio.load(mainResponse.data, { xmlMode: true });

      // Step 2: Find all post sitemap URLs (wp-sitemap-posts-post-*.xml)
      const postSitemaps: string[] = [];
      $main('sitemap loc').each((_, el) => {
        const url = $main(el).text().trim();
        if (url.includes('wp-sitemap-posts-post-')) {
          postSitemaps.push(url);
        }
      });

      console.log(`   Found ${postSitemaps.length} post sitemaps to process`);

      // Step 3: Fetch each post sitemap and extract URLs
      for (let i = 0; i < postSitemaps.length; i++) {
        const sitemapUrl = postSitemaps[i];
        console.log(`   Fetching sitemap ${i + 1}/${postSitemaps.length}: ${sitemapUrl}`);

        try {
          const response = await axios.get(sitemapUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
          });

          const $ = cheerio.load(response.data, { xmlMode: true });

          // Extract all post URLs from this sitemap
          $('url loc').each((_, el) => {
            const url = $(el).text().trim();
            if (url && url.includes(this.baseUrl)) {
              allUrls.push(url);
            }
          });

          console.log(`      ✅ Extracted ${$('url loc').length} URLs`);

          // Be respectful - small delay between sitemap requests
          if (i < postSitemaps.length - 1) {
            await this.sleep(500);
          }
        } catch (error) {
          console.error(`      ❌ Error fetching ${sitemapUrl}:`, error);
        }
      }

      const uniqueUrls = [...new Set(allUrls)];
      console.log(`\n✅ Total unique blog post URLs: ${uniqueUrls.length}\n`);
      return uniqueUrls;
    } catch (error) {
      console.error('Error fetching sitemap index:', error);
      console.log('⚠️  Falling back to empty list');
      return [];
    }
  }

  /**
   * Extract featured/fallback image from post
   */
  private extractFeaturedImage($: cheerio.CheerioAPI): string | undefined {
    // Try multiple sources for featured image
    const sources = [
      $('meta[property="og:image"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('article img').first().attr('data-src'),
      $('article img').first().attr('src'),
      $('.entry-content img').first().attr('data-src'),
      $('.entry-content img').first().attr('src'),
      $('.wp-post-image').attr('data-src'),
      $('.wp-post-image').attr('src'),
    ];

    for (const src of sources) {
      if (src && !src.startsWith('data:image/svg') && src.length > 10) {
        return src.startsWith('http') ? src : `${this.baseUrl}${src}`;
      }
    }

    return undefined;
  }

  /**
   * Check if a post is a mod listicle vs a guide/news article
   */
  private isModListiclePost($: cheerio.CheerioAPI, postUrl: string, postTitle: string): boolean {
    const lowerTitle = postTitle.toLowerCase();
    const lowerUrl = postUrl.toLowerCase();

    // FIRST: Check for exclude keywords - these override everything
    const excludeKeywords = [
      'how to',
      'how-to',
      'guide to',
      'guide for',
      'tutorial',
      'cheat codes',
      'cheats for',
      'all cheats',
      'walkthrough',
      'tips and tricks',
      'beginner',
      'getting started',
      'what is',
      'what are',
      'why you should',
      'should you',
      'review of',
      'game review',
      'mod review',
      'patch notes',
      'announcement',
      'news:',
    ];

    for (const keyword of excludeKeywords) {
      if (lowerTitle.includes(keyword) || lowerUrl.includes(keyword)) {
        return false;
      }
    }

    // SECOND: Check if the post has properly structured mod blocks
    // Count H2/H3 headers followed immediately by images
    let modBlockCount = 0;
    $('.entry-content h2, .entry-content h3').each((_, el) => {
      const $header = $(el);
      const $next = $header.next();

      // Check if immediately followed by an image (figure.wp-block-image)
      if ($next.is('figure.wp-block-image') || $next.hasClass('wp-block-image')) {
        modBlockCount++;
      }
    });

    // If it has 3+ properly structured mod blocks (header + image), it's a listicle
    if (modBlockCount >= 3) {
      return true;
    }

    // Otherwise, not a mod listicle
    return false;
  }

  /**
   * Scrape mods from a single blog post
   */
  async scrapeModsFromPost(postUrl: string): Promise<ScrapedMod[]> {
    try {
      const response = await axios.get(postUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      // Get post metadata
      const postTitle = $('h1.entry-title').first().text().trim();
      const postDate = $('time.entry-date').attr('datetime');
      const postCategories = $('span.category-links a').map((_, el) => $(el).text().trim()).get();
      const postTags = $('span.tag-links a').map((_, el) => $(el).text().trim()).get();

      // FILTER: Skip non-listicle posts (guides, news, tutorials, etc.)
      if (!this.isModListiclePost($, postUrl, postTitle)) {
        console.log(`   ⏭️  Skipping non-listicle post: ${postTitle}`);
        return [];
      }

      // Get featured image as fallback
      const featuredImage = this.extractFeaturedImage($);

      // Extract main category from h2 tags
      let currentCategory = 'Other';

      // Iterate through all elements in the content
      $('.entry-content > *').each((_, element) => {
        const $el = $(element);

        // Update category when we hit an h2
        if ($el.is('h2')) {
          currentCategory = $el.text().trim();
        }

        // Look for mod entries in paragraphs with multiple links (Format 2)
        // Example: <p><a>hair</a>, <a>crown</a>, <a>graphic lines</a></p>
        if ($el.is('p') && !$el.hasClass('related-post')) {
          const links = $el.find('a[href]');
          if (links.length > 0) {
            links.each((_, linkEl) => {
              const $link = $(linkEl);
              const linkText = $link.text().trim();
              const linkHref = $link.attr('href');

              // Skip if it's just "Download", "Title", or very short
              if (!linkHref || linkText.length < 3) {
                return;
              }

              const lowerLinkText = linkText.toLowerCase();
              if (lowerLinkText === 'download' ||
                  lowerLinkText === 'title' ||
                  lowerLinkText === 'click here' ||
                  lowerLinkText === 'here' ||
                  lowerLinkText === 'link') {
                return;
              }

              // Skip internal links or related posts
              if (linkHref.includes(this.baseUrl) || linkHref.startsWith('#')) {
                return;
              }

              // Skip Mediavine and ad links
              if (linkHref.includes('mediavine.com') ||
                  linkHref.includes('doubleclick.net') ||
                  linkHref.includes('googleadservices')) {
                return;
              }

              // Extract author from URL
              let author: string | undefined;
              try {
                const url = new URL(linkHref);
                author = this.extractAuthorFromUrl(url);
              } catch (error) {
                // Invalid URL
              }

              // Create mod from link
              mods.push({
                title: linkText,
                description: undefined,
                shortDescription: undefined,
                category: this.normalizeCategory(currentCategory),
                tags: [...postTags, ...postCategories, currentCategory].filter(t => t && t.length > 0),
                thumbnail: featuredImage, // Use featured image as fallback
                images: featuredImage ? [featuredImage] : [],
                downloadUrl: linkHref,
                sourceUrl: postUrl,
                source: 'MustHaveMods.com',
                author,
                isFree: true, // Assume free if in a link list
                isNSFW: false,
                publishedAt: postDate ? new Date(postDate) : new Date(),
              });
            });
          }
        }

        // Update category when we hit H2 headers (these are category dividers, not mods)
        if ($el.is('h2')) {
          currentCategory = $el.text().trim();
        }

        // Look for mod entries with H3 headings ONLY (H2 are category headers)
        if ($el.is('h3')) {
          let modTitle = $el.text().trim();

          // Skip if it's not a real mod title
          if (!modTitle || modTitle.length < 3) return;

          // FILTER: Skip common non-mod sections
          const lowerTitle = modTitle.toLowerCase();
          if (
            lowerTitle.includes('faq') ||
            lowerTitle.includes('conclusion') ||
            lowerTitle.includes('final thoughts') ||
            lowerTitle.includes('final word') ||
            lowerTitle.includes('summary') ||
            lowerTitle.includes('introduction') ||
            lowerTitle.includes('table of contents') ||
            lowerTitle.includes('related posts') ||
            lowerTitle.includes('you may also like') ||
            lowerTitle.includes('share this') ||
            lowerTitle.includes('about the author') ||
            lowerTitle === 'conclusion' ||
            lowerTitle === 'summary' ||
            lowerTitle === 'faq'
          ) {
            return;
          }

          // Remove listicle numbers from title (e.g., "3. ", "36. ", etc.)
          modTitle = modTitle.replace(/^\d+\.\s*/, '').trim();

          // Extract author from title if present (e.g., "Mod Name by AuthorName")
          const titleParsed = this.extractAuthorFromTitle(modTitle);
          modTitle = titleParsed.cleanTitle;
          let authorFromTitle = titleParsed.author;

          // STEP 1: Extract the PRIMARY IMAGE from the IMMEDIATE next element(s)
          // The mod-specific image is ALWAYS within the first 1-2 elements after the header
          let $next = $el.next();
          let image: string | undefined;
          let additionalImages: string[] = [];

          // Check ONLY the immediate next element for the primary image
          if ($next.length > 0) {
            let $img: cheerio.Cheerio<any> | null = null;

            // Pattern 1: figure.wp-block-image > img (most common)
            if ($next.is('figure.wp-block-image') || $next.hasClass('wp-block-image')) {
              $img = $next.find('img').first();
            }
            // Pattern 2: Direct img tag
            else if ($next.is('img')) {
              $img = $next;
            }
            // Pattern 3: Paragraph containing an image (rare)
            else if ($next.is('p') && $next.find('img').length > 0) {
              $img = $next.find('img').first();
            }

            // Extract and validate the image
            if ($img && $img.length > 0) {
              const imgSrc = $img.attr('data-src') ||
                            $img.attr('data-lazy-src') ||
                            $img.attr('data-orig-file') ||
                            $img.attr('src');

              // Strict validation: no ads, no SVG placeholders
              const isValidImage = imgSrc &&
                !imgSrc.startsWith('data:image/svg') &&
                !imgSrc.includes('doubleclick.net') &&
                !imgSrc.includes('googleadservices') &&
                !imgSrc.includes('googlesyndication') &&
                !imgSrc.includes('/ads/') &&
                !imgSrc.includes('ad-') &&
                !imgSrc.includes('banner') &&
                !imgSrc.includes('logo') &&
                imgSrc.length > 20;

              if (isValidImage) {
                image = imgSrc.startsWith('http') ? imgSrc : `${this.baseUrl}${imgSrc}`;
              }
            }
          }

          // STEP 2: Look for ADDITIONAL IMAGES (gallery) in next 2-3 elements
          $next = $el.next();
          for (let i = 0; i < 4 && $next.length > 0; i++) {
            if (image && ($next.is('figure.wp-block-image') || $next.hasClass('wp-block-image'))) {
              const $img = $next.find('img');
              const imgSrc = $img.attr('data-src') ||
                            $img.attr('data-lazy-src') ||
                            $img.attr('data-orig-file') ||
                            $img.attr('src');

              const isValidAdditionalImage = imgSrc &&
                !imgSrc.startsWith('data:image/svg') &&
                !imgSrc.includes('doubleclick.net') &&
                !imgSrc.includes('googleadservices') &&
                !imgSrc.includes('googlesyndication') &&
                !imgSrc.includes('/ads/') &&
                !imgSrc.includes('ad-') &&
                !imgSrc.includes('banner') &&
                !imgSrc.includes('logo') &&
                imgSrc.length > 20 &&
                imgSrc !== image;

              if (isValidAdditionalImage) {
                const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : `${this.baseUrl}${imgSrc}`;
                additionalImages.push(fullImgSrc);
              }
            }

            $next = $next.next();
          }

          // STEP 3: Look for DOWNLOAD LINK - MUST be within next 5 elements
          // Structure: image → (optional description p tags) → download p/button
          $next = $el.next();
          let downloadUrl: string | undefined;
          let description = '';
          let elementsChecked = 0;

          // Skip to first element after the image
          if ($next.is('figure.wp-block-image') || $next.hasClass('wp-block-image')) {
            $next = $next.next();
          }


          // Look ONLY in next 5 elements for download link
          while (elementsChecked < 5 && $next.length > 0) {

            // Skip ONLY Mediavine ad blocks (not all DIVs!)
            if ($next.hasClass('mv-ad-box') ||
                $next.attr('id')?.includes('mediavine') ||
                $next.attr('id')?.includes('ad-') ||
                $next.attr('class')?.includes('ad-') ||
                $next.find('.mv-ad-box').length > 0) {
              $next = $next.next();
              elementsChecked++;
              continue;
            }

            // Stop if we hit another h2 or h3 (next mod entry)
            if ($next.is('h2') || $next.is('h3')) {
              break;
            }

            // Check for download link in: paragraph, DIV with paragraphs, or DIV with direct links
            let $searchIn: cheerio.Cheerio<any> | null = null;
            let directLinks: cheerio.Cheerio<any> | null = null;

            if ($next.is('p')) {
              $searchIn = $next;
            } else if ($next.is('div')) {
              // Check if DIV contains paragraphs
              const $paragraphs = $next.find('p');
              if ($paragraphs.length > 0) {
                $searchIn = $paragraphs.first();
              } else {
                // DIV has direct links (no paragraphs)
                directLinks = $next.find('a[href]');
              }
            }

            // Process direct links in DIV (no paragraphs)
            if (directLinks && directLinks.length > 0) {
              directLinks.each((_, linkEl) => {
                if (downloadUrl) return; // Already found

                const $linkEl = $(linkEl);
                const href = $linkEl.attr('href');
                const linkText = $linkEl.text().toLowerCase().trim();

                // Skip internal/ad links
                if (!href ||
                    href.includes(this.baseUrl) ||
                    href.startsWith('#') ||
                    href.includes('mediavine.com') ||
                    href.includes('doubleclick.net') ||
                    href.includes('googleadservices')) {
                  return;
                }

                // Accept download links or mod platform links
                const isExplicitDownload = (
                  linkText === 'download' ||
                  linkText === 'get' ||
                  linkText === 'download here' ||
                  linkText === 'get it here'
                );

                const isModPlatformLink = (
                  href.includes('patreon.com/posts/') ||
                  href.includes('curseforge.com/') ||
                  href.includes('thesimsresource.com/downloads/') ||
                  href.includes('simsdom.com/') ||
                  href.includes('tumblr.com/post/')
                );

                if (isExplicitDownload || isModPlatformLink) {
                  downloadUrl = href;
                }
              });
            }

            // Process links inside paragraphs
            if ($searchIn && $searchIn.length > 0) {
              const text = $searchIn.text().trim();
              const textLower = text.toLowerCase();

              // Look for explicit "Download:" label or download button
              const links = $searchIn.find('a[href]');
              if (links.length === 0 && $searchIn.is('p')) {
                // Check if the paragraph itself contains a link
                const directLinks = $searchIn.parent().find('a[href]');
                directLinks.each((_, linkEl) => {
                  const $linkEl = $(linkEl);
                  const href = $linkEl.attr('href');
                  const linkText = $linkEl.text().toLowerCase();

                  // Skip internal blog links and ads
                  if (!href ||
                      href.includes(this.baseUrl) ||
                      href.startsWith('#') ||
                      href.includes('mediavine.com') ||
                      href.includes('doubleclick.net') ||
                      href.includes('googleadservices')) {
                    return;
                  }

                  // Accept if:
                  // 1. Explicitly marked as download, OR
                  // 2. Links to a mod platform (Patreon, CurseForge, etc.)
                  const isExplicitDownload = (
                    textLower.startsWith('download:') ||
                    textLower.startsWith('download link:') ||
                    textLower === 'download' ||
                    linkText === 'download' ||
                    linkText === 'get' ||
                    linkText === 'download here' ||
                    linkText === 'get it here' ||
                    linkText.trim() === 'download' ||
                    linkText.trim() === 'get'
                  );

                  const isModPlatformLink = (
                    href.includes('patreon.com/posts/') ||
                    href.includes('curseforge.com/') ||
                    href.includes('thesimsresource.com/downloads/') ||
                    href.includes('simsdom.com/') ||
                    href.includes('tumblr.com/post/')
                  );

                  if (!downloadUrl && (isExplicitDownload || isModPlatformLink)) {
                    downloadUrl = href;
                  }
                });
              } else {
                links.each((_, linkEl) => {
                  const $linkEl = $(linkEl);
                  const href = $linkEl.attr('href');
                  const linkText = $linkEl.text().toLowerCase();

                  // Skip internal blog links and ads
                  if (!href ||
                      href.includes(this.baseUrl) ||
                      href.startsWith('#') ||
                      href.includes('mediavine.com') ||
                      href.includes('doubleclick.net') ||
                      href.includes('googleadservices')) {
                    return;
                  }

                  // Accept if:
                  // 1. Explicitly marked as download, OR
                  // 2. Links to a mod platform (Patreon, CurseForge, etc.)
                  const isExplicitDownload = (
                    textLower.startsWith('download:') ||
                    textLower.startsWith('download link:') ||
                    textLower === 'download' ||
                    linkText === 'download' ||
                    linkText === 'get' ||
                    linkText === 'download here' ||
                    linkText === 'get it here' ||
                    linkText.trim() === 'download' ||
                    linkText.trim() === 'get'
                  );

                  const isModPlatformLink = (
                    href.includes('patreon.com/posts/') ||
                    href.includes('curseforge.com/') ||
                    href.includes('thesimsresource.com/downloads/') ||
                    href.includes('simsdom.com/') ||
                    href.includes('tumblr.com/post/')
                  );

                  if (!downloadUrl && (isExplicitDownload || isModPlatformLink)) {
                    downloadUrl = href;
                  }
                });
              }

              // Collect description (skip download paragraphs)
              if (!textLower.startsWith('download') && text.length > 10) {
                description += (description ? ' ' : '') + text;
              }
            }

            // Check for standalone download link/button
            if (!downloadUrl && $next.is('a')) {
              const href = $next.attr('href');
              const linkText = $next.text().toLowerCase();

              if (href &&
                  !href.includes(this.baseUrl) &&
                  !href.includes('mediavine.com') &&
                  (linkText === 'download' || linkText === 'get')) {
                downloadUrl = href;
              }
            }

            $next = $next.next();
            elementsChecked++;
          }

          // CRITICAL FILTER: Skip if no download link found
          // Rule: No download link = Not a mod
          if (!downloadUrl) {
            return;
          }

          // Extract author - prioritize title, then download URL
          let author: string | undefined = authorFromTitle;
          if (!author && downloadUrl) {
            try {
              const url = new URL(downloadUrl);
              author = this.extractAuthorFromUrl(url);
            } catch (error) {
              // Invalid URL
            }
          }

          // Determine if it's free or early access
          const isFree = !description.toLowerCase().includes('early access') &&
                         !description.toLowerCase().includes('patreon exclusive');

          // Build tags from post tags, categories, and mod title
          const tags = [
            ...postTags,
            ...postCategories,
            currentCategory,
            ...this.extractTagsFromTitle(modTitle),
          ].filter(t => t && t.length > 0);

          // Only add if we have at least a title and either an image or download URL
          if (modTitle && (image || downloadUrl || featuredImage)) {
            // Use specific image, or fallback to featured image
            const finalThumbnail = image || featuredImage;
            const finalImages = image
              ? [image, ...additionalImages]
              : featuredImage
              ? [featuredImage, ...additionalImages]
              : additionalImages;

            mods.push({
              title: modTitle,
              description: description || undefined,
              shortDescription: description ? description.substring(0, 200) : undefined,
              category: this.normalizeCategory(currentCategory),
              tags: [...new Set(tags)], // Remove duplicates
              thumbnail: finalThumbnail,
              images: finalImages,
              downloadUrl,
              sourceUrl: postUrl,
              source: 'MustHaveMods.com',
              author,
              isFree,
              isNSFW: false, // Assume SFW for now
              publishedAt: postDate ? new Date(postDate) : new Date(),
            });
          }
        }
      });

      return mods;
    } catch (error) {
      console.error(`Error scraping post ${postUrl}:`, error);
      return [];
    }
  }

  /**
   * Extract author from mod title if present
   * Common patterns: "Mod by Author", "Mod - Author", "Mod (Author)", "Mod | Author"
   */
  private extractAuthorFromTitle(title: string): { cleanTitle: string; author?: string } {
    // Pattern 1: "Mod Name by AuthorName"
    const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
    if (byMatch) {
      return { cleanTitle: byMatch[1].trim(), author: byMatch[2].trim() };
    }

    // Pattern 2: "Mod Name - AuthorName" (only if dash is not part of mod name)
    const dashMatch = title.match(/^(.+?)\s+-\s+([A-Z][a-zA-Z0-9\s]+)$/);
    if (dashMatch && dashMatch[2].length > 2 && dashMatch[2].length < 30) {
      return { cleanTitle: dashMatch[1].trim(), author: dashMatch[2].trim() };
    }

    // Pattern 3: "Mod Name (AuthorName)"
    const parenMatch = title.match(/^(.+?)\s+\(([^)]+)\)$/);
    if (parenMatch && parenMatch[2].length > 2 && parenMatch[2].length < 30) {
      return { cleanTitle: parenMatch[1].trim(), author: parenMatch[2].trim() };
    }

    // Pattern 4: "Mod Name | AuthorName"
    const pipeMatch = title.match(/^(.+?)\s+\|\s+(.+)$/);
    if (pipeMatch && pipeMatch[2].length > 2 && pipeMatch[2].length < 30) {
      return { cleanTitle: pipeMatch[1].trim(), author: pipeMatch[2].trim() };
    }

    // No author found in title
    return { cleanTitle: title };
  }

  /**
   * Extract author/creator name from download URL
   */
  private extractAuthorFromUrl(url: URL): string | undefined {
    const hostname = url.hostname;
    const pathname = url.pathname;
    let author: string | undefined;

    if (hostname.includes('patreon.com')) {
      const match = pathname.match(/\/(?:posts\/)?([^\/\?]+)/);
      if (match && match[1] && match[1] !== 'posts') {
        author = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
        author = author.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    } else if (hostname.includes('thesimsresource.com')) {
      const memberMatch = pathname.match(/\/members\/([^\/\?]+)/);
      const downloadMatch = pathname.match(/\/downloads\/details\/[^\/]+\/[^\/]+\/([^\/\?]+)/);
      const creatorName = memberMatch?.[1] || downloadMatch?.[1];
      if (creatorName) {
        author = creatorName.replace(/-/g, ' ').replace(/_/g, ' ');
        author = author.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else {
        author = 'TSR Creator';
      }
    } else if (hostname.includes('tumblr.com')) {
      const match = hostname.match(/^([^\.]+)\.tumblr\.com/);
      if (match) {
        author = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
        author = author.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    } else if (hostname.includes('curseforge.com')) {
      const match = pathname.match(/\/members\/([^\/\?]+)/);
      author = match?.[1] || 'CurseForge Creator';
    } else if (hostname.includes('simsdom.com')) {
      author = 'SimsDom';
    } else if (hostname.includes('modthesims.info')) {
      author = 'ModTheSims Community';
    } else {
      const domainParts = hostname.split('.');
      if (domainParts.length >= 2) {
        author = domainParts[domainParts.length - 2];
        author = author.charAt(0).toUpperCase() + author.slice(1);
      }
    }

    return author;
  }

  /**
   * Normalize category names
   */
  private normalizeCategory(category: string): string {
    const normalized = category.toLowerCase();

    if (normalized.includes('hair')) return 'Hair';
    if (normalized.includes('clothes') || normalized.includes('clothing')) return 'CAS - Clothing';
    if (normalized.includes('makeup')) return 'CAS - Makeup';
    if (normalized.includes('accessories')) return 'CAS - Accessories';
    if (normalized.includes('furniture') || normalized.includes('build')) return 'Build/Buy';
    if (normalized.includes('gameplay')) return 'Gameplay';
    if (normalized.includes('food')) return 'Build/Buy - Clutter';
    if (normalized.includes('poses')) return 'Poses';

    return 'Other';
  }

  /**
   * Extract tags from mod title
   */
  private extractTagsFromTitle(title: string): string[] {
    const tags: string[] = [];
    const lower = title.toLowerCase();

    // Life stages
    if (lower.includes('toddler')) tags.push('toddler');
    if (lower.includes('child')) tags.push('child');
    if (lower.includes('teen')) tags.push('teen');
    if (lower.includes('adult')) tags.push('adult');
    if (lower.includes('elder')) tags.push('elder');

    // Gender
    if (lower.includes('female') || lower.includes('feminine')) tags.push('female');
    if (lower.includes('male') || lower.includes('masculine')) tags.push('male');

    // Style
    if (lower.includes('maxis match') || lower.includes('mm')) tags.push('maxis-match');
    if (lower.includes('alpha')) tags.push('alpha');
    if (lower.includes('victorian')) tags.push('victorian');
    if (lower.includes('modern')) tags.push('modern');
    if (lower.includes('vintage')) tags.push('vintage');

    return tags;
  }

  /**
   * Save mods to database
   */
  async saveModsToDatabase(mods: ScrapedMod[]): Promise<number> {
    let savedCount = 0;

    for (const mod of mods) {
      try {
        // Check if mod already exists by download URL (most reliable)
        // or by title + source URL combination
        const whereConditions = [];

        if (mod.downloadUrl) {
          whereConditions.push({ downloadUrl: mod.downloadUrl });
        }

        whereConditions.push({
          AND: [
            { title: mod.title },
            { sourceUrl: mod.sourceUrl },
          ],
        });

        const existing = await prisma.mod.findFirst({
          where: {
            OR: whereConditions,
          },
        });

        if (existing) {
          // Update existing record if we have new data
          const needsUpdate =
            (!existing.thumbnail && mod.thumbnail) ||
            (!existing.description && mod.description) ||
            (existing.images.length === 0 && mod.images.length > 0) ||
            (!existing.author && mod.author) ||
            (existing.author === 'posts' && mod.author) || // Fix "posts" placeholder
            (existing.title.match(/^\d+\./) && !mod.title.match(/^\d+\./)) || // Fix numbered titles
            (existing.downloadUrl && existing.downloadUrl.includes('musthavemods.com') && mod.downloadUrl && !mod.downloadUrl.includes('musthavemods.com')); // Fix internal download links

          if (needsUpdate) {
            await prisma.mod.update({
              where: { id: existing.id },
              data: {
                // Update fields that are missing or improved
                title: mod.title, // Always update title to fix numbering
                thumbnail: mod.thumbnail || existing.thumbnail,
                images: mod.images.length > 0 ? mod.images : existing.images,
                description: mod.description || existing.description,
                shortDescription: mod.shortDescription || existing.shortDescription,
                author: mod.author || existing.author,
                tags: mod.tags.length > existing.tags.length ? mod.tags : existing.tags,
              },
            });
            savedCount++;
            console.log(`   🔄 Updated: ${mod.title} (added missing data)`);
          } else {
            console.log(`   ⏭️  Skipping: ${mod.title} (already complete)`);
          }
          continue;
        }

        // Create new mod
        await prisma.mod.create({
          data: {
            title: mod.title,
            description: mod.description,
            shortDescription: mod.shortDescription,
            category: mod.category || 'Other',
            tags: mod.tags,
            thumbnail: mod.thumbnail,
            images: mod.images,
            downloadUrl: mod.downloadUrl,
            sourceUrl: mod.sourceUrl,
            source: mod.source,
            author: mod.author,
            isFree: mod.isFree,
            isNSFW: mod.isNSFW,
            gameVersion: 'Sims 4',
            publishedAt: mod.publishedAt,
            isVerified: true, // Trust our own site
          },
        });

        savedCount++;
        console.log(`   ✅ Created: ${mod.title}`);
      } catch (error) {
        console.error(`   ❌ Error saving mod "${mod.title}":`, error);
      }
    }

    return savedCount;
  }

  /**
   * Run the full scraping process
   */
  async runFullScrape(): Promise<void> {
    console.log('🚀 Starting MustHaveMods.com scraper...\n');

    // Step 1: Get all blog post URLs
    const postUrls = await this.getAllBlogPostUrls();

    if (postUrls.length === 0) {
      console.log('❌ No blog posts found. Exiting.');
      return;
    }

    // Step 2: Scrape mods from each post
    let totalMods = 0;
    let totalSaved = 0;

    for (let i = 0; i < postUrls.length; i++) {
      const postUrl = postUrls[i];
      console.log(`\n[${i + 1}/${postUrls.length}] Scraping: ${postUrl}`);

      const mods = await this.scrapeModsFromPost(postUrl);
      console.log(`   Found ${mods.length} mods in this post`);

      if (mods.length > 0) {
        const saved = await this.saveModsToDatabase(mods);
        totalMods += mods.length;
        totalSaved += saved;
      }

      // Be respectful - wait between requests
      if (i < postUrls.length - 1) {
        await this.sleep(this.delay);
      }
    }

    console.log('\n✅ Scraping complete!');
    console.log(`📊 Total mods found: ${totalMods}`);
    console.log(`💾 Total mods created/updated: ${totalSaved}`);
    console.log(`⏭️  Already complete: ${totalMods - totalSaved}`);
  }
}

export const mhmScraper = new MustHaveModsScraper();
