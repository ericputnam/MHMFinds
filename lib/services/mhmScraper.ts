import { prisma } from '@/lib/prisma';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { aiCategorizer } from './aiCategorizer';
import { modBlockParser } from './modBlockParser';

export interface ScrapedMod {
  title: string;
  description?: string;
  shortDescription?: string;
  category?: string; // DEPRECATED: flat category string
  categoryId?: string; // NEW: hierarchical category reference
  categoryPath?: string[]; // NEW: category breadcrumb for display
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

      const uniqueUrls = Array.from(new Set(allUrls));
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
   * IMPORTANT: Be strict - avoid generic blog header images
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
      if (!src || src.startsWith('data:image/svg') || src.length < 10) {
        continue;
      }

      // FILTER OUT: Generic blog header images
      const srcLower = src.toLowerCase();
      if (
        srcLower.includes('blog-post-image') ||
        srcLower.includes('featured-image') ||
        srcLower.includes('header-image') ||
        srcLower.includes('hero-image') ||
        srcLower.includes('placeholder') ||
        srcLower.includes('felister-blog')
      ) {
        continue;
      }

      return src.startsWith('http') ? src : `${this.baseUrl}${src}`;
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

    // SECOND: Check for obvious listicle title patterns
    // Patterns like "30+ Best", "25 Sims 4", "Top 20", "Must-Have", etc.
    const listiclePatterns = [
      /\d+\+\s+(best|top|sims\s*4|must-have)/i,  // "30+ Best", "25+ Sims 4"
      /^\d+\+\s+/i,                               // Starts with "30+ "
      /^(top|best)\s+\d+/i,                       // "Top 20", "Best 15"
      /\d+\s+(best|top|must-have|sims\s*4)/i,     // "20 Best", "15 Top"
      /must-have\s+sims\s*4/i,                    // "Must-Have Sims 4"
      /^\d+\s+sims\s*4/i,                         // "25 Sims 4"
    ];

    for (const pattern of listiclePatterns) {
      if (pattern.test(postTitle)) {
        console.log(`   ✅ Listicle detected by title pattern: "${postTitle}"`);
        return true;
      }
    }

