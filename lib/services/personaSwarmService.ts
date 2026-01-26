/**
 * Persona Swarm Service
 *
 * Validates affiliate products through 8 simulated user personas
 * representing the MHMFinds audience demographics. Products must achieve
 * 3/8 approval (37.5%) to pass validation.
 *
 * PRD: Affiliate Research Agent System
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Persona vote structure
export interface PersonaVote {
  wouldBuy: boolean;
  aestheticScore: number; // 1-10
  priceFeeling: 'too_cheap' | 'perfect' | 'too_expensive';
  reasoning: string;
}

// Full swarm evaluation result
export interface SwarmEvaluation {
  productName: string;
  votes: Record<string, PersonaVote>;
  passed: boolean;
  approvalCount: number;
  summary: string;
}

// Product input for evaluation
export interface ProductInput {
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
}

// Persona definition
interface Persona {
  id: string;
  name: string;
  age: number;
  location: string;
  income: number;
  aesthetic: string;
  priceRange: { min: number; max: number };
  voice: string;
  evaluationCriteria: string;
}

// The 8 personas - Based on REAL MustHaveMods analytics data:
// - 90%+ desktop users (PC gamers, not casual browsers)
// - Top countries: USA (42%), Brazil (8%), UK (7%), France (5%), Poland (5%)
// - Top content: Hair, Full-body outfits, Furniture, Makeup
// - Top aesthetics: Cozy, Modern, Minimalist, Luxury, Fantasy, Witchy, Streetwear, Summer
// - Sims 4 demographic: primarily women 16-30, creative/artistic interests
const PERSONAS: Persona[] = [
  {
    id: 'jessica',
    name: 'Jessica',
    age: 24,
    location: 'California, USA',
    income: 42000,
    aesthetic: 'Cozy/Modern',
    priceRange: { min: 15, max: 50 },
    voice: 'Casual but thoughtful. Actually thinks about purchases. "This is cute but do I need it?"',
    evaluationCriteria: `
      - Would I actually use this in real life, not just think it's cute?
      - Does this match my cozy/modern style?
      - Is this practical or just impulse buy material?
      - As a Sims player, would this fit my IRL aesthetic the way my CC fits my Sims?
    `,
  },
  {
    id: 'ana',
    name: 'Ana',
    age: 21,
    location: 'São Paulo, Brazil',
    income: 18000,
    aesthetic: 'Fantasy/Witchy',
    priceRange: { min: 8, max: 30 },
    voice: 'Creative and imaginative but very budget-conscious. Saves up for things she really wants.',
    evaluationCriteria: `
      - Is this unique and special, or generic mass-market stuff?
      - Does it match my witchy/fantasy aesthetic?
      - Can I afford this with my budget? Is it worth saving for?
      - Would I be excited to own this, or is it just "okay"?
    `,
  },
  {
    id: 'emma',
    name: 'Emma',
    age: 27,
    location: 'London, UK',
    income: 35000,
    aesthetic: 'Minimalist/Luxury',
    priceRange: { min: 25, max: 75 },
    voice: 'Quality over quantity. Would rather have fewer nice things than lots of cheap stuff.',
    evaluationCriteria: `
      - Is this well-made or cheap junk that will break?
      - Does it look expensive/quality or obviously cheap?
      - Will this last, or is it disposable fast-fashion?
      - Does this add value to my life or is it clutter?
    `,
  },
  {
    id: 'madison',
    name: 'Madison',
    age: 17,
    location: 'Texas, USA',
    income: 5000,
    aesthetic: 'Trendy/Romantic',
    priceRange: { min: 5, max: 20 },
    voice: 'High school student with limited money. Gets allowance/part-time job. Very selective.',
    evaluationCriteria: `
      - Can I actually afford this with my limited budget?
      - Is this something I'd actually wear/use, or just looks cool online?
      - Would my friends think this is cool?
      - Is this age-appropriate for a teenager?
    `,
  },
  {
    id: 'kasia',
    name: 'Kasia',
    age: 23,
    location: 'Warsaw, Poland',
    income: 22000,
    aesthetic: 'Vintage/Romantic',
    priceRange: { min: 10, max: 40 },
    voice: 'Appreciates unique vintage-inspired pieces. Not interested in basic or generic items.',
    evaluationCriteria: `
      - Is this unique or can I find this anywhere?
      - Does it have character/personality or is it boring?
      - Would this work with my vintage-inspired wardrobe?
      - Is the price fair for what I'm getting?
    `,
  },
  // NEW PERSONAS to cover gaps
  {
    id: 'destiny',
    name: 'Destiny',
    age: 20,
    location: 'Atlanta, USA',
    income: 28000,
    aesthetic: 'Streetwear/Edgy',
    priceRange: { min: 15, max: 45 },
    voice: 'Confident, knows what she likes. Into bold statement pieces and urban style.',
    evaluationCriteria: `
      - Is this a statement piece or basic boring stuff?
      - Does it have edge and personality?
      - Would this stand out or blend into the crowd?
      - Is this actually cool or just trying too hard?
    `,
  },
  {
    id: 'chloe',
    name: 'Chloe',
    age: 22,
    location: 'Florida, USA',
    income: 32000,
    aesthetic: 'Summer/Preppy',
    priceRange: { min: 12, max: 40 },
    voice: 'Bright and cheerful. Loves colorful, fun pieces. Beach vibes year-round.',
    evaluationCriteria: `
      - Is this fun and cheerful or dull and boring?
      - Does it give summer/beach/preppy vibes?
      - Would this look cute in photos?
      - Is this versatile enough to wear often?
    `,
  },
  {
    id: 'marie',
    name: 'Marie',
    age: 26,
    location: 'Paris, France',
    income: 30000,
    aesthetic: 'Everyday Chic',
    priceRange: { min: 15, max: 50 },
    voice: 'Practical but stylish. Wants things that work for daily life but still look put-together.',
    evaluationCriteria: `
      - Would I actually use this regularly, not just once?
      - Is this practical AND stylish, not just one or the other?
      - Does this work for everyday life - work, errands, casual outings?
      - Is this a smart purchase or impulse buy I'll regret?
    `,
  },
];

/**
 * PersonaSwarmService class - validates products through user personas
 */
