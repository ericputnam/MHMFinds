import { GoogleGenAI, Type } from "@google/genai";
import { Mod, Category, GeminiModResponse } from "../types";

// Initialize Gemini Client
// Note: In a production environment, ensure process.env.API_KEY is set.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
You are the backend search engine for "MustHaveMods", a premier Sims 4 mod discovery platform.
Your goal is to generate realistic, high-quality Sims 4 mod listings based on user search queries or image inputs.
You know about famous creators (e.g., TwistedMexi, Peacemaker, Pralinesims) and popular mod types.
If the user searches for something specific, generate 6-8 plausible results.
If the input is generic, provide trending mods.
Ensure 'isMaxisMatch' is strictly boolean.
Rating should be between 3.5 and 5.0.
Download count should be formatted like "1.2M", "500k", etc.
`;

// Helper to generate random dates within the last 2 years
const getRandomDate = () => {
  const start = new Date(2023, 0, 1);
  const end = new Date();
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const searchModsWithGemini = async (query: string, category: Category, imageBase64?: string): Promise<Mod[]> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return [];
  }

  const modelId = "gemini-2.5-flash";

  // Construct the prompt
  let promptText = `Search Query: "${query}"`;
  if (category !== Category.ALL) {
    promptText += `. Filter by Category: ${category}`;
  }
  promptText += ". Return a list of 8 distinct mods.";

  if (imageBase64) {
    promptText += " Analyze this image and suggest Sims 4 mods that match the style, furniture, or clothing seen in it.";
  }

  const parts: any[] = [{ text: promptText }];

  // If an image is provided for visual search
  if (imageBase64) {
    parts.unshift({
      inlineData: {
        mimeType: "image/jpeg", // Assuming jpeg for simplicity in this PoC
        data: imageBase64
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  author: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  downloadCount: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  isMaxisMatch: { type: Type.BOOLEAN }
                }
              }
            }
          }
        }
      }
    });

    const rawText = response.text;
    if (!rawText) return [];

    const data = JSON.parse(rawText) as GeminiModResponse;

    // Transform to internal Mod interface with IDs and Image Placeholders
    return data.mods.map((mod, index) => ({
      ...mod,
      id: `generated-${Date.now()}-${index}`,
      // Generate a consistent random image based on title length or index
      imageUrl: `https://picsum.photos/seed/${mod.title.replace(/\s/g, '')}${index}/400/300`,
      // Add enriched metadata for the detail view (Mock data for PoC)
      gameVersion: "1.103.250.1020",
      favoritesCount: Math.floor(Math.random() * 5000),
      viewCount: `${Math.floor(Math.random() * 50) + 1}k`,
      publishedDate: getRandomDate(),
      updatedDate: getRandomDate(),
      link: `https://musthavemods.com/mod/${index}`
    }));

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export const getTrendingMods = async (): Promise<Mod[]> => {
  // Wrapper to just get generic trending data
  return searchModsWithGemini("trending popular mods 2025 essential", Category.ALL);
};