    // THIRD: Check if the post has properly structured mod blocks
    // Count H2/H3/H4 headers followed immediately by images
    let modBlockCount = 0;
    $('.entry-content h2, .entry-content h3, .entry-content h4').each((_, el) => {
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
   * Extract URL slug from post URL for AI categorization
   * Example: https://musthavemods.com/sims-4-lamp-cc/ -> "sims-4-lamp-cc"
   */
  private extractUrlSlug(postUrl: string): string {
    try {
      const url = new URL(postUrl);
      const pathParts = url.pathname.split('/').filter(p => p.length > 0);
      // Get the last part of the path (the slug)
      return pathParts[pathParts.length - 1] || '';
    } catch (error) {
      return '';
    }
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
        timeout: 30000, // 30 second timeout to prevent ETIMEDOUT errors
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

      // Extract URL slug for AI categorization
      const urlSlug = this.extractUrlSlug(postUrl);
      console.log(`   📝 URL slug: "${urlSlug}"`);

      // Use AI to determine hierarchical category
      let categoryId: string | undefined;
      let categoryPath: string[] | undefined;
      try {
        categoryId = await aiCategorizer.categorizeFromSlug(urlSlug, postTitle);
        categoryPath = await aiCategorizer.getCategoryBreadcrumb(categoryId);
        console.log(`   🤖 AI Category: ${categoryPath.join(' > ')}`);
      } catch (error) {
        console.log(`   ⚠️  AI categorization unavailable (check OPENAI_API_KEY), using keyword fallback`);
        // Fallback to old flat category system
      }

      // Get featured image as fallback
      const featuredImage = this.extractFeaturedImage($);

      // 🚀 FAST CHEERIO PARSING (default) or AI PARSING (if enabled)
      const useAI = process.env.USE_AI_SCRAPER === 'true';

      if (useAI) {
        console.log('   🤖 Parsing entire article with AI...');
        const articleHtml = $('.entry-content').html() || '';
        const aiParsedMods = await modBlockParser.parseArticleWithAI(articleHtml, this.baseUrl);

        if (aiParsedMods.length > 0) {
          console.log(`   ✅ AI extracted ${aiParsedMods.length} mods from article`);

          // Convert AI-parsed mods to ScrapedMod format
          for (const aiMod of aiParsedMods) {
            const tags = [
              ...postTags,
              ...postCategories,
              ...this.extractTagsFromTitle(aiMod.title),
            ].filter(t => t && t.length > 0);

            mods.push({
              title: aiMod.title,
              description: aiMod.description,
              shortDescription: aiMod.description ? aiMod.description.substring(0, 200) : undefined,
              category: 'Other', // Legacy flat category
              categoryId,
              categoryPath,
              tags: Array.from(new Set(tags)),
              thumbnail: aiMod.image || featuredImage,
              images: aiMod.image ? [aiMod.image] : featuredImage ? [featuredImage] : [],
              downloadUrl: aiMod.downloadUrl,
              sourceUrl: postUrl,
              source: 'MustHaveMods.com',
              author: aiMod.author,
              isFree: !aiMod.description?.toLowerCase().includes('early access') &&
                !aiMod.description?.toLowerCase().includes('patreon exclusive'),
              isNSFW: false,
              publishedAt: postDate ? new Date(postDate) : new Date(),
            });
          }

          return mods;
        }
      }

      // Fast cheerio parsing (default)
      console.log('   ⚡ Fast cheerio parsing...');

      // Extract main category from h2 tags (used for old flat system)
      let currentCategory = 'Other';

      // Iterate through all elements in the content
      const contentElements = $('.entry-content > *').toArray();
      for (const element of contentElements) {
        const $el = $(element);

        // Update category when we hit H2 or H3 headers (category dividers)
        if ($el.is('h2') || $el.is('h3')) {
          const headerText = $el.text().trim();
          const headerLower = headerText.toLowerCase();

          // FILTER: Skip common article section headers (not categories)
          const isArticleSection =
            headerLower.includes('faq') ||
            headerLower.includes('conclusion') ||
            headerLower.includes('final thoughts') ||
            headerLower.includes('introduction') ||
            headerLower.includes('best sims 4') ||
            headerLower.includes('sims 4') && (headerLower.includes('cc for') || headerLower.includes('mods for')) ||
            headerLower.includes('guide') ||
            headerLower.includes('tips and tricks') ||
            headerLower.includes('how to') ||
            headerLower.includes('summary') ||
            headerLower.includes('table of contents') ||
            headerLower.includes('related posts') ||
            headerLower.includes('you may also like') ||
            headerLower.startsWith('top ') ||
            headerLower.startsWith('best ');

          // Only update category if it's NOT followed by an image AND it's not an article section
          // (real mods have images, true category dividers don't and aren't article sections)
          const $nextEl = $el.next();
          if (!isArticleSection && !$nextEl.is('figure.wp-block-image') && !$nextEl.hasClass('wp-block-image')) {
            currentCategory = headerText;
          }
        }

        // DISABLED: Format 2 (paragraph link lists) - causes false positives
        // This was creating mods from description links like "Lighting Overlay 1.0" and "by Josh"
        // MustHaveMods.com uses H2/H3/H4-based structure, so this Format 2 code is not needed
        //
        // If we ever need to support simple link-list posts, we should:
        // 1. Detect if the post has H2/H3/H4 headers first
        // 2. Only use this Format 2 if there are NO headers
        // 3. Add stricter validation to avoid description/author links

        // Look for mod entries with H2, H3, or H4 headings
        // (H2/H3/H4 can all be used for mod titles depending on the post)
        if ($el.is('h2') || $el.is('h3') || $el.is('h4')) {
          let modTitle = $el.text().trim();

          // Skip if it's not a real mod title
          if (!modTitle || modTitle.length < 3) continue;

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
            continue;
          }

          // Manual parsing (fallback when bulk AI parsing fails)
          console.log(`   🔧 Manual parsing: "${modTitle}"`);
          let author: string | undefined;
          let image: string | undefined;
          let description = '';
          let downloadUrl: string | undefined;
          let additionalImages: string[] = [];

          // Remove listicle numbers from title (e.g., "3. ", "36. ", etc.)
          modTitle = modTitle.replace(/^\d+\.\s*/, '').trim();

          // Extract author from title if present (e.g., "Mod Name by AuthorName")
          const titleParsed = this.extractAuthorFromTitle(modTitle);
          modTitle = titleParsed.cleanTitle;
          let authorFromTitle = titleParsed.author;

          // STEP 1: Extract the PRIMARY IMAGE from the IMMEDIATE next element(s)
          // The mod-specific image is ALWAYS within the first 1-2 elements after the header
          let $next = $el.next();

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

                // Skip internal/ad links
                if (!href ||
                  href.includes(this.baseUrl) ||
                  href.startsWith('#') ||
                  href.includes('mediavine.com') ||
                  href.includes('doubleclick.net') ||
                  href.includes('googleadservices')) {
                  return;
                }

                // STRICT: ONLY accept kb-button class (Kadence download buttons)
                if ($linkEl.hasClass('kb-button')) {
                  downloadUrl = href;
                }
              });
            }

            // Process links inside paragraphs
            if ($searchIn && $searchIn.length > 0) {
              const text = $searchIn.text().trim();
              const textLower = text.toLowerCase();

              // STRICT: ONLY accept links in paragraphs that start with "Download:"
              if (textLower.startsWith('download:') || textLower.startsWith('download link:')) {
                const links = $searchIn.find('a[href]');
                links.each((_, linkEl) => {
                  const $linkEl = $(linkEl);
                  const href = $linkEl.attr('href');

                  // Skip internal blog links and ads
                  if (!href ||
                    href.includes(this.baseUrl) ||
                    href.startsWith('#') ||
                    href.includes('mediavine.com') ||
                    href.includes('doubleclick.net') ||
                    href.includes('googleadservices')) {
                    return;
                  }

                  // This is a download link (paragraph starts with "Download:")
                  if (!downloadUrl) {
                    downloadUrl = href;
                  }
                });
              } else {
                // Collect description (not a download paragraph)
                if (text.length > 10) {
                  description += (description ? ' ' : '') + text;
                }
              }
            }

            // Check for standalone download link/button with kb-button class
            if (!downloadUrl && $next.is('a') && $next.hasClass('kb-button')) {
              const href = $next.attr('href');

              if (href &&
                !href.includes(this.baseUrl) &&
                !href.includes('mediavine.com')) {
                downloadUrl = href;
              }
            }

            $next = $next.next();
            elementsChecked++;
          }

