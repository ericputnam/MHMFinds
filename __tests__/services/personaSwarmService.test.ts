import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

// Hoist the mock function so it's available before the module is loaded
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock('openai', () => {
  // Create a proper class that can be instantiated with `new`
  class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  }
  return { default: MockOpenAI };
});

// Import after mock is set up
import { PersonaSwarmService, PersonaVote } from '@/lib/services/personaSwarmService';

describe('PersonaSwarmService', () => {
  let service: PersonaSwarmService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PersonaSwarmService();
  });

  describe('getPersonas', () => {
    it('should return all 8 personas', () => {
      const personas = service.getPersonas();

      expect(personas).toHaveLength(8);
      expect(personas.map((p) => p.name)).toEqual([
        'Jessica', 'Ana', 'Emma', 'Madison', 'Kasia', 'Destiny', 'Chloe', 'Marie'
      ]);
    });

    it('should have correct price ranges for each persona', () => {
      const personas = service.getPersonas();

      const madison = personas.find((p) => p.name === 'Madison');
      const emma = personas.find((p) => p.name === 'Emma');

      // Madison is budget-conscious teen, Emma has higher budget
      expect(madison?.priceRange.max).toBeLessThan(emma?.priceRange.min || 0);
    });

    it('should have unique aesthetics for each persona', () => {
      const personas = service.getPersonas();
      const aesthetics = personas.map((p) => p.aesthetic);

      expect(new Set(aesthetics).size).toBe(8);
    });

    it('should have valid income values', () => {
      const personas = service.getPersonas();

      personas.forEach((p) => {
        expect(p.income).toBeGreaterThan(0);
        expect(p.income).toBeLessThan(100000);
      });
    });
  });

  describe('evaluateProduct', () => {
    beforeEach(() => {
      // Setup default mock response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                wouldBuy: true,
                aestheticScore: 8,
                priceFeeling: 'perfect',
                reasoning: 'This is a great product!',
              }),
            },
          },
        ],
      });
    });

    it('should return votes from all 8 personas', async () => {
      const product = {
        name: 'Butterfly Hair Clips',
        price: 15,
        category: 'accessories',
      };

      const result = await service.evaluateProduct(product);

      expect(Object.keys(result.votes)).toHaveLength(8);
      expect(result.votes.jessica).toBeDefined();
      expect(result.votes.ana).toBeDefined();
      expect(result.votes.emma).toBeDefined();
      expect(result.votes.madison).toBeDefined();
      expect(result.votes.kasia).toBeDefined();
      expect(result.votes.destiny).toBeDefined();
      expect(result.votes.chloe).toBeDefined();
      expect(result.votes.marie).toBeDefined();
    });

    it('should pass product with 3+ approvals', async () => {
      const product = {
        name: 'Y2K Butterfly Clips',
        price: 12,
        category: 'hair-accessories',
      };

      const result = await service.evaluateProduct(product);

      // With mock returning true for all, should pass
      expect(result.passed).toBe(true);
      expect(result.approvalCount).toBe(8);
    });

    it('should reject product with fewer than 3 approvals', async () => {
      // Mock rejection for most personas
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                wouldBuy: false,
                aestheticScore: 3,
                priceFeeling: 'too_expensive',
                reasoning: 'Too expensive for my budget.',
              }),
            },
          },
        ],
      });

      const product = {
        name: 'Premium Designer Item',
        price: 200,
        category: 'fashion',
      };

      const result = await service.evaluateProduct(product);

      expect(result.passed).toBe(false);
      expect(result.approvalCount).toBeLessThan(3);
    });

    it('should include reasoning for each vote', async () => {
      const product = {
        name: 'Test Product',
        price: 25,
        category: 'decor',
      };

      const result = await service.evaluateProduct(product);

      for (const vote of Object.values(result.votes) as PersonaVote[]) {
        expect(vote.reasoning).toBeDefined();
        expect(vote.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should return aestheticScore between 1-10', async () => {
      const product = {
        name: 'Test Product',
        price: 25,
        category: 'decor',
      };

      const result = await service.evaluateProduct(product);

      for (const vote of Object.values(result.votes) as PersonaVote[]) {
        expect(vote.aestheticScore).toBeGreaterThanOrEqual(1);
        expect(vote.aestheticScore).toBeLessThanOrEqual(10);
      }
    });

    it('should return valid priceFeeling values', async () => {
      const product = {
        name: 'Test Product',
        price: 25,
        category: 'decor',
      };

      const result = await service.evaluateProduct(product);

      const validFeelings = ['too_cheap', 'perfect', 'too_expensive'];
      for (const vote of Object.values(result.votes) as PersonaVote[]) {
        expect(validFeelings).toContain(vote.priceFeeling);
      }
    });

    it('should generate a meaningful summary', async () => {
      const product = {
        name: 'Fairy String Lights',
        price: 20,
        category: 'home-decor',
      };

      const result = await service.evaluateProduct(product);

      expect(result.summary.length).toBeGreaterThan(10);
    });
  });

  describe('batchValidate', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                wouldBuy: true,
                aestheticScore: 7,
                priceFeeling: 'perfect',
                reasoning: 'Looks good!',
              }),
            },
          },
        ],
      });
    });

    it('should process multiple products', async () => {
      const products = [
        { name: 'Product 1', price: 15, category: 'accessories' },
        { name: 'Product 2', price: 30, category: 'decor' },
        { name: 'Product 3', price: 50, category: 'fashion' },
      ];

      const results = await service.batchValidate(products);

      expect(results).toHaveLength(3);
    });

    it('should return results sorted by approval count', async () => {
      // Vary responses to get different approval counts
      let callCount = 0;
      mockCreate.mockImplementation(() => {
        callCount++;
        // First product gets rejections, last gets approvals
        const wouldBuy = callCount > 10;
        return Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  wouldBuy,
                  aestheticScore: wouldBuy ? 8 : 3,
                  priceFeeling: wouldBuy ? 'perfect' : 'too_expensive',
                  reasoning: wouldBuy ? 'Love it!' : 'Not for me',
                }),
              },
            },
          ],
        });
      });

      const products = [
        { name: 'Low Appeal', price: 100, category: 'tech' },
        { name: 'High Appeal', price: 20, category: 'accessories' },
        { name: 'Medium Appeal', price: 45, category: 'fashion' },
      ];

      const results = await service.batchValidate(products);

      // Should be sorted descending by approval count
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].approvalCount).toBeGreaterThanOrEqual(results[i].approvalCount);
      }
    });
  });

  describe('chatWithPersona', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Oh my gosh, that's so cute! I'm totally obsessed with fairy lights!",
            },
          },
        ],
      });
    });

    it('should respond to valid persona', async () => {
      const response = await service.chatWithPersona(
        'jessica',
        'What do you think of this fairy light set?',
        []
      );

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should maintain conversation history', async () => {
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: 'Hi Ana!' },
        { role: 'assistant', content: 'Hiii! Whats up?' },
      ];

      const response = await service.chatWithPersona('ana', 'What products should we add?', history);

      expect(response).toBeDefined();
    });

    it('should throw error for invalid persona', async () => {
      await expect(service.chatWithPersona('invalid', 'Hello', [])).rejects.toThrow();
    });

    it('should accept persona by name or id', async () => {
      // Both should work
      const responseById = await service.chatWithPersona('jessica', 'Hello', []);
      const responseByName = await service.chatWithPersona('Jessica', 'Hello', []);

      expect(responseById).toBeDefined();
      expect(responseByName).toBeDefined();
    });
  });

  describe('persona price sensitivity', () => {
    it('Madison should have lowest price range max (teen budget)', () => {
      const personas = service.getPersonas();
      const madison = personas.find((p) => p.id === 'madison');

      expect(madison?.priceRange.max).toBe(20);
    });

    it('Emma should have highest price range (quality-focused)', () => {
      const personas = service.getPersonas();
      const emma = personas.find((p) => p.id === 'emma');

      expect(emma?.priceRange.max).toBe(75);
    });

    it('Ana should have moderate price range (budget-conscious creative)', () => {
      const personas = service.getPersonas();
      const ana = personas.find((p) => p.id === 'ana');

      expect(ana?.priceRange.min).toBe(8);
      expect(ana?.priceRange.max).toBe(30);
    });
  });

  describe('getPersonaInsights', () => {
    it('should return insights about personas', async () => {
      const insights = await service.getPersonaInsights();

      expect(insights.mostApproving).toBeDefined();
      expect(insights.mostSelective).toBeDefined();
      expect(insights.recommendations).toBeInstanceOf(Array);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });
  });
});