export class PersonaSwarmService {
  /**
   * Get all persona definitions
   */
  getPersonas(): Persona[] {
    return PERSONAS;
  }

  /**
   * Evaluate a single product through all 5 personas
   */
  async evaluateProduct(product: ProductInput): Promise<SwarmEvaluation> {
    const votes: Record<string, PersonaVote> = {};
    let approvalCount = 0;
    const approvers: string[] = [];
    const rejecters: string[] = [];

    for (const persona of PERSONAS) {
      const vote = await this.getPersonaVote(persona, product);
      votes[persona.id] = vote;

      if (vote.wouldBuy) {
        approvalCount++;
        approvers.push(persona.name);
      } else {
        rejecters.push(persona.name);
      }
    }

    const passed = approvalCount >= 3;

    // Generate summary
    const summary = this.generateSummary(product, votes, approvers, rejecters);

    return {
      productName: product.name,
      votes,
      passed,
      approvalCount,
      summary,
    };
  }

  /**
   * Batch validate multiple products
   */
  async batchValidate(products: ProductInput[]): Promise<SwarmEvaluation[]> {
    const results: SwarmEvaluation[] = [];

    for (const product of products) {
      const evaluation = await this.evaluateProduct(product);
      results.push(evaluation);

      // Small delay between evaluations to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Sort by approval count descending
    results.sort((a, b) => b.approvalCount - a.approvalCount);

    return results;
  }

  /**
   * Chat with a specific persona for brainstorming
   */
  async chatWithPersona(
    personaName: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const persona = PERSONAS.find(
      (p) => p.id === personaName.toLowerCase() || p.name.toLowerCase() === personaName.toLowerCase()
    );

    if (!persona) {
      throw new Error(
        `Invalid persona: ${personaName}. Choose from: ${PERSONAS.map((p) => p.id).join(', ')}`
      );
    }

    const systemPrompt = this.buildChatSystemPrompt(persona);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error(`Error chatting with persona ${personaName}:`, error);
      throw error;
    }
  }

