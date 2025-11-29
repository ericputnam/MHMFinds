/**
 * Perplexity AI Service
 * Uses Perplexity API to research and gather information
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityService {

  static async query(
    prompt: string,
    systemMessage?: string
  ): Promise<string> {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
    }

    const messages: PerplexityMessage[] = [];

    if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar-pro', // Advanced search model for complex queries with up-to-date information
          messages,
          temperature: 0.2, // Lower temperature for more factual responses
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data: PerplexityResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Perplexity API');
      }

      return data.choices[0].message.content;

    } catch (error) {
      console.error('Error querying Perplexity:', error);
      throw error;
    }
  }

  /**
   * Research top Sims 4 mod creators
   */
  static async researchTopSimsCreators(): Promise<string> {
    const systemMessage = `You are a JSON API that returns structured data about The Sims 4 modding community.
You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or commentary.
If you cannot provide complete information, make your best educated guess based on available data.`;

    const prompt = `List the top 20 most well-known Sims 4 mod creators. Include popular creators like:
- Sacrificial (Extreme Violence mod)
- Basemental (Drugs/Gangs mods)
- Turbodriver (WickedWhims)
- MC Command Center team
- LittleMsSam
- Kawaiistacie (Slice of Life)
- SimRealist
- And 13 more popular creators

Response format - return ONLY this JSON array with no other text:
[
  {
    "name": "Sacrificial",
    "handle": "sacrificialmods",
    "platform": "Patreon",
    "profileUrl": "https://www.patreon.com/sacrificialmods",
    "bio": "Creator of Extreme Violence and Life Tragedies mods",
    "isVerified": true,
    "specialization": "Gameplay Scripts",
    "estimatedFollowers": "50k+"
  }
]

Include 20 creators total. Return ONLY the JSON array starting with [ and ending with ]. No other text.`;

    return await this.query(prompt, systemMessage);
  }
}