          // Extract author - prioritize title, then download URL, then scrape mod page
          if (!author && authorFromTitle) {
            author = authorFromTitle;
          }
          if (!author && downloadUrl) {
            try {
              const url = new URL(downloadUrl);
              author = this.extractAuthorFromUrl(url);
            } catch (error) {
              // Invalid URL
            }
          }
          // If still no author, scrape the actual mod page as a last resort
          if (!author && downloadUrl) {
            author = await this.scrapeAuthorFromModPage(downloadUrl);
            if (author) {
              console.log(`      ✅ Found author from mod page: ${author}`);
            }
          }

          // CRITICAL FILTER: Skip if no download link found
          // Rule: No download link = Not a mod
          if (!downloadUrl) {
            continue;
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

          // STRICT: Only add if we have a title AND a specific mod image
          // DO NOT use featuredImage as fallback - it's often a generic blog header
          if (modTitle && image) {
            const finalImages = [image, ...additionalImages];

            mods.push({
              title: modTitle,
              description: description || undefined,
              shortDescription: description ? description.substring(0, 200) : undefined,
              category: this.normalizeCategory(currentCategory), // Flat category (legacy)
              categoryId, // NEW: hierarchical category ID
              categoryPath, // NEW: category breadcrumb for display
              tags: Array.from(new Set(tags)), // Remove duplicates
              thumbnail: image, // Use ONLY the specific mod image
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
      }

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
   * Scrape author from the actual mod page by following the download link
   * This is a fallback when we can't determine the author from title or URL pattern
   */
  private async scrapeAuthorFromModPage(downloadUrl: string): Promise<string | undefined> {
    try {
      console.log(`      🔍 Scraping author from mod page: ${downloadUrl}`);

      const response = await axios.get(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 10000, // 10 second timeout
      });

      const $ = cheerio.load(response.data);
      const url = new URL(downloadUrl);
      const hostname = url.hostname;

      // Patreon - look for creator name
      if (hostname.includes('patreon.com')) {
        // Try multiple selectors for Patreon creator name
        const selectors = [
          'a[data-tag="post-card-avatar-link"]',
          '[data-tag="post-published-at"] a',
          '.creator-name',
          'h1[data-tag="creator-page-name"]',
          'meta[property="og:title"]',
        ];

        for (const selector of selectors) {
          const authorEl = $(selector).first();
          if (selector === 'meta[property="og:title"]') {
            const content = authorEl.attr('content');
            if (content) {
              // Extract name from "Creator Name is creating..." or "Post Title | Creator Name"
              const match = content.match(/^(.+?)\s+is creating|(.+?)\s*\|/) || content.match(/^(.+?)$/);
              if (match) {
                return (match[1] || match[2] || match[3])?.trim();
              }
            }
          } else {
            const text = authorEl.text().trim();
            if (text && text.length > 0 && text.length < 50) {
              return text;
            }
          }
        }
      }

      // The Sims Resource - look for creator/member name
      else if (hostname.includes('thesimsresource.com')) {
        const selectors = [
          '.artist-profile-name',
          '.member-name',
          'a[href*="/members/"]',
          'meta[property="og:title"]',
        ];

        for (const selector of selectors) {
          const authorEl = $(selector).first();
          if (selector === 'meta[property="og:title"]') {
            const content = authorEl.attr('content');
            if (content) {
              // Extract creator name from title like "ModName by CreatorName"
              const match = content.match(/\sby\s+(.+?)(?:\s*-|\s*\||$)/i);
              if (match) {
                return match[1].trim();
              }
            }
          } else {
            const text = authorEl.text().trim();
            if (text && text.length > 0 && text.length < 50) {
              return text;
            }
          }
        }
      }

      // Tumblr - extract from subdomain
      else if (hostname.includes('tumblr.com')) {
        const match = hostname.match(/^([^\.]+)\.tumblr\.com/);
        if (match) {
          let author = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
          author = author.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          return author;
        }
      }

      // CurseForge - look for author
      else if (hostname.includes('curseforge.com')) {
        const selectors = [
          '.user-tag a',
          '.author-name',
          'a[href*="/members/"]',
          'meta[name="author"]',
        ];

        for (const selector of selectors) {
          const authorEl = $(selector).first();
          if (selector === 'meta[name="author"]') {
            const content = authorEl.attr('content');
            if (content) {
              return content.trim();
            }
          } else {
            const text = authorEl.text().trim();
            if (text && text.length > 0 && text.length < 50) {
              return text;
            }
          }
        }
      }

      // Generic fallback - look for common author metadata
      const genericSelectors = [
        'meta[name="author"]',
        'meta[property="article:author"]',
        '.author-name',
        '.creator-name',
        '[rel="author"]',
      ];

      for (const selector of genericSelectors) {
        const authorEl = $(selector).first();
        if (selector.startsWith('meta')) {
          const content = authorEl.attr('content');
          if (content && content.length > 0 && content.length < 50) {
            return content.trim();
          }
        } else {
          const text = authorEl.text().trim();
          if (text && text.length > 0 && text.length < 50) {
            return text;
          }
        }
      }

      return undefined;
    } catch (error) {
      console.log(`      ⚠️  Could not scrape author from mod page: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
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
  async runFullScrape(options?: { startUrl?: string; startIndex?: number }): Promise<void> {
    console.log('🚀 Starting MustHaveMods.com scraper...\n');

    // Step 1: Get all blog post URLs
    const postUrls = await this.getAllBlogPostUrls();

    if (postUrls.length === 0) {
      console.log('❌ No blog posts found. Exiting.');
      return;
    }

    // Step 2: Determine starting position
    let startPosition = 0;

    if (options?.startIndex) {
      // Start from specific index (1-based, convert to 0-based)
      startPosition = Math.max(0, options.startIndex - 1);
      if (startPosition >= postUrls.length) {
        console.log(`❌ Start index ${options.startIndex} is beyond the total ${postUrls.length} posts`);
        return;
      }
      console.log(`📍 Resuming from index ${options.startIndex} (skipping first ${startPosition} posts)`);
    } else if (options?.startUrl) {
      // Find the URL in the list
      const urlIndex = postUrls.findIndex(url => url === options.startUrl);
      if (urlIndex === -1) {
        console.log(`❌ Start URL not found in sitemap: ${options.startUrl}`);
        console.log(`💡 Make sure the URL exactly matches a post URL from the sitemap`);
        return;
      }
      startPosition = urlIndex;
      console.log(`📍 Resuming from URL (position ${startPosition + 1}/${postUrls.length})`);
    }

    // Step 3: Scrape mods from each post (starting from startPosition)
    let totalMods = 0;
    let totalSaved = 0;
    const remainingPosts = postUrls.length - startPosition;

    console.log(`📊 Total posts to scrape: ${remainingPosts} (${startPosition} skipped)\n`);

    for (let i = startPosition; i < postUrls.length; i++) {
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