  /**
   * Get a single persona's vote on a product
   */
  private async getPersonaVote(persona: Persona, product: ProductInput): Promise<PersonaVote> {
    const systemPrompt = this.buildEvaluationSystemPrompt(persona);
    const userPrompt = this.buildEvaluationUserPrompt(persona, product);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.getDefaultVote(persona, product);
      }

      const parsed = JSON.parse(content);
      return {
        wouldBuy: Boolean(parsed.wouldBuy),
        aestheticScore: Math.min(10, Math.max(1, Number(parsed.aestheticScore) || 5)),
        priceFeeling: this.validatePriceFeeling(parsed.priceFeeling, persona, product.price),
        reasoning: String(parsed.reasoning || 'No reasoning provided'),
      };
    } catch (error) {
      console.error(`Error getting vote from ${persona.name}:`, error);
      return this.getDefaultVote(persona, product);
    }
  }

  /**
   * Build system prompt for persona evaluation
   */
  private buildEvaluationSystemPrompt(persona: Persona): string {
    return `You are ${persona.name}, a ${persona.age}-year-old woman from ${persona.location} who plays The Sims 4 and downloads custom content mods.

Your annual income: $${persona.income.toLocaleString()}
Your aesthetic style: ${persona.aesthetic}
Your personality: ${persona.voice}
Your comfortable price range: $${persona.priceRange.min}-$${persona.priceRange.max}

YOUR EVALUATION CRITERIA (use these to decide):
${persona.evaluationCriteria}

You are evaluating whether YOU would actually BUY this product with your own money. Be CRITICAL and REALISTIC.

AUTOMATIC REJECTION (wouldBuy: false) if ANY of these apply:
- Gray hair coverage, anti-aging products (you're ${persona.age}, not 40+)
- Baby/kids products (unless you're a parent, which you're not)
- Medical supplies, denture products, mobility aids
- Men's products (you're a woman)
- Professional/industrial equipment
- Products clearly for a different age group or demographic
- Generic bulk items with no aesthetic appeal (plain t-shirt packs, basic supplies)
- Products you'd never actually use in real life

BE HONEST: Most products should be REJECTED. Only approve things you would genuinely spend your own money on.

Respond with JSON:
{
  "wouldBuy": true or false,
  "aestheticScore": 1-10 (how much does this match your style?),
  "priceFeeling": "too_cheap" or "perfect" or "too_expensive",
  "reasoning": "2-3 sentences explaining your decision AS ${persona.name}"
}`;
  }

  /**
   * Build user prompt for product evaluation
   */
  private buildEvaluationUserPrompt(persona: Persona, product: ProductInput): string {
    return `Evaluate this product as ${persona.name}:

Product: ${product.name}
Price: $${product.price.toFixed(2)}
Category: ${product.category}
${product.description ? `Description: ${product.description}` : ''}

Would you buy this? Does it match your aesthetic? Is the price right for your budget?
Remember to respond as ${persona.name} would, using your characteristic voice.`;
  }

  /**
   * Build system prompt for chat mode
   */
  private buildChatSystemPrompt(persona: Persona): string {
    return `You are ${persona.name}, a ${persona.age}-year-old woman from ${persona.location}.

Background:
- Income: $${persona.income.toLocaleString()}/year
- Aesthetic style: ${persona.aesthetic}
- Comfortable price range: $${persona.priceRange.min}-$${persona.priceRange.max}
- Personality: ${persona.voice}

You're a dedicated Sims 4 player who spends hours downloading CC (custom content) mods. Your favorite mod categories match your aesthetic - you download lots of hair, clothing, makeup, and furniture mods.

You're being asked about your shopping preferences and what real-world products you'd actually buy. Be honest and critical - you don't just buy everything that looks cute. You think about whether you'd actually use something.

Stay in character as ${persona.name}. Be conversational and genuine.`;
  }

  /**
   * Get default vote based on persona characteristics
   */
  private getDefaultVote(persona: Persona, product: ProductInput): PersonaVote {
    const inPriceRange =
      product.price >= persona.priceRange.min && product.price <= persona.priceRange.max;

    let priceFeeling: 'too_cheap' | 'perfect' | 'too_expensive';
    if (product.price < persona.priceRange.min) {
      priceFeeling = 'too_cheap';
    } else if (product.price > persona.priceRange.max) {
      priceFeeling = 'too_expensive';
    } else {
      priceFeeling = 'perfect';
    }

    return {
      wouldBuy: inPriceRange,
      aestheticScore: 5,
      priceFeeling,
      reasoning: `Default evaluation: Product is ${inPriceRange ? 'within' : 'outside'} my typical price range.`,
    };
  }

  /**
   * Validate and normalize price feeling
   */
  private validatePriceFeeling(
    feeling: unknown,
    persona: Persona,
    price: number
  ): 'too_cheap' | 'perfect' | 'too_expensive' {
    const valid = ['too_cheap', 'perfect', 'too_expensive'];
    if (typeof feeling === 'string' && valid.includes(feeling)) {
      return feeling as 'too_cheap' | 'perfect' | 'too_expensive';
    }

    // Infer from price range
    if (price < persona.priceRange.min) return 'too_cheap';
    if (price > persona.priceRange.max) return 'too_expensive';
    return 'perfect';
  }

  /**
   * Generate evaluation summary
   */
  private generateSummary(
    product: ProductInput,
    votes: Record<string, PersonaVote>,
    approvers: string[],
    rejecters: string[]
  ): string {
    if (approvers.length === 5) {
      return `Universally approved! All 5 personas would buy "${product.name}".`;
    }

    if (approvers.length === 0) {
      return `Universally rejected. No personas would buy "${product.name}". Consider different products.`;
    }

    const approverStr = approvers.join(', ');
    const rejecterStr = rejecters.join(', ');

    // Analyze rejection reasons
    const priceRejections = Object.entries(votes).filter(
      ([, v]) => !v.wouldBuy && v.priceFeeling !== 'perfect'
    ).length;

    const aestheticRejections = Object.entries(votes).filter(
      ([, v]) => !v.wouldBuy && v.aestheticScore < 5
    ).length;

    let insight = '';
    if (priceRejections > aestheticRejections) {
      insight = 'Price point is the main concern for non-buyers.';
    } else if (aestheticRejections > priceRejections) {
      insight = 'Aesthetic mismatch is the main concern for non-buyers.';
    }

    return `Appeals to ${approvers.length}/${Object.keys(votes).length} personas (${approverStr}). ${rejecterStr} would not buy. ${insight}`;
  }

  /**
   * Get insights about persona performance
   */
  async getPersonaInsights(): Promise<{
    mostApproving: string;
    mostSelective: string;
    recommendations: string[];
  }> {
    // This would typically query historical data
    // For now, return static insights based on persona definitions
    return {
      mostApproving: 'mia', // Budget-conscious but enthusiastic
      mostSelective: 'luna', // Quality-focused, rejects mainstream
      recommendations: [
        'Mia approves most products under $25',
        'Luna rarely approves unless unique/quality',
        'Emily and Sofia often align on trendy items',
        'Claire rejects trendy items but approves quality',
      ],
    };
  }
}

// Export singleton instance
export const personaSwarmService = new PersonaSwarmService();
