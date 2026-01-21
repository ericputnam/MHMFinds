#!/usr/bin/env npx tsx
/**
 * Cleanup script for fixing mod author data by scraping actual download URLs.
 *
 * The problem: The MHM scraper extracted garbage author names from URL path segments
 * like "Title", "ShRef", "Id", "Www", numeric Patreon post IDs, etc.
 *
 * This script:
 * 1. Identifies mods with bad/missing author data
 * 2. Visits the actual download URL (Patreon, TSR, CurseForge, etc.)
 * 3. Extracts the real author from those pages
 * 4. Updates the database
 *
 * Usage:
 *   npx tsx scripts/cleanup-author-data.ts              # Dry run - report only
 *   npx tsx scripts/cleanup-author-data.ts --fix        # Apply fixes
 *   npx tsx scripts/cleanup-author-data.ts --fix --limit=100  # Fix first 100
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// Bad author patterns that indicate extraction failed
const BAD_AUTHOR_PATTERNS = [
  'Title',
  'ShRef',
  'Id',
  'Www',
  'Simsfinds',
  'CurseForge Creator',
  'ModTheSims Community',
  'TSR Creator',
  'Wixsite',
  'Blogspot',
  'Amazon',
  'Amzn',
  'Tistory',
  'Google',
  'Early Access',
  'posts', // Patreon "posts" path segment
  'Creator Terms of Use', // TSR terms page
  'Terms of Use',
  'Privacy Policy',
  'Contact',
  'About',
  'Home',
  'Downloads',
  'Categories',
  'Search',
  'Members',
];

// Numeric-only patterns (Patreon post IDs)
const NUMERIC_PATTERN = /^\d+$/;
const PATREON_POST_ID_PATTERN = /^[A-Za-z\s]+ \d+$/; // e.g., "Maia Hair 143566306"

interface AuthorExtractionResult {
  author: string | null;
  source: string;
  method: string;
}

class AuthorCleanup {
  private delay = 2000; // 2 seconds between requests
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  ];

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get headers that mimic a real browser for sites with anti-bot protection
   */
  private getBrowserHeaders(referer?: string): Record<string, string> {
    const ua = this.getRandomUserAgent();
    const isFirefox = ua.includes('Firefox');
    const isSafari = ua.includes('Safari') && !ua.includes('Chrome');

    const headers: Record<string, string> = {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    };

    // Add browser-specific headers
    if (!isFirefox && !isSafari) {
      headers['sec-ch-ua'] = '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"';
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = ua.includes('Windows') ? '"Windows"' : ua.includes('Mac') ? '"macOS"' : '"Linux"';
    }

    if (referer) {
      headers['Referer'] = referer;
    }

    return headers;
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Check if an author value is "bad" (garbage extraction)
   */
  isBadAuthor(author: string | null): boolean {
    if (!author) return true;

    const trimmed = author.trim();

    // Check against known bad patterns
    if (BAD_AUTHOR_PATTERNS.some(bad =>
      trimmed === bad ||
      trimmed.toLowerCase() === bad.toLowerCase()
    )) {
      return true;
    }

    // Check for pure numeric (Patreon post IDs)
    if (NUMERIC_PATTERN.test(trimmed)) {
      return true;
    }

    // Check for "Name 123456789" pattern (Patreon title + post ID)
    if (PATREON_POST_ID_PATTERN.test(trimmed)) {
      return true;
    }

    // Too short to be a real author
    if (trimmed.length < 2) {
      return true;
    }

    return false;
  }

  /**
   * Extract author from Patreon page
   * Patreon blocks automated requests, so we use Wayback Machine as fallback
   */
  async extractFromPatreon(url: string): Promise<AuthorExtractionResult> {
    // Helper function to extract author from Patreon HTML
    const extractFromHtml = ($: cheerio.CheerioAPI): string | null => {
      // Method 1: Look for creator name in meta tags
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');
      if (ogSiteName && ogSiteName !== 'Patreon' && !this.isBadAuthor(ogSiteName)) {
        return ogSiteName;
      }

      // Method 2: Look for "creating" pattern in og:title
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        // Pattern: "CreatorName is creating..."
        const creatingMatch = ogTitle.match(/^(.+?)\s+is creating/i);
        if (creatingMatch && !this.isBadAuthor(creatingMatch[1])) {
          return creatingMatch[1].trim();
        }

        // Pattern: "Post Title | CreatorName on Patreon"
        const pipeMatch = ogTitle.match(/\|\s*(.+?)\s+on Patreon/i);
        if (pipeMatch && !this.isBadAuthor(pipeMatch[1])) {
          return pipeMatch[1].trim();
        }

        // Pattern: "Post Title by CreatorName"
        const byMatch = ogTitle.match(/\sby\s+(.+?)(?:\s*\||$)/i);
        if (byMatch && !this.isBadAuthor(byMatch[1])) {
          return byMatch[1].trim();
        }
      }

      // Method 3: Look for creator link in page
      const creatorLink = $('a[href*="/c/"]').first();
      if (creatorLink.length) {
        const href = creatorLink.attr('href');
        const match = href?.match(/\/c\/([^\/\?]+)/);
        if (match && !this.isBadAuthor(match[1])) {
          const author = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
          return this.titleCase(author);
        }
      }

      // Method 4: Look for data attributes
      const creatorName = $('[data-tag="creator-name"]').text().trim();
      if (creatorName && !this.isBadAuthor(creatorName)) {
        return creatorName;
      }

      return null;
    };

    // Try direct access first
    try {
      const response = await axios.get(url, {
        headers: this.getBrowserHeaders('https://www.patreon.com/'),
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const author = extractFromHtml($);
        if (author) {
          return { author, source: 'Patreon', method: 'direct' };
        }
      }
    } catch (error) {
      // Direct access failed, try Wayback Machine
    }

    // Fallback: Use Wayback Machine
    console.log(`      📚 Trying Wayback Machine for Patreon...`);
    try {
      const checkUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
      const checkResponse = await axios.get(checkUrl, {
        timeout: 10000,
        headers: { 'User-Agent': this.getRandomUserAgent() },
      });

      const snapshot = checkResponse.data?.archived_snapshots?.closest;
      if (!snapshot?.available || !snapshot?.url) {
        return { author: null, source: 'Patreon', method: 'no wayback snapshot' };
      }

      const archivedResponse = await axios.get(snapshot.url, {
        timeout: 20000,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const $ = cheerio.load(archivedResponse.data);
      const author = extractFromHtml($);
      if (author) {
        return { author, source: 'Patreon', method: 'wayback' };
      }

      return { author: null, source: 'Patreon', method: 'wayback failed to extract' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`      ⚠️  Patreon fetch failed: ${errMsg}`);
      return { author: null, source: 'Patreon', method: `error: ${errMsg}` };
    }
  }

  /**
   * Extract author from The Sims Resource page
   */
  async extractFromTSR(url: string): Promise<AuthorExtractionResult> {
    // FIRST: Try to extract author from URL patterns (most reliable, no network needed)
    // TSR URLs have multiple patterns:
    // - /artists/{name}/downloads/...
    // - /staff/{name}/downloads/...
    // - /members/{name}/downloads/...
    const urlPatterns = [
      /\/artists\/([^\/]+)/i,
      /\/staff\/([^\/]+)/i,
      /\/members\/([^\/]+)/i,
    ];

    for (const pattern of urlPatterns) {
      const urlMatch = url.match(pattern);
      if (urlMatch && urlMatch[1] && !this.isBadAuthor(urlMatch[1])) {
        // Clean up the name (remove hyphens/underscores, title case)
        const author = urlMatch[1].replace(/-/g, ' ').replace(/_/g, ' ');
        return { author: this.titleCase(author), source: 'TSR', method: `URL ${pattern.source.replace(/[\\\/\(\)\[\]\+\?]/g, '')}` };
      }
    }

    // If URL doesn't have author, try fetching the page
    try {
      const response = await axios.get(url, {
        headers: this.getBrowserHeaders('https://www.thesimsresource.com/'),
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      // Method 2: TSR-specific meta tag (MOST RELIABLE)
      // <meta property="thesimsresource:by" content="SIMcredible!" />
      const tsrByMeta = $('meta[property="thesimsresource:by"]').attr('content');
      if (tsrByMeta && !this.isBadAuthor(tsrByMeta)) {
        return { author: tsrByMeta, source: 'TSR', method: 'thesimsresource:by meta' };
      }

      // Method 3: og:title pattern "Author's Title"
      // <meta property="og:title" content="SIMcredible!'s Magical Place"/>
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        // Pattern: "Author's Title" (possessive)
        const possessiveMatch = ogTitle.match(/^(.+?)'s\s+/);
        if (possessiveMatch && !this.isBadAuthor(possessiveMatch[1])) {
          return { author: possessiveMatch[1].trim(), source: 'TSR', method: 'og:title possessive' };
        }
        // Pattern: "Title by Author"
        const byMatch = ogTitle.match(/\sby\s+(.+?)(?:\s*-|\s*\||$)/i);
        if (byMatch && !this.isBadAuthor(byMatch[1])) {
          return { author: byMatch[1].trim(), source: 'TSR', method: 'og:title by pattern' };
        }
      }

      // Method 4: meta description often has "Category - Author - Title"
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc) {
        // Pattern: "The Sims Resource - Sims 4 - Category - Author - Title"
        const parts = metaDesc.split(' - ');
        if (parts.length >= 4) {
          // Author is typically the 4th part (index 3)
          const potentialAuthor = parts[3]?.trim();
          if (potentialAuthor && !this.isBadAuthor(potentialAuthor) && potentialAuthor.length < 30) {
            return { author: potentialAuthor, source: 'TSR', method: 'meta description' };
          }
        }
      }

      // Method 5: Artist profile on page
      const artistName = $('.artist-profile-name').text().trim();
      if (artistName && !this.isBadAuthor(artistName)) {
        return { author: artistName, source: 'TSR', method: 'artist-profile-name' };
      }

      // Method 6: Look for "Created By" section link (be more specific)
      // Target links near "Created By" text, not random member links
      const createdBySection = $('*:contains("Created By")').last().parent();
      const creatorLink = createdBySection.find('a[href*="/members/"], a[href*="/artists/"]').first();
      if (creatorLink.length) {
        const text = creatorLink.text().trim();
        if (text && !this.isBadAuthor(text) && text.length < 50) {
          return { author: text, source: 'TSR', method: 'created by section link' };
        }
      }

      // Method 7: Fallback - Look for artist link in header area
      const artistLink = $('a[href*="/artists/"]').first();
      if (artistLink.length) {
        const href = artistLink.attr('href');
        const match = href?.match(/\/artists\/([^\/]+)/);
        if (match && !this.isBadAuthor(match[1])) {
          // Don't include "Creator Terms of Use" links
          const linkText = artistLink.text().trim().toLowerCase();
          if (!linkText.includes('terms') && !linkText.includes('use')) {
            return { author: match[1], source: 'TSR', method: 'artist link href' };
          }
        }
      }

      return { author: null, source: 'TSR', method: 'failed' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`      ⚠️  TSR fetch failed: ${errMsg}`);
      return { author: null, source: 'TSR', method: `error: ${errMsg}` };
    }
  }

  /**
   * Extract author from CurseForge page
   * CurseForge has Cloudflare protection, so we use Wayback Machine as fallback
   */
  async extractFromCurseForge(url: string): Promise<AuthorExtractionResult> {
    // Helper function to extract author from CurseForge HTML
    const extractFromHtml = ($: cheerio.CheerioAPI): string | null => {
      // Method 1: Author name class
      const authorName = $('.author-name').first().text().trim();
      if (authorName) {
        const cleanAuthor = authorName
          .replace(/^By\s+/i, '')
          .replace(/\s*This mod author is a.*$/i, '')
          .replace(/\s*CurseForge Pro member.*$/i, '')
          .replace(/\s*Pro member.*$/i, '')
          .trim();
        if (!this.isBadAuthor(cleanAuthor)) {
          return cleanAuthor;
        }
      }

      // Method 2: meta author tag
      const metaAuthor = $('meta[name="author"]').attr('content');
      if (metaAuthor && !this.isBadAuthor(metaAuthor)) {
        return metaAuthor;
      }

      // Method 3: og:title often has "by Author" pattern
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        const byMatch = ogTitle.match(/\sby\s+([A-Za-z0-9_-]+)/i);
        if (byMatch && !this.isBadAuthor(byMatch[1])) {
          return byMatch[1];
        }
      }

      // Method 4: Look for member link
      const memberLink = $('a[href*="/members/"]').first();
      if (memberLink.length) {
        const text = memberLink.text().trim();
        if (text && !this.isBadAuthor(text) && text.length < 50) {
          return text;
        }
      }

      return null;
    };

    // First try direct access
    try {
      const response = await axios.get(url, {
        headers: this.getBrowserHeaders('https://www.curseforge.com/'),
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const author = extractFromHtml($);
        if (author) {
          return { author, source: 'CurseForge', method: 'direct' };
        }
      }
    } catch (error) {
      // Direct access failed, try Wayback Machine
    }

    // Fallback: Use Wayback Machine
    console.log(`      📚 Trying Wayback Machine for CurseForge...`);
    try {
      const checkUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
      const checkResponse = await axios.get(checkUrl, {
        timeout: 10000,
        headers: { 'User-Agent': this.getRandomUserAgent() },
      });

      const snapshot = checkResponse.data?.archived_snapshots?.closest;
      if (!snapshot?.available || !snapshot?.url) {
        return { author: null, source: 'CurseForge', method: 'no wayback snapshot' };
      }

      const archivedResponse = await axios.get(snapshot.url, {
        timeout: 20000,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const $ = cheerio.load(archivedResponse.data);
      const author = extractFromHtml($);
      if (author) {
        return { author, source: 'CurseForge', method: 'wayback' };
      }

      return { author: null, source: 'CurseForge', method: 'wayback failed to extract' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`      ⚠️  CurseForge fetch failed: ${errMsg}`);
      return { author: null, source: 'CurseForge', method: `error: ${errMsg}` };
    }
  }

  /**
   * Extract author from Tumblr URL (subdomain)
   */
  extractFromTumblr(url: string): AuthorExtractionResult {
    try {
      const hostname = new URL(url).hostname;

      // Pattern: username.tumblr.com
      const match = hostname.match(/^([^\.]+)\.tumblr\.com/);
      if (match && !this.isBadAuthor(match[1])) {
        const author = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
        return { author: this.titleCase(author), source: 'Tumblr', method: 'subdomain' };
      }

      // For www.tumblr.com URLs, try to extract from path
      if (hostname === 'www.tumblr.com') {
        const pathname = new URL(url).pathname;
        const pathMatch = pathname.match(/^\/([^\/]+)/);
        if (pathMatch && !this.isBadAuthor(pathMatch[1])) {
          const author = pathMatch[1].replace(/-/g, ' ').replace(/_/g, ' ');
          return { author: this.titleCase(author), source: 'Tumblr', method: 'path' };
        }
      }

      return { author: null, source: 'Tumblr', method: 'failed' };
    } catch (error) {
      return { author: null, source: 'Tumblr', method: 'invalid URL' };
    }
  }

  /**
   * Extract author from ModTheSims page
   * ModTheSims blocks automated requests, so we use Wayback Machine as fallback
   */
  async extractFromModTheSims(url: string): Promise<AuthorExtractionResult> {
    // First, try direct access
    try {
      const response = await axios.get(url, {
        headers: this.getBrowserHeaders('https://modthesims.info/'),
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200) {
        const $ = cheerio.load(response.data);

        // Check og:author meta tag (most reliable for MTS)
        const ogAuthor = $('meta[property="og:author"]').attr('content');
        if (ogAuthor && !this.isBadAuthor(ogAuthor)) {
          return { author: ogAuthor, source: 'ModTheSims', method: 'og:author' };
        }

        // Check regular meta author
        const metaAuthor = $('meta[name="author"]').attr('content');
        if (metaAuthor && !this.isBadAuthor(metaAuthor)) {
          return { author: metaAuthor, source: 'ModTheSims', method: 'meta author' };
        }

        // Look for member links
        const memberLink = $('a[href*="/member.php"], a[href*="/m/"]').first();
        if (memberLink.length) {
          const text = memberLink.text().trim();
          if (text && !this.isBadAuthor(text) && text.length < 50) {
            return { author: text, source: 'ModTheSims', method: 'member link' };
          }
        }
      }
    } catch (error) {
      // Direct access failed, try Wayback Machine
    }

    // Fallback: Use Wayback Machine (Internet Archive)
    console.log(`      📚 Trying Wayback Machine for ModTheSims...`);
    try {
      // First check if a snapshot exists
      const checkUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
      const checkResponse = await axios.get(checkUrl, {
        timeout: 10000,
        headers: { 'User-Agent': this.getRandomUserAgent() },
      });

      const snapshot = checkResponse.data?.archived_snapshots?.closest;
      if (!snapshot?.available || !snapshot?.url) {
        return { author: null, source: 'ModTheSims', method: 'no wayback snapshot' };
      }

      // Fetch the archived page
      const archivedResponse = await axios.get(snapshot.url, {
        timeout: 20000,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const $ = cheerio.load(archivedResponse.data);

      // Check og:author meta tag (most reliable for MTS)
      const ogAuthor = $('meta[property="og:author"]').attr('content');
      if (ogAuthor && !this.isBadAuthor(ogAuthor)) {
        return { author: ogAuthor, source: 'ModTheSims', method: 'wayback og:author' };
      }

      // Check regular meta author
      const metaAuthor = $('meta[name="author"]').attr('content');
      if (metaAuthor && !this.isBadAuthor(metaAuthor)) {
        return { author: metaAuthor, source: 'ModTheSims', method: 'wayback meta author' };
      }

      // Look for member links (adjust for wayback URL rewriting)
      const memberLink = $('a[href*="member.php"], a[href*="/m/"]').first();
      if (memberLink.length) {
        const text = memberLink.text().trim();
        if (text && !this.isBadAuthor(text) && text.length < 50) {
          return { author: text, source: 'ModTheSims', method: 'wayback member link' };
        }
      }

      return { author: null, source: 'ModTheSims', method: 'wayback failed to extract' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`      ⚠️  ModTheSims/Wayback fetch failed: ${errMsg}`);
      return { author: null, source: 'ModTheSims', method: `error: ${errMsg}` };
    }
  }

  /**
   * Handle Amazon links - set author to "Amazon" directly
   * Amazon product links don't have a mod author
   */
  extractFromAmazon(url: string): AuthorExtractionResult {
    return { author: 'Amazon', source: 'Amazon', method: 'direct assignment' };
  }

  /**
   * Extract author from SimsFinds page
   * SimsFinds is an aggregator - the creator name is in the title "CreatorName - Item Name"
   */
  async extractFromSimsFinds(url: string): Promise<AuthorExtractionResult> {
    try {
      const response = await axios.get(url, {
        headers: this.getBrowserHeaders('https://www.simsfinds.com/'),
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      // Method 1: Twitter title has format "The Sims 4 Download: CreatorName - Item Name"
      const twitterTitle = $('meta[name="twitter:title"]').attr('content');
      if (twitterTitle) {
        // Pattern: "The Sims 4 Download: CreatorName - Item Name"
        const match = twitterTitle.match(/Download:\s*([^-]+)\s*-/i);
        if (match && match[1]) {
          const author = match[1].trim();
          if (!this.isBadAuthor(author) && author.length < 50) {
            return { author, source: 'SimsFinds', method: 'twitter:title' };
          }
        }
      }

      // Method 2: Page title/h1 has format "CreatorName - Item Name"
      const h1Title = $('h1').first().text().trim();
      if (h1Title) {
        // Pattern: "CreatorName - Item Name"
        const match = h1Title.match(/^([^-]+)\s*-/);
        if (match && match[1]) {
          const author = match[1].trim();
          if (!this.isBadAuthor(author) && author.length < 50) {
            return { author, source: 'SimsFinds', method: 'h1 title' };
          }
        }
      }

      // Method 3: Check JSON-LD data for creator info
      const jsonLd = $('script[data-jsoncreation="data"]').html();
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd);
          if (data.title) {
            // Title format: "CreatorName - Item Name"
            const match = data.title.match(/^([^-]+)\s*-/);
            if (match && match[1]) {
              const author = match[1].trim();
              if (!this.isBadAuthor(author) && author.length < 50) {
                return { author, source: 'SimsFinds', method: 'json-ld title' };
              }
            }
          }
        } catch {}
      }

      return { author: null, source: 'SimsFinds', method: 'failed' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`      ⚠️  SimsFinds fetch failed: ${errMsg}`);
      return { author: null, source: 'SimsFinds', method: `error: ${errMsg}` };
    }
  }

  /**
   * Generic author extraction for other sites
   */
  async extractGeneric(url: string): Promise<AuthorExtractionResult> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const hostname = new URL(url).hostname;

      // Method 1: meta author
      const metaAuthor = $('meta[name="author"]').attr('content');
      if (metaAuthor && !this.isBadAuthor(metaAuthor)) {
        return { author: metaAuthor, source: hostname, method: 'meta author' };
      }

      // Method 2: article:author
      const articleAuthor = $('meta[property="article:author"]').attr('content');
      if (articleAuthor && !this.isBadAuthor(articleAuthor)) {
        return { author: articleAuthor, source: hostname, method: 'article:author' };
      }

      // Method 3: .author class
      const authorClass = $('.author, .creator, .byline').first().text().trim();
      if (authorClass && !this.isBadAuthor(authorClass)) {
        const cleanAuthor = authorClass.replace(/^by\s+/i, '').trim();
        return { author: cleanAuthor, source: hostname, method: 'author class' };
      }

      // Method 4: rel="author" link
      const authorRel = $('[rel="author"]').first().text().trim();
      if (authorRel && !this.isBadAuthor(authorRel)) {
        return { author: authorRel, source: hostname, method: 'rel=author' };
      }

      return { author: null, source: hostname, method: 'failed' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      return { author: null, source: 'unknown', method: `error: ${errMsg}` };
    }
  }

  /**
   * Main extraction method - routes to appropriate extractor
   */
  async extractAuthorFromUrl(downloadUrl: string): Promise<AuthorExtractionResult> {
    try {
      const url = new URL(downloadUrl);
      const hostname = url.hostname.toLowerCase();

      if (hostname.includes('patreon.com')) {
        return await this.extractFromPatreon(downloadUrl);
      } else if (hostname.includes('thesimsresource.com')) {
        return await this.extractFromTSR(downloadUrl);
      } else if (hostname.includes('curseforge.com')) {
        return await this.extractFromCurseForge(downloadUrl);
      } else if (hostname.includes('tumblr.com')) {
        return this.extractFromTumblr(downloadUrl);
      } else if (hostname.includes('modthesims.info')) {
        return await this.extractFromModTheSims(downloadUrl);
      } else if (hostname.includes('simsfinds.com')) {
        return await this.extractFromSimsFinds(downloadUrl);
      } else if (hostname.includes('amazon.com') || hostname.includes('amzn.to') || hostname.includes('amzn.com')) {
        return this.extractFromAmazon(downloadUrl);
      } else {
        return await this.extractGeneric(downloadUrl);
      }
    } catch (error) {
      return { author: null, source: 'unknown', method: 'invalid URL' };
    }
  }

  private titleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Find mods with bad author data
   */
  async findModsWithBadAuthors(limit?: number): Promise<any[]> {
    // Build OR conditions for bad authors
    const badAuthorConditions = [
      { author: null },
      ...BAD_AUTHOR_PATTERNS.map(pattern => ({ author: pattern })),
    ];

    const mods = await prisma.mod.findMany({
      where: {
        downloadUrl: { not: null },
        source: 'MustHaveMods.com', // Focus on MHM scraped mods
        OR: badAuthorConditions,
      },
      select: {
        id: true,
        title: true,
        author: true,
        downloadUrl: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Also find mods with numeric-only authors (Patreon post IDs)
    const allMods = await prisma.mod.findMany({
      where: {
        downloadUrl: { not: null },
        source: 'MustHaveMods.com',
        author: { not: null },
      },
      select: {
        id: true,
        title: true,
        author: true,
        downloadUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter for numeric or pattern-matching authors
    const numericAuthorMods = allMods.filter(mod =>
      mod.author && (
        NUMERIC_PATTERN.test(mod.author) ||
        PATREON_POST_ID_PATTERN.test(mod.author)
      )
    );

    // Combine and deduplicate
    const combined = [...mods, ...numericAuthorMods];
    const seen = new Set<string>();
    const unique = combined.filter(mod => {
      if (seen.has(mod.id)) return false;
      seen.add(mod.id);
      return true;
    });

    return limit ? unique.slice(0, limit) : unique;
  }

  /**
   * Run the cleanup process
   */
  async run(options: { fix: boolean; limit?: number }): Promise<void> {
    console.log('🔍 Author Data Cleanup Script');
    console.log('='.repeat(60));
    console.log(`Mode: ${options.fix ? '🔧 FIX MODE' : '📊 DRY RUN (report only)'}`);
    if (options.limit) {
      console.log(`Limit: ${options.limit} mods`);
    }
    console.log('');

    // Step 1: Find mods with bad authors
    console.log('📊 Finding mods with bad author data...');
    const modsToFix = await this.findModsWithBadAuthors(options.limit);
    console.log(`   Found ${modsToFix.length} mods with bad/missing authors`);
    console.log('');

    if (modsToFix.length === 0) {
      console.log('✅ No mods need fixing!');
      return;
    }

    // Step 2: Group by author to show statistics
    const authorCounts: Record<string, number> = {};
    for (const mod of modsToFix) {
      const author = mod.author || '(null)';
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    }

    console.log('📊 Bad author distribution:');
    const sortedAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    for (const [author, count] of sortedAuthors) {
      console.log(`   ${count.toString().padStart(5)} × "${author}"`);
    }
    console.log('');

    // Step 3: Process each mod
    let fixed = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < modsToFix.length; i++) {
      const mod = modsToFix[i];
      const progress = `[${i + 1}/${modsToFix.length}]`;

      console.log(`${progress} Processing: ${mod.title.substring(0, 50)}...`);
      console.log(`   Current author: "${mod.author || '(null)'}"`);
      console.log(`   Download URL: ${mod.downloadUrl}`);

      if (!mod.downloadUrl) {
        console.log(`   ⏭️  Skipping: No download URL`);
        skipped++;
        continue;
      }

      // Extract author
      const result = await this.extractAuthorFromUrl(mod.downloadUrl);

      if (result.author) {
        console.log(`   ✅ Found author: "${result.author}" (via ${result.method})`);

        if (options.fix) {
          await prisma.mod.update({
            where: { id: mod.id },
            data: { author: result.author },
          });
          console.log(`   💾 Updated in database`);
          fixed++;
        } else {
          console.log(`   📝 Would update (dry run)`);
          fixed++;
        }
      } else {
        console.log(`   ❌ Could not extract author (${result.method})`);
        failed++;
      }

      // Rate limiting
      if (i < modsToFix.length - 1) {
        await this.sleep(this.delay);
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total processed: ${modsToFix.length}`);
    console.log(`   Fixed/Would fix: ${fixed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed: ${failed}`);

    if (!options.fix) {
      console.log('');
      console.log('💡 Run with --fix to apply changes');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  const cleanup = new AuthorCleanup();

  try {
    await cleanup.run({ fix, limit });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
