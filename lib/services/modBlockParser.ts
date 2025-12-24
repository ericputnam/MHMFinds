import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Lazy initialization of OpenAI client to allow env vars to load first
let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const useOllama = process.env.USE_OLLAMA === 'true';
    const ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';

    _openaiClient = new OpenAI({
      apiKey: useOllama ? 'ollama' : process.env.OPENAI_API_KEY,
      baseURL: useOllama ? ollamaBaseURL : undefined,
    });
  }
  return _openaiClient;
}

// For backwards compatibility, keep the model name accessible
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

export interface ParsedModBlock {
  title: string;
  author?: string;
  image?: string;
  description?: string;
  downloadUrl?: string;
  additionalImages?: string[];
}

/**
 * Use Ollama AI to intelligently parse mod blocks from HTML
 * Handles variations in structure much better than regex
 */
export class ModBlockParser {
  /**
   * Parse ALL mods from an entire article using hybrid cheerio + AI approach (FAST!)
   * @param articleHtml - The complete article HTML
   * @param baseUrl - Base URL for resolving relative URLs
   */
  async parseArticleWithAI(articleHtml: string, baseUrl: string): Promise<ParsedModBlock[]> {
    const fullHtml = articleHtml;

    // 🚀 HYBRID APPROACH: Pre-filter with cheerio to find sections with download links
    // This is MUCH faster than sending entire article to AI
    const $ = cheerio.load(articleHtml);

    // Find all external download links
    const externalLinkSelectors = 'a[href*="patreon.com"], a[href*="thesimsresource.com"], a[href*="curseforge.com"], a[href*="simsdom.com"], a[href*="tumblr.com"]';
    const downloadLinks = $(externalLinkSelectors);

    if (downloadLinks.length === 0) {
      console.log('   ⚠️  No external download links found in article, skipping AI parsing');
      return [];
    }

    console.log(`   📦 Found ${downloadLinks.length} download links, extracting mod sections...`);

    // Extract HTML sections around each download link (h3/h4 header + surrounding content)
    const modSections: string[] = [];
    downloadLinks.each((i, link) => {
      const $link = $(link);

      // Find the closest h3 or h4 heading before this link
      let $header = $link.prevAll('h3, h4').first();

      // If no header found, try parent's previous siblings
      if (!$header.length) {
        $header = $link.closest('div, section').prevAll('h3, h4').first();
      }

      if ($header.length) {
        // Extract section: header + next ~10 elements (includes image, description, download link)
        const sectionHtml = this.extractModBlockHTML($, $header);
        modSections.push(sectionHtml);
      }
    });

    // Deduplicate sections (same mod might have multiple download links)
    const uniqueSections = Array.from(new Set(modSections));
    console.log(`   🤖 Processing ${uniqueSections.length} unique mod sections with AI...`);

    // Combine sections into manageable chunks (max 15000 chars per chunk)
    const chunks: string[] = [];
    let currentChunk = '';

    for (const section of uniqueSections) {
      if ((currentChunk + section).length > 15000) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = section;
      } else {
        currentChunk += '\n' + section;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    console.log(`   🔧 Split into ${chunks.length} chunks, processing sequentially...`);

    // Process chunks SEQUENTIALLY (faster with Ollama than parallel)
    const allMods: ParsedModBlock[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`   🤖 Chunk ${i + 1}/${chunks.length}...`);
      const mods = await this.parseArticleChunk(chunks[i], baseUrl, fullHtml);
      allMods.push(...mods);
    }

    const uniqueMods = this.deduplicateMods(allMods);
    console.log(`   ✅ Found ${uniqueMods.length} unique mods`);
    return uniqueMods;
  }

  /**
   * Deduplicate mods by download URL (same mod shouldn't appear twice)
   */
  private deduplicateMods(mods: ParsedModBlock[]): ParsedModBlock[] {
    const seen = new Set<string>();
    return mods.filter(mod => {
      if (!mod.downloadUrl) return false;
      if (seen.has(mod.downloadUrl)) return false;
      seen.add(mod.downloadUrl);
      return true;
    });
  }

