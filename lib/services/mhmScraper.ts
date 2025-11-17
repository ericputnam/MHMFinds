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

        // Look for mod entries with H3 headings (Format 1)
        if ($el.is('h3')) {
          let modTitle = $el.text().trim();

          // Skip if it's not a real mod title
          if (!modTitle || modTitle.length < 3) return;

          // Remove listicle numbers from title (e.g., "3. ", "36. ", etc.)
          modTitle = modTitle.replace(/^\d+\.\s*/, '').trim();

          // Find the next image and download link after this h3
          let $next = $el.next();
          let image: string | undefined;
          let downloadUrl: string | undefined;
          let description = '';
          let additionalImages: string[] = [];

          // Look ahead for image, description, and download link
          for (let i = 0; i < 10 && $next.length > 0; i++) {
            // Get image - prioritize data-src over src (lazy loading)
            if (!image && $next.is('figure.wp-block-image')) {
              const $img = $next.find('img');
              // Check data-src FIRST (WordPress lazy loading)
              const imgSrc = $img.attr('data-src') ||
                            $img.attr('data-lazy-src') ||
                            $img.attr('data-orig-file') ||
                            $img.attr('src');

              // Skip SVG placeholders
              if (imgSrc && !imgSrc.startsWith('data:image/svg')) {
                // Handle relative URLs
                image = imgSrc.startsWith('http') ? imgSrc : `${this.baseUrl}${imgSrc}`;
              }
            }

            // Get additional images
            if (image && $next.is('figure.wp-block-image')) {
              const $img = $next.find('img');
              const imgSrc = $img.attr('data-src') ||
                            $img.attr('data-lazy-src') ||
                            $img.attr('data-orig-file') ||
                            $img.attr('src');

              if (imgSrc && !imgSrc.startsWith('data:image/svg') && imgSrc !== image) {
                const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : `${this.baseUrl}${imgSrc}`;
                additionalImages.push(fullImgSrc);
              }
            }

            // Get description and download link from paragraphs
            if ($next.is('p')) {
              const text = $next.text().trim();
              const textLower = text.toLowerCase();

              // Check for download link - prioritize external links
              const links = $next.find('a[href]');
              links.each((_, linkEl) => {
                const $linkEl = $(linkEl);
                const href = $linkEl.attr('href');
                const linkText = $linkEl.text().toLowerCase();

                // Skip internal blog links
                if (!href || href.includes(this.baseUrl) || href.startsWith('#')) {
                  return;
                }

                // Prioritize links with "download" text or after "Download:" label
                if (!downloadUrl && (
                  linkText.includes('download') ||
                  linkText.includes('get') ||
                  textLower.includes('download:') ||
                  textLower.includes('download link')
                )) {
                  downloadUrl = href;
                }
              });

              // Get description (skip download-only paragraphs)
              if (text && !textLower.startsWith('download') && text.length > 10) {
                description += (description ? ' ' : '') + text;
              }
            }

            // Stop if we hit another h2 or h3
            if ($next.is('h2') || $next.is('h3')) {
              break;
            }

            $next = $next.next();
          }

          // Extract author from download URL
          let author: string | undefined;
          if (downloadUrl) {
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
