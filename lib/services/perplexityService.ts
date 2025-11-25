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
    const systemMessage = `You are a research assistant specializing in The Sims 4 modding community.
Your responses should be factual, up-to-date, and well-structured.
Always include sources when possible.`;

    const prompt = `Please provide a comprehensive list of the top 30 most popular and influential Sims 4 mod creators as of 2025.

For each creator, include:
1. Creator name/handle
2. Primary platform (Patreon, CurseForge, Tumblr, etc.)
3. Profile URL
4. Brief bio (1-2 sentences about what they create)
5. Verification status (if they're officially recognized)
6. Specialization (gameplay mods, CAS, Build/Buy, etc.)

Please format the response as a structured JSON array with the following format:
[
  {
    "name": "Creator Name",
    "handle": "creatorhandle",
    "platform": "Patreon",
    "profileUrl": "https://...",
    "bio": "Description of what they create",
    "isVerified": true/false,
    "specialization": "Gameplay Mods",
    "estimatedFollowers": "50k+"
  }
]

Focus on creators who are:
- Currently active (2024-2025)
- Have significant community following
- Produce high-quality, well-maintained content
- Are well-known in the Sims 4 modding community

Return ONLY the JSON array, no additional text.`;

    return await this.query(prompt, systemMessage);
  }
}