  /**
   * Parse a single chunk of article HTML
   */
  private async parseArticleChunk(chunkHtml: string, baseUrl: string, fullHtml: string): Promise<ParsedModBlock[]> {
    const prompt = `You are an expert HTML parser for Sims 4 mod listicle articles. Extract ALL mods from this article as a JSON array.

⚠️ CRITICAL WARNING: ONLY extract download URLs that ACTUALLY EXIST in the HTML above. NEVER make up, infer, or guess URLs.
⚠️ If the HTML contains NO download links, you MUST return an empty array: []

HTML ARTICLE:
\`\`\`html
${chunkHtml}
\`\`\`

BASE URL: ${baseUrl}

EXTRACTION RULES:
Each mod entry MUST have:
1. **Title**: h3 or h4 heading (remove listicle numbers like "3. ", "12. " etc.)
2. **Author**: Look for "by [AuthorName]" in the title or nearby text
3. **Image**: Find the primary image for this mod
   - Check <figure class="wp-block-image"> elements
   - Look in: data-src, data-lazy-src, data-orig-file, src, srcset attributes
   - Take the HIGHEST quality URL (look for width/height in URL or srcset)
   - Ignore: data:image/svg placeholders, ads (googleadservices, doubleclick), logos
   - If relative URL, prepend ${baseUrl}
4. **Description**: 1-2 sentences max from paragraphs between image and download link (keep it SHORT!)
5. **Download URL** (REQUIRED - skip entry if missing):
   - The URL MUST appear in an actual <a href="..."> tag in the HTML above
   - NEVER create, infer, or guess download URLs - they must be verbatim from the HTML
   - Pattern A: "Download:" followed by <a href>
   - Pattern B: <div class="p-block-kadence-advancedbtn"> or <a class="kb-button">
   - MUST be an external link (NOT ${baseUrl} internal blog links)
   - MUST link to: patreon.com, thesimsresource.com, curseforge.com, simsdom.com, tumblr.com, etc.

⚠️ IMPORTANT: This is an HTML PARSER. You can ONLY extract what EXISTS in the HTML. DO NOT infer or create content.

SKIP these entirely:
- Non-mod sections (FAQ, Conclusion, Introduction, Table of Contents)
- Entries without external download links found in actual <a href> tags
- Informational content or gameplay tips
- Articles about trends, news, or gameplay tips (these have NO download links)

RESPOND WITH JSON ARRAY ONLY (no markdown, no explanation):
[
  {
    "title": "Mod Title Here",
    "author": "Author Name" or null,
    "image": "https://full-url.jpg" or null,
    "description": "Description..." or null,
    "downloadUrl": "https://external-download-link.com"
  }
]

If NO valid mods with download links exist, return: []`;

    try {
      const useOllama = process.env.USE_OLLAMA === 'true';
      const response = await getOpenAIClient().chat.completions.create({
        model: useOllama ? ollamaModel : 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an HTML parser. Always respond with valid JSON array only. Never include markdown code blocks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 6000, // Increased for full article with room for JSON
      });

      const content = response.choices[0].message.content || '[]';

      // Clean up response
      let cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try to extract JSON array if there's extra text
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      // Fix trailing commas
      cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');

      // Attempt to parse JSON, with better error handling
      let parsed: ParsedModBlock[];
      try {
        parsed = JSON.parse(cleanContent);
      } catch (parseError) {
        // If JSON is malformed, try to fix common issues
        console.log('   ⚠️  Initial JSON parse failed, attempting repair...');

        // Try to fix unescaped quotes in strings (common AI mistake)
        let repairedContent = cleanContent
          // Fix newlines in strings
          .replace(/("\w+"\s*:\s*"[^"]*)\n([^"]*")/g, '$1 $2')
          // Fix unescaped quotes (very basic)
          .replace(/([^\\])"([^",:}]*)"([^",:}]*)"([^",:}]*)/g, '$1\\"$2\\"$3\\"$4');

        try {
          parsed = JSON.parse(repairedContent);
          console.log('   ✅ JSON repair successful');
        } catch (repairError) {
          console.error('   ⚠️  JSON repair failed, content preview:', cleanContent.substring(0, 500));
          return [];
        }
      }

      // 🛡️ VALIDATION: Filter out hallucinated URLs by checking if they actually exist in the HTML
      const validMods = parsed.filter(mod => {
        // Basic validation
        if (!mod.title || mod.title.length < 3 || !mod.downloadUrl) {
          return false;
        }

        // CRITICAL: Check if the download URL actually appears in the full HTML
        // This prevents the AI from hallucinating or making up URLs
        const urlInHtml = fullHtml.includes(mod.downloadUrl);

        if (!urlInHtml) {
          console.log(`   ⚠️  Skipping "${mod.title}" - download URL not found in HTML: ${mod.downloadUrl}`);
          return false;
        }

        return true;
      });

      console.log(`   ✅ Validated ${validMods.length} of ${parsed.length} mods (filtered ${parsed.length - validMods.length} hallucinated entries)`);

      return validMods;
    } catch (error) {
      console.error('   ⚠️  Bulk AI parsing failed:', error);
      return [];
    }
  }

  /**
   * Parse a single mod block using AI (legacy, slower method)
   * @param htmlBlock - The HTML content for this mod block (h3/h4 + next ~10 elements)
   * @param baseUrl - Base URL for resolving relative URLs
   */
  async parseWithAI(htmlBlock: string, baseUrl: string): Promise<ParsedModBlock | null> {
    const prompt = `You are an expert HTML parser for Sims 4 mod content. Extract structured data from this mod block HTML.

HTML BLOCK:
\`\`\`html
${htmlBlock.substring(0, 4000)}
\`\`\`

BASE URL: ${baseUrl}

EXTRACTION RULES:
1. **Title**: Extract from h3/h4 heading. Remove listicle numbers (e.g., "3. "). Clean up extra whitespace.

2. **Author**: Look for "by [AuthorName]" in the title or nearby text. Extract just the author's name.

3. **Image**: Find the FIRST image in a <figure class="wp-block-image"> element.
   - Look for: data-src, data-lazy-src, data-orig-file, or src attributes
   - Ignore: SVG placeholders (data:image/svg), ads (googleadservices, doubleclick), logos
   - If relative URL, prepend ${baseUrl}

4. **Description**: Extract text from <p> paragraphs AFTER the image but BEFORE the download link.
   - Combine multiple paragraphs
   - Skip ads and empty paragraphs
   - Limit to ~2-3 paragraphs

5. **Download URL**: Find the download link using these patterns:
   - Pattern A: Text "Download:" followed by <a href>
   - Pattern B: <div class="p-block-kadence-advancedbtn"> containing <a href>
   - Pattern C: Button/link with text like "Download", "Get", "Click Here"
   - Extract the href value
   - If relative URL, prepend ${baseUrl}

RESPOND WITH JSON ONLY (no markdown, no explanation):
{
  "title": "Mod Title Here",
  "author": "Author Name" or null,
  "image": "https://full-url-to-image.jpg" or null,
  "description": "Description text..." or null,
  "downloadUrl": "https://download-link.com" or null
}`;

    try {
      const useOllama = process.env.USE_OLLAMA === 'true';
      const response = await getOpenAIClient().chat.completions.create({
        model: useOllama ? ollamaModel : 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an HTML parser. Always respond with valid JSON only. Never include markdown code blocks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Very low for consistent extraction
        max_tokens: 500,
      });

      const content = response.choices[0].message.content || '{}';

      // Clean up response in case model wrapped it in markdown
      let cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try to extract JSON if there's extra text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      // Fix trailing commas (common LLM mistake)
      cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');

      const parsed = JSON.parse(cleanContent) as ParsedModBlock;

      // Validate we got at least a title
      if (!parsed.title || parsed.title.length < 3) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('   ⚠️  AI parsing failed:', error);
      return null;
    }
  }

  /**
   * Extract HTML block for a single mod (h3/h4 + next ~10 elements)
   * This will be passed to the AI for parsing
   */
  extractModBlockHTML($: cheerio.CheerioAPI, $header: cheerio.Cheerio<any>): string {
    const elements: string[] = [];

    // Add the header
    elements.push($.html($header));

    // Add next ~10 elements (enough to capture image, description, and download link)
    let $next = $header.next();
    let count = 0;

    while ($next.length > 0 && count < 10) {
      // Stop if we hit another h2/h3/h4 (next mod or section)
      if ($next.is('h2') || $next.is('h3') || $next.is('h4')) {
        break;
      }

      elements.push($.html($next));
      $next = $next.next();
      count++;
    }

    return elements.join('\n');
  }
}

export const modBlockParser = new ModBlockParser();
