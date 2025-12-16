import { prisma } from '@/lib/prisma';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export interface ScrapedMod {
  title: string;
  description?: string;
  shortDescription?: string;
  version?: string;
  gameVersion?: string;
  category?: string;
  tags: string[];
  thumbnail?: string;
  images: string[];
  downloadUrl?: string;
  sourceUrl: string;
  source: string;
  sourceId?: string;
  author?: string;
  isFree: boolean;
  price?: number;
  isNSFW: boolean;
  publishedAt?: Date;
}

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  username?: string;
  password?: string;
}

export class PrivacyAggregator {
  private axiosInstances: AxiosInstance[] = [];
  private currentInstanceIndex = 0;
  private requestCount = 0;
  private lastRequestTime = 0;

  // Advanced privacy settings
  private readonly minDelay = 3000; // 3-8 seconds between requests
  private readonly maxDelay = 8000;
  private readonly maxRequestsPerSession = 50; // Rotate after 50 requests
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

  // Rotating user agents (updated regularly)
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  // Accept headers to mimic real browsers
  private readonly acceptHeaders = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  ];

  // Language preferences
  private readonly languages = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'en-CA,en;q=0.9',
    'en-AU,en;q=0.9'
  ];

  constructor() {
    this.initializeAxiosInstances();
  }

  private initializeAxiosInstances(): void {
    // Create multiple axios instances with different configurations
    for (let i = 0; i < 3; i++) {
      const instance = axios.create({
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      // Add request interceptor for privacy
      instance.interceptors.request.use((config) => {
        Object.assign(config.headers, {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': this.getRandomAcceptHeader(),
          'Accept-Language': this.getRandomLanguage(),
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        });

        // Add random referer occasionally
        if (Math.random() < 0.3) {
          config.headers['Referer'] = this.getRandomReferer();
        }

        return config;
      });

      // Add response interceptor for error handling
      instance.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 429 || error.response?.status === 403) {
            console.log(`Rate limited or blocked, rotating session...`);
            this.rotateSession();
          }
          return Promise.reject(error);
        }
      );

      this.axiosInstances.push(instance);
    }
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private getRandomAcceptHeader(): string {
    return this.acceptHeaders[Math.floor(Math.random() * this.acceptHeaders.length)];
  }

  private getRandomLanguage(): string {
    return this.languages[Math.floor(Math.random() * this.languages.length)];
  }

  private getRandomReferer(): string {
    const referers = [
      'https://www.google.com/',
      'https://www.bing.com/',
      'https://duckduckgo.com/',
      'https://www.reddit.com/r/Sims4/',
      'https://www.reddit.com/r/Sims4Mods/',
      'https://forums.thesims.com/',
      'https://www.tumblr.com/tagged/sims4',
    ];
    return referers[Math.floor(Math.random() * referers.length)];
  }

  private async delay(ms?: number): Promise<void> {
    if (ms !== undefined) {
      await new Promise(resolve => setTimeout(resolve, ms));
      return;
    }
    const delay = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
    const jitter = Math.random() * 2000; // Add up to 2 seconds of jitter
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
  }

  private rotateSession(): void {
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.axiosInstances.length;
    this.requestCount = 0;
    this.lastRequestTime = Date.now();
    console.log(`Rotated to session ${this.currentInstanceIndex + 1}`);
  }

  private async handleCloudflareChallenge(url: string): Promise<boolean> {
    console.log(`🛡️  Cloudflare challenge detected for ${url}`);

    // Try different approaches to bypass Cloudflare
    const bypassStrategies = [
      // Strategy 1: Wait and retry with different headers
      async () => {
        console.log('⏳ Strategy 1: Waiting and retrying with different headers...');
        await this.delay(10000); // Wait 10 seconds
        this.rotateSession();
        return false; // Will retry in main loop
      },

      // Strategy 2: Try mobile user agent
      async () => {
        console.log('📱 Strategy 2: Trying mobile user agent...');
        const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
        this.userAgents[this.currentInstanceIndex] = mobileUA;
        await this.delay(5000);
        return false; // Will retry in main loop
      },

      // Strategy 3: Try different referer
      async () => {
        console.log('🔗 Strategy 3: Trying different referer...');
        await this.delay(5000);
        return false; // Will retry in main loop
      }
    ];

    // Try each strategy
    for (const strategy of bypassStrategies) {
      try {
        await strategy();
        await this.delay(2000);
      } catch (error) {
        console.error('❌ Bypass strategy failed:', error);
      }
    }

    return false; // Always return false to continue trying
  }

  private shouldRotateSession(): boolean {
    return this.requestCount >= this.maxRequestsPerSession ||
      (Date.now() - this.lastRequestTime) > this.sessionTimeout;
  }

  private getCurrentAxiosInstance(): AxiosInstance {
    if (this.shouldRotateSession()) {
      this.rotateSession();
    }
    return this.axiosInstances[this.currentInstanceIndex];
  }

  async scrapePatreon(creatorUrl: string): Promise<ScrapedMod[]> {
    try {
      await this.delay();

      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(creatorUrl);

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      // Enhanced Patreon scraping with better selectors
      $('[data-tag="post-card"], .post-card, .post, .post-card__content, .post-content').each((_, element) => {
        const $el = $(element);

        // Try multiple title selectors
        const title = $el.find('h3, .post-title, .title, .post-card__title, .post-title__text').text().trim() ||
          $el.find('a[href*="/posts/"]').attr('title') ||
          $el.find('a[href*="/posts/"]').text().trim();

        // Try multiple description selectors
        const description = $el.find('.post-card-excerpt, .excerpt, .description, .post-card__excerpt, .post-excerpt').text().trim();

        // Try multiple thumbnail selectors
        const thumbnail = $el.find('img').attr('src') ||
          $el.find('img').attr('data-src') ||
          $el.find('img').attr('data-lazy-src');

        // Try multiple URL selectors
        const postUrl = $el.find('a[href*="/posts/"]').attr('href') ||
          $el.find('a').attr('href');

        // Determine if free (more flexible detection)
        const isFree = !$el.find('.post-card-preview, .preview, [class*="preview"], [class*="locked"], [class*="premium"]').length;

        if (title && postUrl && title.length > 5) {
          // Clean up the URL
          const fullUrl = postUrl.startsWith('http') ? postUrl : `https://www.patreon.com${postUrl}`;

          mods.push({
            title: title.substring(0, 200), // Limit title length
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description) || 'Other',
            tags: this.extractTags(title, description),
            thumbnail,
            images: thumbnail ? [thumbnail] : [],
            downloadUrl: fullUrl,
            sourceUrl: fullUrl,
            source: 'Patreon',
            isFree,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping Patreon:', error);
      return [];
    }
  }

  async scrapeCurseForge(gameId: string = '4'): Promise<ScrapedMod[]> {
    console.log('🚀 AGGRESSIVE CURSEFORGE SCRAPING - NO MERCY MODE ACTIVATED');
    console.log('='.repeat(60));

    const mods: ScrapedMod[] = [];
    let totalAttempts = 0;
    let successfulPages = 0;

    // AGGRESSIVE STRATEGY LIST - We're going to try EVERYTHING
    const aggressiveStrategies = [
      // Strategy 1: Direct pages with different parameters
      'https://www.curseforge.com/sims4/mods',
      'https://www.curseforge.com/sims4/mods?page=1',
      'https://www.curseforge.com/sims4/mods?page=2',
      'https://www.curseforge.com/sims4/mods?page=3',
      'https://www.curseforge.com/sims4/mods?page=4',
      'https://www.curseforge.com/sims4/mods?page=5',

      // Strategy 2: Different sorting methods
      'https://www.curseforge.com/sims4/mods?sort=popular',
      'https://www.curseforge.com/sims4/mods?sort=updated',
      'https://www.curseforge.com/sims4/mods?sort=downloads',
      'https://www.curseforge.com/sims4/mods?sort=name',

      // Strategy 3: Category-specific pages
      'https://www.curseforge.com/sims4/mods/category/all',
      'https://www.curseforge.com/sims4/mods/category/gameplay',
      'https://www.curseforge.com/sims4/mods/category/build-buy',
      'https://www.curseforge.com/sims4/mods/category/cas',
      'https://www.curseforge.com/sims4/mods/category/scripts',

      // Strategy 4: Alternative URLs
      'https://www.curseforge.com/sims4/mods?filter-game-version=2024',
      'https://www.curseforge.com/sims4/mods?filter-game-version=2023',
      'https://www.curseforge.com/sims4/mods?filter-game-version=2022',

      // Strategy 5: RSS/Feed endpoints
      'https://www.curseforge.com/sims4/mods.rss',
      'https://www.curseforge.com/sims4/mods/feed',
      'https://www.curseforge.com/sims4/mods/feed.xml',

      // Strategy 6: API-like endpoints (might be less protected)
      'https://www.curseforge.com/api/v1/mods/search?gameId=4&pageSize=50',
      'https://www.curseforge.com/api/v1/mods/search?gameId=4&sortField=1',

      // Strategy 7: Mobile versions (often less protected)
      'https://m.curseforge.com/sims4/mods',
      'https://mobile.curseforge.com/sims4/mods',

      // Strategy 8: Archive/old versions
      'https://www.curseforge.com/sims4/mods?sort=oldest',
      'https://www.curseforge.com/sims4/mods?sort=name&order=asc',
    ];

    // AGGRESSIVE USER AGENTS - We'll rotate through many
    const aggressiveUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 14; Mobile; rv:109.0) Gecko/121.0 Firefox/121.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
    ];

    for (let i = 0; i < aggressiveStrategies.length; i++) {
      const pageUrl = aggressiveStrategies[i];
      totalAttempts++;

      try {
        console.log(`🔥 AGGRESSIVE ATTEMPT ${totalAttempts}/${aggressiveStrategies.length}: ${pageUrl}`);

        // Rotate user agent aggressively
        const userAgent = aggressiveUserAgents[i % aggressiveUserAgents.length];
        this.userAgents[this.currentInstanceIndex] = userAgent;

        const instance = this.getCurrentAxiosInstance();

        // AGGRESSIVE HEADER ROTATION
        const aggressiveHeaders = {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': i % 2 === 0 ? 'en-US,en;q=0.9' : 'en-GB,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': i % 3 === 0 ? 'no-cache' : 'max-age=0',
          'Pragma': i % 3 === 0 ? 'no-cache' : '',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': i % 2 === 0 ? 'none' : 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Referer': i % 4 === 0 ? 'https://www.google.com/' :
            i % 4 === 1 ? 'https://www.bing.com/' :
              i % 4 === 2 ? 'https://duckduckgo.com/' : 'https://www.curseforge.com/',
          'Origin': 'https://www.curseforge.com',
          'DNT': '1',
          'Connection': 'keep-alive',
        };

        // AGGRESSIVE REQUEST CONFIGURATION
        const requestConfig = {
          headers: aggressiveHeaders,
          timeout: 60000, // Longer timeout
          maxRedirects: 15, // More redirects
          validateStatus: (status: number) => status < 500, // Accept 4xx
          withCredentials: false,
        };

        const response = await instance.get(pageUrl, requestConfig);

        this.requestCount++;
        this.lastRequestTime = Date.now();

        // AGGRESSIVE RESPONSE ANALYSIS
        if (response.data.includes('Just a moment') ||
          response.data.includes('cf-chl-opt') ||
          response.data.includes('Cloudflare') ||
          response.data.includes('checking your browser')) {
          console.log(`🛡️  Cloudflare challenge detected for ${pageUrl}`);
          console.log(`🔄 Rotating session and trying different approach...`);
          this.rotateSession();
          await this.delay(8000 + Math.random() * 5000); // Random longer delay
          continue;
        }

        // Check for valid content
        if (!response.data.includes('<html') || response.data.length < 1000) {
          console.log(`⚠️  Invalid response for ${pageUrl} (${response.data.length} chars)`);
          continue;
        }

        console.log(`✅ SUCCESS! Accessed ${pageUrl} (${response.data.length} chars)`);
        successfulPages++;

        const $ = cheerio.load(response.data);

        // AGGRESSIVE SELECTOR STRATEGY - TARGETING THE ACTUAL CURSEFORGE STRUCTURE
        const aggressiveSelectors = [
          // PRIMARY CURSEFORGE SELECTORS (from the screenshot)
          '.project-card',  // This is the main one!
          '[class*="project-card"]',

          // Modern selectors
          '[data-testid="mod-card"]',
          '[data-testid="project-card"]',
          '.mod-card',
          '.mod-item',
          '.project-item',

          // Generic selectors
          '[class*="mod"]',
          '[class*="project"]',
          '[class*="card"]',
          '[class*="item"]',

          // Data attributes
          '[data-project-id]',
          '[data-mod-id]',
          '[data-id]',

          // Semantic selectors
          'article',
          '.card',
          '.item',
          '.tile',
          '.grid-item',

          // Link-based selectors
          'a[href*="/mods/"]',
          'a[href*="/project/"]',
          'a[href*="/sims4/"]',

          // Fallback selectors
          'div[class*="mod"]',
          'div[class*="project"]',
          'div[class*="card"]',
        ];

        let foundMods = 0;

        for (const selector of aggressiveSelectors) {
          const elements = $(selector);
          console.log(`🔍 Trying selector "${selector}" - found ${elements.length} elements`);

          // Process elements sequentially to handle async operations
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const $el = $(element);

            // AGGRESSIVE TITLE EXTRACTION - TARGETING CURSEFORGE STRUCTURE
            const rawTitle = $el.find('.project-card__title, .mod-card__title, .mod-title, .title, h1, h2, h3, h4, h5, h6, .project-title, .card-title, .item-title').text().trim() ||
              $el.find('a[href*="/mods/"]').attr('title') ||
              $el.find('a[href*="/mods/"]').text().trim() ||
              $el.find('a[href*="/project/"]').attr('title') ||
              $el.find('a[href*="/project/"]').text().trim() ||
              $el.find('a').attr('title') ||
              $el.find('a').text().trim() ||
              $el.text().trim();

            // EXTRACT AUTHOR FROM TITLE (e.g., "XML Injector | By ScumbumboCF")
            let title = rawTitle;
            let author = null;

            // SIMPLIFIED: Focus on "By" field extraction
            if (rawTitle.includes('| By ')) {
              const parts = rawTitle.split('| By ');
              title = parts[0]?.trim() || rawTitle;
              author = parts[1]?.trim() || null;
              console.log(`📝 Extracted author from title: "${author}"`);
            } else if (rawTitle.includes(' by ')) {
              const parts = rawTitle.split(' by ');
              title = parts[0]?.trim() || rawTitle;
              author = parts[1]?.trim() || null;
              console.log(`📝 Extracted author from title: "${author}"`);
            } else if (rawTitle.includes(' By ')) {
              const parts = rawTitle.split(' By ');
              title = parts[0]?.trim() || rawTitle;
              author = parts[1]?.trim() || null;
              console.log(`📝 Extracted author from title: "${author}"`);
            }

            // TRY TO EXTRACT AUTHOR FROM THE MOD CARD ELEMENT ITSELF
            if (!author) {
              // Look for author information in the mod card element
              // Try multiple approaches to find the clean author name
              let authorElement = $el.find('.author-name .ellipsis').first(); // Try the ellipsis span first
              if (authorElement.length === 0) {
                authorElement = $el.find('.author-name').first(); // Fallback to the full element
              }

              if (authorElement.length > 0) {
                let rawAuthor = authorElement.text().trim();

                // Clean up the author name - remove "By" prefix and Pro member text
                author = rawAuthor
                  .replace(/^By\s*/i, '') // Remove "By" prefix
                  .replace(/\s*This mod author is a.*$/i, '') // Remove Pro member text
                  .replace(/\s*CurseForge Pro member.*$/i, '') // Remove Pro member text
                  .replace(/\s*Pro member.*$/i, '') // Remove Pro member text
                  .trim();

                console.log(`📝 Extracted author from mod card: "${author}" (raw: "${rawAuthor}")`);
              }

              // Also try to find "By" text in the card
              if (!author) {
                const cardText = $el.text();
                const byMatch = cardText.match(/By\s+([A-Za-z0-9_-]+)/i);
                if (byMatch && byMatch[1]) {
                  author = byMatch[1].trim();
                  console.log(`📝 Extracted author from card text: "${author}"`);
                }
              }
            }

            // Clean up the title (remove "Go to" and "Project Page") regardless of author extraction
            title = title
              .replace(/^Go to /i, '')
              .replace(/ Project Page$/i, '')
              .trim();

            // AGGRESSIVE DESCRIPTION EXTRACTION
            const description = $el.find('.mod-card__description, .mod-description, .description, .summary, .project-summary, .card-description, .item-description, p').text().trim();

            // AGGRESSIVE THUMBNAIL EXTRACTION
            const thumbnail = $el.find('img').attr('src') ||
              $el.find('img').attr('data-src') ||
              $el.find('img').attr('data-lazy-src') ||
              $el.find('img').attr('data-original') ||
              $el.find('img').attr('data-srcset')?.split(' ')[0];

            // AGGRESSIVE URL EXTRACTION - TARGETING CURSEFORGE STRUCTURE
            const modUrl = $el.find('a[href*="/mods/"]').attr('href') ||
              $el.find('a[href*="/project/"]').attr('href') ||
              $el.find('a[href*="/sims4/"]').attr('href') ||
              $el.find('a[href*="/curseforge/"]').attr('href') ||
              $el.find('a').attr('href');

            // EXTRACT UNIQUE MOD ID FROM URL
            let modId = null;
            if (modUrl) {
              // Extract ID from URLs like /sims4/mods/xml-injector or /project/xml-injector
              const urlMatch = modUrl.match(/\/(?:mods|project)\/([^\/\?]+)/);
              if (urlMatch) {
                modId = urlMatch[1];
              }
            }

            // AGGRESSIVE CATEGORY EXTRACTION
            const category = $el.find('.mod-card__category, .category, .tag, .project-category, .card-category, .item-category, .badge').text().trim();

            // DEBUG: Log what we found
            if (title && title.length > 3) {
              console.log(`🎯 Found potential mod: "${title}" (${title.length} chars)`);
              console.log(`   Raw title: "${rawTitle}"`);
              console.log(`   Author: "${author || 'None'}"`);
              console.log(`   URL: ${modUrl}`);
              console.log(`   Mod ID: ${modId}`);
              console.log(`   Description: ${description?.substring(0, 50)}...`);
            }

            // VALIDATION - Require unique mod ID (but not author yet - we'll extract it)
            if (title && title.length > 3 && title.length < 300 &&
              !title.includes('Just a moment') &&
              !title.includes('Cloudflare') &&
              !title.includes('checking') &&
              modUrl && modId && (modUrl.includes('curseforge') || modUrl.includes('/mods/') || modUrl.includes('/project/'))) {

              const fullUrl = modUrl.startsWith('http') ? modUrl : `https://www.curseforge.com${modUrl}`;

              // DEBUG: Log the URL being processed
              console.log(`🔗 Processing URL: ${fullUrl}`);

              // ONLY EXTRACT AUTHOR FROM MOD PAGE IF NOT FOUND IN LISTING
              if (!author) {
                try {
                  console.log(`🔍 Author not found in listing, trying mod page: ${fullUrl}`);

                  // Add delay before each mod page request to avoid rate limiting
                  const delay = 3000 + Math.random() * 5000; // 3-8 second delay
                  console.log(`⏳ Waiting ${Math.round(delay)}ms before requesting mod page...`);
                  await this.delay(delay);

                  const modPageResponse = await instance.get(fullUrl, {
                    headers: {
                      'User-Agent': this.userAgents[this.currentInstanceIndex],
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.5',
                      'Accept-Encoding': 'gzip, deflate',
                      'Referer': 'https://www.curseforge.com/sims4/mods',
                      'Cache-Control': 'no-cache',
                      'Pragma': 'no-cache',
                    },
                    timeout: 30000,
                    validateStatus: (status) => status < 500, // Accept 4xx responses
                  });

                  console.log(`📄 Page response status: ${modPageResponse.status}`);
                  console.log(`📄 Page content length: ${modPageResponse.data.length}`);

                  // Handle different response statuses
                  if (modPageResponse.status === 403) {
                    console.log(`🚫 403 Forbidden - rotating session and retrying...`);
                    this.rotateSession();
                    await this.delay(5000 + Math.random() * 5000); // 5-10 second delay

                    // Retry once with new session
                    const retryResponse = await instance.get(fullUrl, {
                      headers: {
                        'User-Agent': this.userAgents[this.currentInstanceIndex],
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'Referer': 'https://www.curseforge.com/sims4/mods',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                      },
                      timeout: 30000,
                      validateStatus: (status) => status < 500,
                    });

                    console.log(`🔄 Retry response status: ${retryResponse.status}`);
                    const $modPage = cheerio.load(retryResponse.data);

                    // Extract author from retry response
                    const authorElement = $modPage('.author-name').first();
                    if (authorElement.length > 0) {
                      author = authorElement.text().trim();
                      console.log(`✅ Found author "${author}" on retry using .author-name selector`);
                    } else {
                      console.log(`⚠️  Still no .author-name element found on retry`);
                    }
                  } else {
                    const $modPage = cheerio.load(modPageResponse.data);

                    // Check if we got a challenge page
                    if (modPageResponse.data.includes('Cloudflare') || modPageResponse.data.includes('checking')) {
                      console.log(`⚠️  Got Cloudflare challenge page`);
                    } else {
                      console.log(`✅ Got actual page content`);
                    }

                    // SIMPLE: Just look for the author-name class
                    const authorElement = $modPage('.author-name').first();
                    console.log(`🔍 Found ${authorElement.length} .author-name elements`);

                    if (authorElement.length > 0) {
                      author = authorElement.text().trim();
                      console.log(`✅ Found author "${author}" using .author-name selector`);
                    } else {
                      console.log(`⚠️  No .author-name element found on page`);

                      // Debug: Let's see what author-related elements exist
                      const allAuthorElements = $modPage('[class*="author"]');
                      console.log(`🔍 Found ${allAuthorElements.length} elements with "author" in class name`);

                      // Also check for any text containing "By"
                      const pageText = $modPage.text();
                      if (pageText.includes('By ')) {
                        console.log(`🔍 Found "By " in page text`);
                        const byMatches = pageText.match(/By\s+([A-Za-z0-9_-]+)/g);
                        if (byMatches) {
                          console.log(`🔍 Found "By" matches: ${byMatches.join(', ')}`);
                        }
                      }
                    }
                  }

                } catch (pageError) {
                  const errorMessage = pageError instanceof Error ? pageError.message : String(pageError);
                  console.log(`⚠️  Could not extract author from mod page: ${errorMessage}`);
                }
              }

              // Only process mods that have an author
              if (author) {
                console.log(`✅ Processing mod with author: "${author}"`);

                const modData = {
                  title: title.substring(0, 200),
                  description: description || '',
                  shortDescription: description?.substring(0, 150) || '',
                  category: this.mapCurseForgeCategory(category) || this.categorizeMod(title, description),
                  tags: this.extractTags(title, description),
                  thumbnail: thumbnail || '',
                  images: thumbnail ? [thumbnail] : [],
                  downloadUrl: fullUrl,
                  sourceUrl: fullUrl,
                  source: 'CurseForge',
                  sourceId: modId, // Use the unique mod ID
                  author: author, // Add author information
                  isFree: true,
                  isNSFW: this.detectNSFW(title, description),
                  publishedAt: new Date(),
                };

                // IMMEDIATE INSERT/UPDATE WITH VERIFICATION
                try {
                  console.log(`💾 Immediately inserting: "${modData.title}"`);

                  // Handle creator profile creation/lookup
                  let creatorId = null;
                  if (modData.author) {
                    console.log(`👤 Processing author: "${modData.author}"`);

                    // Check if creator profile already exists
                    const normalizedAuthor = modData.author.toLowerCase().replace(/\s+/g, '');
                    let creatorProfile = await prisma.creatorProfile.findFirst({
                      where: {
                        OR: [
                          { handle: normalizedAuthor },
                          { handle: modData.author },
                          { user: { username: normalizedAuthor } },
                          { user: { username: modData.author } },
                          { user: { displayName: modData.author } }
                        ]
                      }
                    });

                    if (!creatorProfile) {
                      // Create a new creator profile for this author
                      console.log(`🆕 Creating new creator profile for: "${modData.author}"`);

                      // First, check if a user already exists for this author
                      const normalizedAuthor = modData.author.toLowerCase().replace(/\s+/g, '');
                      const email = `${normalizedAuthor}@external.creator`;

                      let creatorUser = await prisma.user.findFirst({
                        where: {
                          OR: [
                            { email: email },
                            { username: normalizedAuthor },
                            { username: modData.author },
                            { displayName: modData.author }
                          ]
                        },
                        include: {
                          creatorProfile: true
                        }
                      });

                      // If user exists and already has a creator profile, use it
                      if (creatorUser && creatorUser.creatorProfile) {
                        creatorProfile = creatorUser.creatorProfile;
                        console.log(`👤 Found existing creator profile via user: "${creatorProfile.handle}" (ID: ${creatorProfile.id})`);
                      }

                      if (!creatorUser) {
                        // Create a new user record for this creator
                        creatorUser = await prisma.user.create({
                          data: {
                            email: email,
                            username: normalizedAuthor,
                            displayName: modData.author,
                            isCreator: true,
                            emailVerified: new Date(), // Auto-verify external creators
                          },
                          include: {
                            creatorProfile: true
                          }
                        });
                        console.log(`✅ Created new user: "${creatorUser.username}" (ID: ${creatorUser.id})`);
                      } else {
                        console.log(`👤 Found existing user: "${creatorUser.username}" (ID: ${creatorUser.id})`);
                      }

                      // Type guard to ensure creatorUser is not null
                      if (!creatorUser) {
                        console.log(`⚠️  Failed to create or find user for author: ${modData.author}`);
                        continue;
                      }

                      // Only create creator profile if we don't already have one
                      if (!creatorProfile) {
                        try {
                          creatorProfile = await prisma.creatorProfile.create({
                            data: {
                              userId: creatorUser.id,
                              handle: normalizedAuthor,
                              bio: `Creator from ${modData.source}`,
                              isVerified: modData.source === 'CurseForge' || modData.source === 'Reddit',
                            }
                          });

                          console.log(`✅ Created creator profile: "${creatorProfile.handle}" (ID: ${creatorProfile.id})`);
                        } catch (profileError: any) {
                          if (profileError.code === 'P2002') {
                            // Handle already exists, find it
                            creatorProfile = await prisma.creatorProfile.findFirst({
                              where: {
                                OR: [
                                  { handle: normalizedAuthor },
                                  { userId: creatorUser.id }
                                ]
                              }
                            });
                            console.log(`👤 Found existing creator profile: "${creatorProfile?.handle}" (ID: ${creatorProfile?.id})`);
                          } else {
                            throw profileError;
                          }
                        }
                      }
                    } else {
                      console.log(`👤 Found existing creator profile: "${creatorProfile.handle}" (ID: ${creatorProfile.id})`);
                    }

                    // Type guard to ensure creatorProfile is not null
                    if (!creatorProfile) {
                      console.log(`⚠️  Failed to create or find creator profile for author: ${modData.author}`);
                      continue;
                    }

                    creatorId = creatorProfile.id;
                  }

                  // Check if mod already exists using unique mod ID
                  console.log(`🔍 Checking for existing mod with sourceId: ${modData.sourceId} and source: ${modData.source}`);
                  const existingMod = await prisma.mod.findFirst({
                    where: {
                      sourceId: modData.sourceId,
                      source: modData.source,
                    },
                  });

                  if (existingMod) {
                    console.log(`🔄 Found existing mod: "${existingMod.title}" (ID: ${existingMod.id})`);
                  } else {
                    console.log(`✨ No existing mod found - creating new one`);
                  }

                  let result;
                  if (existingMod) {
                    // Update existing mod
                    result = await prisma.mod.update({
                      where: { id: existingMod.id },
                      data: {
                        title: modData.title,
                        description: modData.description,
                        shortDescription: modData.shortDescription,
                        category: modData.category || 'Other',
                        tags: modData.tags,
                        thumbnail: modData.thumbnail,
                        images: modData.images,
                        downloadUrl: modData.downloadUrl,
                        author: modData.author,
                        creatorId: creatorId,
                        isFree: modData.isFree,
                        isNSFW: modData.isNSFW,
                        lastScraped: new Date(),
                        // Auto-verify trusted sources
                        isVerified: modData.source === 'CurseForge' || modData.source === 'Reddit' || existingMod.isVerified,
                      },
                    });
                    console.log(`✅ Updated existing mod: "${result.title}" (ID: ${result.id})`);
                  } else {
                    // Create new mod
                    result = await prisma.mod.create({
                      data: {
                        title: modData.title,
                        description: modData.description,
                        shortDescription: modData.shortDescription,
                        category: modData.category || 'Other',
                        tags: modData.tags,
                        thumbnail: modData.thumbnail,
                        images: modData.images,
                        downloadUrl: modData.downloadUrl,
                        sourceUrl: modData.sourceUrl,
                        source: modData.source,
                        sourceId: modData.sourceId,
                        author: modData.author,
                        creatorId: creatorId,
                        isFree: modData.isFree,
                        isNSFW: modData.isNSFW,
                        publishedAt: modData.publishedAt,
                        lastScraped: new Date(),
                        // Auto-verify trusted sources
                        isVerified: modData.source === 'CurseForge' || modData.source === 'Reddit',
                      },
                    });
                    console.log(`✅ Created new mod: "${result.title}" (ID: ${result.id})`);
                  }

                  // IMMEDIATE VERIFICATION - Check if mod is actually in database
                  const verification = await prisma.mod.findUnique({
                    where: { id: result.id },
                    select: { id: true, title: true, source: true, isVerified: true }
                  });

                  if (verification) {
                    console.log(`✅ VERIFIED: Mod "${verification.title}" is in database (Verified: ${verification.isVerified})`);
                  } else {
                    console.log(`❌ VERIFICATION FAILED: Mod not found in database after insert!`);
                  }

                  mods.push(modData);
                  foundMods++;

                } catch (insertError) {
                  console.error(`❌ Failed to insert mod "${modData.title}":`, insertError);
                }
              } else {
                console.log(`⚠️  Skipping mod "${title}" - no author found`);
              }
            }
          }

          if (foundMods > 0) {
            console.log(`🎯 Found ${foundMods} mods using selector: ${selector}`);
            break; // Stop trying other selectors if we found mods
          }
        }

        if (foundMods === 0) {
          console.log(`⚠️  No mods found on ${pageUrl} - trying next strategy...`);
        } else {
          console.log(`🔥 SUCCESS! Found ${foundMods} mods on ${pageUrl}`);
        }

        // AGGRESSIVE DELAY STRATEGY
        const delay = 2000 + Math.random() * 6000; // 2-8 seconds
        console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before next attempt...`);
        await this.delay(delay);

      } catch (pageError: any) {
        console.error(`❌ AGGRESSIVE ATTEMPT FAILED for ${pageUrl}:`, pageError.message);

        // AGGRESSIVE ERROR HANDLING
        if (pageError.response?.status === 403) {
          console.log('🔄 403 detected - rotating session aggressively...');
          this.rotateSession();
          await this.delay(10000 + Math.random() * 10000); // 10-20 second delay
        } else if (pageError.response?.status === 429) {
          console.log('⏰ Rate limited - waiting longer...');
          await this.delay(15000 + Math.random() * 15000); // 15-30 second delay
        } else {
          await this.delay(3000 + Math.random() * 3000); // 3-6 second delay
        }
      }

      // If we found mods, we can be more aggressive
      if (mods.length > 0 && successfulPages >= 2) {
        console.log(`🔥 BREAKTHROUGH! Found ${mods.length} mods so far. Continuing aggressively...`);
      }
    }

    console.log(`🎯 AGGRESSIVE CURSEFORGE SCRAPING COMPLETED!`);
    console.log(`📊 Total attempts: ${totalAttempts}`);
    console.log(`✅ Successful pages: ${successfulPages}`);
    console.log(`🎉 Total mods found: ${mods.length}`);

    if (mods.length === 0) {
      console.log(`😤 CURSEFORGE WON THIS ROUND - but we'll be back!`);
    } else {
      console.log(`🔥 VICTORY! We cracked CurseForge's defenses!`);
    }

    return mods;
  }

  async scrapeTumblr(tag: string): Promise<ScrapedMod[]> {
    try {
      await this.delay();

      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(
        `https://www.tumblr.com/tagged/${encodeURIComponent(tag)}`,
        {
          params: {
            _: Date.now(), // Add timestamp to avoid caching
          }
        }
      );

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      // Enhanced Tumblr scraping with better selectors
      $('.post, [class*="post"], article, .post-content, .post-body').each((_, element) => {
        const $el = $(element);

        // Try multiple title selectors
        const title = $el.find('.post-title, .title, h1, h2, h3, .post-heading').text().trim() ||
          $el.find('a[href*="/post/"]').attr('title') ||
          $el.find('a[href*="/post/"]').text().trim();

        // Try multiple description selectors
        const description = $el.find('.post-body, .body, .content, .text, .post-text, .post-description').text().trim();

        // Try multiple image selectors
        const images = $el.find('img').map((_, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
          return src && src !== 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' ? src : null;
        }).get().filter(Boolean);

        // Try multiple URL selectors
        const postUrl = $el.find('a[href*="/post/"]').attr('href') ||
          $el.find('a').attr('href');

        if (title && postUrl && title.length > 5) {
          // Clean up the URL
          const fullUrl = postUrl.startsWith('http') ? postUrl : `https://www.tumblr.com${postUrl}`;

          mods.push({
            title: title.substring(0, 200), // Limit title length
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description),
            tags: this.extractTags(title, description),
            thumbnail: images[0],
            images,
            downloadUrl: fullUrl,
            sourceUrl: fullUrl,
            source: 'Tumblr',
            isFree: true,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping Tumblr:', error);
      return [];
    }
  }

  async scrapeSimsResource(): Promise<ScrapedMod[]> {
    try {
      await this.delay();

      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get('https://www.thesimsresource.com/downloads/browse/category/sims4/');

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      $('.download-item, .item, [class*="download"]').each((_, element) => {
        const $el = $(element);
        const title = $el.find('.title, .name, h3, h4').text().trim();
        const description = $el.find('.description, .desc, .summary').text().trim();
        const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src');
        const downloadUrl = $el.find('a').attr('href');
        const isFree = !$el.find('.premium, .paid, [class*="premium"]').length;

        if (title && downloadUrl) {
          mods.push({
            title,
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description) || 'Other',
            tags: this.extractTags(title, description),
            thumbnail,
            images: thumbnail ? [thumbnail] : [],
            downloadUrl,
            sourceUrl: downloadUrl,
            source: 'Sims Resource',
            isFree,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping Sims Resource:', error);
      return [];
    }
  }

  async scrapeModTheSims(): Promise<ScrapedMod[]> {
    try {
      await this.delay();

      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get('https://modthesims.info/browse.php?f=38&gs=4');

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      $('.download-item, .item, tr').each((_, element) => {
        const $el = $(element);
        const title = $el.find('.title, .name, a').text().trim();
        const description = $el.find('.description, .desc').text().trim();
        const thumbnail = $el.find('img').attr('src');
        const downloadUrl = $el.find('a').attr('href');

        if (title && downloadUrl && !title.includes('Download')) {
          mods.push({
            title,
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description) || 'Other',
            tags: this.extractTags(title, description),
            thumbnail,
            images: thumbnail ? [thumbnail] : [],
            downloadUrl,
            sourceUrl: downloadUrl,
            source: 'ModTheSims',
            isFree: true,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping ModTheSims:', error);
      return [];
    }
  }

  async scrapeReddit(subreddit: string): Promise<ScrapedMod[]> {
    try {
      await this.delay();

      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get(`https://www.reddit.com/r/${subreddit}/search.json`, {
        params: {
          q: 'sims4 mod',
          sort: 'new',
          t: 'month',
          limit: 25
        },
        headers: {
          'Accept': 'application/json',
        }
      });

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const mods: ScrapedMod[] = [];
      const posts = response.data.data.children || [];

      for (const post of posts) {
        const postData = post.data;
        if (postData.title && postData.selftext) {
          const title = postData.title;
          const description = postData.selftext;
          const postUrl = `https://www.reddit.com${postData.permalink}`;
          const thumbnail = postData.thumbnail && postData.thumbnail !== 'self' ? postData.thumbnail : null;

          mods.push({
            title,
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description),
            tags: this.extractTags(title, description),
            thumbnail,
            images: thumbnail ? [thumbnail] : [],
            downloadUrl: postUrl,
            sourceUrl: postUrl,
            source: 'Reddit',
            isFree: true,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(postData.created_utc * 1000),
          });
        }
      }

      return mods;
    } catch (error) {
      console.error('Error scraping Reddit:', error);
      return [];
    }
  }

  async scrapePinterest(): Promise<ScrapedMod[]> {
    try {
      await this.delay();

      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get('https://www.pinterest.com/search/pins/?q=sims4%20mods');

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      // Pinterest pin scraping
      $('[data-test-id="pin"], .pin, [class*="pin"]').each((_, element) => {
        const $el = $(element);
        const title = $el.find('img').attr('alt') || $el.find('.pinTitle').text().trim();
        const description = $el.find('.pinDescription').text().trim();
        const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src');
        const pinUrl = $el.find('a').attr('href');

        if (title && pinUrl && title.length > 5) {
          const fullUrl = pinUrl.startsWith('http') ? pinUrl : `https://www.pinterest.com${pinUrl}`;

          mods.push({
            title: title.substring(0, 200),
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description),
            tags: this.extractTags(title, description),
            thumbnail,
            images: thumbnail ? [thumbnail] : [],
            downloadUrl: fullUrl,
            sourceUrl: fullUrl,
            source: 'Pinterest',
            isFree: true,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping Pinterest:', error);
      return [];
    }
  }

  async scrapeInstagram(): Promise<ScrapedMod[]> {
    try {
      await this.delay();

      const instance = this.getCurrentAxiosInstance();
      const response = await instance.get('https://www.instagram.com/explore/tags/sims4mods/');

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const $ = cheerio.load(response.data);
      const mods: ScrapedMod[] = [];

      // Instagram post scraping
      $('article, [class*="post"], [class*="photo"]').each((_, element) => {
        const $el = $(element);
        const title = $el.find('img').attr('alt') || $el.find('.caption').text().trim();
        const description = $el.find('.caption, .post-caption').text().trim();
        const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src');
        const postUrl = $el.find('a').attr('href');

        if (title && postUrl && title.length > 5) {
          const fullUrl = postUrl.startsWith('http') ? postUrl : `https://www.instagram.com${postUrl}`;

          mods.push({
            title: title.substring(0, 200),
            description,
            shortDescription: description?.substring(0, 150),
            category: this.categorizeMod(title, description),
            tags: this.extractTags(title, description),
            thumbnail,
            images: thumbnail ? [thumbnail] : [],
            downloadUrl: fullUrl,
            sourceUrl: fullUrl,
            source: 'Instagram',
            isFree: true,
            isNSFW: this.detectNSFW(title, description),
            publishedAt: new Date(),
          });
        }
      });

      return mods;
    } catch (error) {
      console.error('Error scraping Instagram:', error);
      return [];
    }
  }

  // ... existing helper methods remain the same
  private categorizeMod(title: string, description?: string): string {
    const text = `${title} ${description || ''}`.toLowerCase();

    // Check in order of specificity (most specific first)

    // Hair (very common category)
    if (text.match(/\bhair(style)?s?\b/) || text.includes('hairstyle')) {
      return 'Hair';
    }

    // Poses & Animations
    if (text.match(/\bpose[sd]?\b/) || text.includes('animation') || text.includes('posing')) {
      return 'Poses';
    }

    // CAS - Makeup
    if (text.includes('makeup') || text.includes('blush') || text.includes('lipstick') ||
        text.includes('eyeshadow') || text.includes('eyeliner') || text.includes('cosmetic')) {
      return 'CAS - Makeup';
    }

    // CAS - Accessories
    if (text.includes('accessory') || text.includes('accessories') || text.includes('jewelry') ||
        text.includes('necklace') || text.includes('earring') || text.includes('bracelet') ||
        text.includes('glasses') || text.includes('hat ') || text.includes(' hats')) {
      return 'CAS - Accessories';
    }

    // CAS - Clothing (check before general CAS)
    if (text.includes('clothing') || text.includes('dress') || text.includes('outfit') ||
        text.includes('shirt') || text.includes('pants') || text.includes('shoes') ||
        text.includes('sweater') || text.includes('jacket') || text.includes('skirt') ||
        text.includes('top ') || text.includes(' tops') || text.includes('jeans') ||
        text.includes('bikini') || text.includes('swimwear')) {
      return 'CAS - Clothing';
    }

    // Build/Buy - Clutter
    if (text.includes('clutter') || text.includes('decor object') || text.includes('decoration')) {
      return 'Build/Buy - Clutter';
    }

    // Build/Buy (general)
    if (text.includes('build') || text.includes('buy') || text.includes('furniture') ||
        text.includes('chair') || text.includes('table') || text.includes('sofa') ||
        text.includes('bed ') || text.includes(' beds') || text.includes('kitchen') ||
        text.includes('bathroom') || text.includes('shelf') || text.includes('shelves') ||
        text.includes('cabinet') || text.includes('couch') || text.includes('decor') ||
        text.includes('shed') || text.includes('coop') || text.includes('house ') ||
        text.includes('lot ') || text.includes(' lots')) {
      return 'Build/Buy';
    }

    // Gameplay
    if (text.includes('gameplay') || text.includes('career') || text.includes('skill') ||
        text.includes('aspiration') || text.includes('reward') || text.includes('interaction')) {
      return 'Gameplay';
    }

    // Scripts/Mods
    if (text.includes('script') || text.includes('trait') || text.includes('mod ') ||
        text.match(/\bmods?\b/) && !text.includes('cc')) {
      return 'Scripts';
    }

    // CAS (general Create-a-Sim - last resort for CAS items)
    if (text.includes('cas') || text.includes('create-a-sim') || text.includes('create a sim')) {
      return 'CAS';
    }

    // Default
    return 'Other';
  }

  private extractTags(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();
    const commonTags = [
      'sims4', 'sims3', 'sims2', 'build', 'buy', 'cas', 'gameplay',
      'furniture', 'clothing', 'hair', 'makeup', 'career', 'skill',
      'trait', 'aspiration', 'mod', 'cc', 'custom content'
    ];

    return commonTags.filter(tag => text.includes(tag));
  }

  private detectNSFW(title: string, description?: string): boolean {
    const text = `${title} ${description || ''}`.toLowerCase();
    const nsfwKeywords = ['nsfw', 'adult', 'mature', 'explicit', 'sexual'];
    return nsfwKeywords.some(keyword => text.includes(keyword));
  }

  private mapCurseForgeCategory(categoryName?: string): string {
    if (!categoryName) return 'Other';

    const categoryMap: { [key: string]: string } = {
      'Build and Buy': 'Build/Buy',
      'CAS': 'CAS',
      'Gameplay': 'Gameplay',
      'Scripts': 'Scripts',
      'Other': 'Other',
    };

    return categoryMap[categoryName] || 'Other';
  }

  async importMods(mods: ScrapedMod[]): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const mod of mods) {
      try {
        // Check if mod already exists
        const existingMod = await prisma.mod.findFirst({
          where: {
            OR: [
              { sourceUrl: mod.sourceUrl },
              { sourceId: mod.sourceId, source: mod.source },
            ],
          },
        });

        if (existingMod) {
          // Update existing mod
          await prisma.mod.update({
            where: { id: existingMod.id },
            data: {
              title: mod.title,
              description: mod.description,
              shortDescription: mod.shortDescription,
              version: mod.version,
              gameVersion: mod.gameVersion,
              category: mod.category || 'Other',
              tags: mod.tags,
              thumbnail: mod.thumbnail,
              images: mod.images,
              downloadUrl: mod.downloadUrl,
              isFree: mod.isFree,
              price: mod.price,
              isNSFW: mod.isNSFW,
              lastScraped: new Date(),
              // Auto-verify trusted sources
              isVerified: mod.source === 'CurseForge' || mod.source === 'Reddit' || existingMod.isVerified,
            },
          });
          imported++;
        } else {
          // Create new mod
          await prisma.mod.create({
            data: {
              title: mod.title,
              description: mod.description,
              shortDescription: mod.shortDescription,
              version: mod.version,
              gameVersion: mod.gameVersion,
              category: mod.category || 'Other',
              tags: mod.tags,
              thumbnail: mod.thumbnail,
              images: mod.images,
              downloadUrl: mod.downloadUrl,
              sourceUrl: mod.sourceUrl,
              source: mod.source,
              sourceId: mod.sourceId,
              isFree: mod.isFree,
              price: mod.price,
              isNSFW: mod.isNSFW,
              publishedAt: mod.publishedAt,
              lastScraped: new Date(),
              // Auto-verify trusted sources
              isVerified: mod.source === 'CurseForge' || mod.source === 'Reddit',
            },
          });
          imported++;
        }

        // Random delay between imports
        await this.delay();
      } catch (error) {
        console.error('Error importing mod:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }

  async runAggregation(): Promise<void> {
    try {
      console.log('Starting privacy-focused content aggregation...');

      // Get active content sources
      const sources = await prisma.contentSource.findMany({
        where: { isActive: true },
      });

      for (const source of sources) {
        try {
          console.log(`Aggregating from ${source.name}...`);

          let mods: ScrapedMod[] = [];

          switch (source.name.toLowerCase()) {
            case 'patreon':
              // Scrape multiple Patreon creators with delays
              const patreonCreators = [
                'https://www.patreon.com/sims4cc',
                'https://www.patreon.com/sims4mods',
                'https://www.patreon.com/sims4customcontent',
                'https://www.patreon.com/sims4builds',
                'https://www.patreon.com/sims4furniture',
                'https://www.patreon.com/sims4clothing',
                'https://www.patreon.com/sims4hair',
                'https://www.patreon.com/sims4gameplay',
              ];

              for (const creatorUrl of patreonCreators) {
                const creatorMods = await this.scrapePatreon(creatorUrl);
                mods.push(...creatorMods);
                await this.delay(); // Additional delay between creators
              }
              break;

            case 'curseforge':
              mods = await this.scrapeCurseForge();
              break;

            case 'tumblr':
              const tumblrTags = ['sims4cc', 'sims4mods', 'sims4customcontent', 'sims4builds', 'sims4furniture', 'sims4clothing', 'sims4hair', 'sims4gameplay'];
              for (const tag of tumblrTags) {
                const tagMods = await this.scrapeTumblr(tag);
                mods.push(...tagMods);
                await this.delay();
              }
              break;

            case 'the sims resource':
            case 'simsresource':
              mods = await this.scrapeSimsResource();
              break;

            case 'modthesims':
              mods = await this.scrapeModTheSims();
              break;

            case 'reddit':
              const subreddits = ['Sims4', 'Sims4Mods', 'Sims4CustomContent', 'Sims4Builds', 'Sims4Furniture', 'Sims4Clothing'];
              for (const subreddit of subreddits) {
                const subredditMods = await this.scrapeReddit(subreddit);
                mods.push(...subredditMods);
                await this.delay();
              }
              break;

            case 'pinterest':
              mods = await this.scrapePinterest();
              break;

            case 'instagram':
              mods = await this.scrapeInstagram();
              break;

            case 'discord':
              // Discord requires bot setup - skip for now
              console.log('Discord scraping requires bot token setup - skipping');
              continue;

            default:
              console.log(`Unknown source: ${source.name}`);
              continue;
          }

          // Import mods
          const { imported, skipped } = await this.importMods(mods);
          console.log(`${source.name}: ${imported} imported, ${skipped} skipped`);

          // Update source last scraped time
          await prisma.contentSource.update({
            where: { id: source.id },
            data: { lastScraped: new Date() },
          });

          // Longer delay between sources
          await this.delay();
          await this.delay();

        } catch (error) {
          console.error(`Error aggregating from ${source.name}:`, error);
        }
      }

      console.log('Privacy-focused content aggregation completed');
    } catch (error) {
      console.error('Error running content aggregation:', error);
    }
  }
}

export const privacyAggregator = new PrivacyAggregator();
