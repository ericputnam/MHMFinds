import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { AffiliateResearchService, ProductCandidate } from '@/lib/services/affiliateResearchService';

// Mock OpenAI to prevent API key error when importing PersonaSwarmService
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ wouldBuy: true, aestheticScore: 8, priceFeeling: 'perfect', reasoning: 'Test mock' }) } }],
        }),
      },
    };
  },
}));

import { PersonaSwarmService } from '@/lib/services/personaSwarmService';

/**
 * Integration test for the full affiliate research cycle.
 * Tests the complete flow from content analysis to offer creation.
 *
 * NOTE: These tests require a test database and may make external API calls.
 * Run with: npm run test:integration
 *
 * Set TEST_INTEGRATION=true to run these tests.
 */

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.TEST_INTEGRATION === 'true';

// Helper to create a full ProductCandidate
function createProduct(overrides: Partial<ProductCandidate> = {}): ProductCandidate {
  return {
    name: 'Test Product',
    price: 25,
    category: 'accessories',
    matchingThemes: [],
    matchingContentTypes: ['accessories'],
    ...overrides,
  };
}

describe.skipIf(!runIntegration)('Affiliate Research Cycle Integration', () => {
  let researchService: AffiliateResearchService;
  let personaService: PersonaSwarmService;

  beforeAll(async () => {
    researchService = new AffiliateResearchService();
    personaService = new PersonaSwarmService();

    // Seed test data
    await seedTestMods();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Content Distribution Analysis', () => {
    it('should analyze real mod data from database', async () => {
      const distribution = await researchService.analyzeContentDistribution();

      expect(distribution.contentTypes.length).toBeGreaterThan(0);
      expect(distribution.themes.length).toBeGreaterThan(0);

      // Verify structure
      distribution.contentTypes.forEach((ct) => {
        expect(ct.type).toBeDefined();
        expect(ct.count).toBeGreaterThanOrEqual(0);
        expect(ct.downloads).toBeGreaterThanOrEqual(0);
      });
    });

    it('should prioritize high-download content types', async () => {
      const distribution = await researchService.analyzeContentDistribution();

      // Should be sorted by downloads descending
      for (let i = 1; i < distribution.contentTypes.length; i++) {
        expect(distribution.contentTypes[i - 1].downloads).toBeGreaterThanOrEqual(
          distribution.contentTypes[i].downloads
        );
      }
    });
  });

  describe('Product Research', () => {
    it('should find products for popular themes', async () => {
      // Get top theme from database
      const distribution = await researchService.analyzeContentDistribution();
      const topTheme = distribution.themes[0]?.theme || 'y2k';

      const products = await researchService.researchProductsForTheme(topTheme);

      expect(products.length).toBeGreaterThanOrEqual(0);
      products.forEach((p) => {
        expect(p.name).toBeDefined();
        expect(p.price).toBeLessThanOrEqual(75); // Should filter expensive items
      });
    });

    it('should not return gaming products', async () => {
      const products = await researchService.researchProductsForTheme('modern');

      products.forEach((p) => {
        expect(p.name.toLowerCase()).not.toContain('gaming');
        expect(p.name.toLowerCase()).not.toContain('gamer');
        expect(p.category).not.toBe('peripherals');
      });
    });
  });

  describe('Scoring Algorithm', () => {
    it('should apply consistent scoring across products', () => {
      const testProducts: ProductCandidate[] = [
        createProduct({
          name: 'Cottagecore Dress',
          price: 35,
          category: 'fashion',
          matchingThemes: ['cottagecore'],
        }),
        createProduct({
          name: 'Y2K Hair Clips',
          price: 12,
          category: 'accessories',
          matchingThemes: ['y2k'],
        }),
        createProduct({
          name: 'Minimalist Vase',
          price: 45,
          category: 'decor',
          matchingThemes: ['modern'],
        }),
      ];

      const scores = testProducts.map((p) => researchService.scoreProduct(p));

      scores.forEach((score) => {
        expect(score.finalScore).toBeGreaterThanOrEqual(0);
        expect(score.finalScore).toBeLessThanOrEqual(100);
        expect(score.demographicScore).toBeDefined();
        expect(score.aestheticScore).toBeDefined();
        expect(score.priceScore).toBeDefined();
        expect(score.trendScore).toBeDefined();
      });
    });
  });

  describe('Persona Validation', () => {
    it('should get votes from all personas', async () => {
      const product = {
        name: 'Fairy String Lights',
        price: 18,
        category: 'home-decor',
      };

      const result = await personaService.evaluateProduct(product);

      expect(Object.keys(result.votes)).toHaveLength(5);
      expect(result.approvalCount).toBeGreaterThanOrEqual(0);
      expect(result.approvalCount).toBeLessThanOrEqual(5);
    });

    it('should generate meaningful summaries', async () => {
      const product = {
        name: 'Butterfly Hair Clips Set',
        price: 15,
        category: 'hair-accessories',
      };

      const result = await personaService.evaluateProduct(product);

      expect(result.summary.length).toBeGreaterThan(20);
    });
  });

  describe('Full Research Cycle', () => {
    it('should complete a full research cycle', async () => {
      const result = await researchService.runResearchCycle(3);

      expect(result.runId).toBeDefined();
      expect(result.productsFound).toBeGreaterThanOrEqual(0);
      expect(result.offersCreated).toBeLessThanOrEqual(result.productsValidated);

      // Verify run record was created
      const run = await prisma.affiliateResearchRun.findUnique({
        where: { id: result.runId },
      });
      expect(run).toBeDefined();
      expect(run?.status).toBe('completed');
    });

    it('should create offers only for validated products', async () => {
      const result = await researchService.runResearchCycle(5);

      // Get created offers
      const offers = await prisma.affiliateOffer.findMany({
        where: { researchRunId: result.runId },
      });

      // All created offers should be persona-validated
      offers.forEach((offer) => {
        expect(offer.personaValidated).toBe(true);
        expect(offer.personaScore).toBeGreaterThanOrEqual(3);
      });
    });

    it('should store matching themes and content types', async () => {
      const result = await researchService.runResearchCycle(3);

      const offers = await prisma.affiliateOffer.findMany({
        where: { researchRunId: result.runId },
      });

      offers.forEach((offer) => {
        expect(offer.matchingThemes.length).toBeGreaterThan(0);
        expect(Number(offer.finalScore)).toBeGreaterThan(0);
      });
    });
  });
});

// Unit tests that don't require database
describe('Affiliate Research Service - Unit Tests', () => {
  let service: AffiliateResearchService;

  beforeAll(() => {
    service = new AffiliateResearchService();
  });

  describe('scoreProduct edge cases', () => {
    it('should handle missing matchingThemes', () => {
      const product = createProduct({
        name: 'Basic Product',
        price: 25,
        category: 'accessories',
        matchingThemes: [],
      });

      const score = service.scoreProduct(product);

      expect(score).toBeDefined();
      expect(score.finalScore).toBeGreaterThanOrEqual(0);
    });

    it('should reject products with RGB in name', () => {
      const product = createProduct({
        name: 'RGB Light Strip',
        price: 15,
        category: 'lighting',
      });

      const score = service.scoreProduct(product);

      expect(score.rejected).toBe(true);
    });

    it('should score cottagecore products higher than generic', () => {
      const cottagecore = createProduct({
        name: 'Cottagecore Floral Dress',
        price: 35,
        category: 'fashion',
        matchingThemes: ['cottagecore'],
      });

      const generic = createProduct({
        name: 'Plain Dress',
        price: 35,
        category: 'fashion',
        matchingThemes: [],
      });

      const cottageScore = service.scoreProduct(cottagecore);
      const genericScore = service.scoreProduct(generic);

      expect(cottageScore.aestheticScore).toBeGreaterThan(genericScore.aestheticScore);
    });
  });
});

describe('Persona Swarm Service - Unit Tests', () => {
  let service: PersonaSwarmService;

  beforeAll(() => {
    service = new PersonaSwarmService();
  });

  describe('persona definitions', () => {
    it('should have all required fields for each persona', () => {
      const personas = service.getPersonas();

      personas.forEach((p) => {
        expect(p.id).toBeDefined();
        expect(p.name).toBeDefined();
        expect(p.age).toBeGreaterThan(0);
        expect(p.location).toBeDefined();
        expect(p.income).toBeGreaterThan(0);
        expect(p.aesthetic).toBeDefined();
        expect(p.priceRange.min).toBeDefined();
        expect(p.priceRange.max).toBeDefined();
        expect(p.voice).toBeDefined();
        expect(p.evaluationCriteria).toBeDefined();
      });
    });

    it('should cover diverse age range', () => {
      const personas = service.getPersonas();
      const ages = personas.map((p) => p.age);

      // Madison is 17 (teen), Emma is 27 (late 20s)
      expect(Math.min(...ages)).toBeLessThan(20);
      expect(Math.max(...ages)).toBeGreaterThanOrEqual(26);
    });

    it('should cover diverse price ranges', () => {
      const personas = service.getPersonas();
      const minPrices = personas.map((p) => p.priceRange.min);
      const maxPrices = personas.map((p) => p.priceRange.max);

      // Madison (teen) has $5 min, Emma (quality-focused) has $75 max
      expect(Math.min(...minPrices)).toBeLessThan(10);
      expect(Math.max(...maxPrices)).toBeGreaterThanOrEqual(75);
    });
  });
});

// Helper functions
async function seedTestMods() {
  // Create test mods with various contentTypes and themes
  const testMods = [
    { title: 'Test Fashion Top', contentType: 'tops', themes: ['y2k'], downloadCount: 1000 },
    { title: 'Test Hair Style', contentType: 'hair', themes: ['cottagecore'], downloadCount: 800 },
    { title: 'Test Makeup Look', contentType: 'makeup', themes: ['goth'], downloadCount: 600 },
  ];

  for (const mod of testMods) {
    try {
      await prisma.mod.upsert({
        where: { id: `test-${mod.contentType}` },
        update: {
          title: mod.title,
          contentType: mod.contentType,
          themes: mod.themes,
          downloadCount: mod.downloadCount,
        },
        create: {
          id: `test-${mod.contentType}`,
          title: mod.title,
          contentType: mod.contentType,
          themes: mod.themes,
          downloadCount: mod.downloadCount,
          source: 'test',
          category: 'test',
        },
      });
    } catch {
      // Ignore errors during seeding - may be in unit test mode without DB
    }
  }
}

async function cleanupTestData() {
  try {
    // Clean up test research runs and offers
    await prisma.affiliateOffer.deleteMany({
      where: { name: { startsWith: 'Test' } },
    });
    await prisma.affiliateResearchRun.deleteMany({
      where: {
        id: { startsWith: 'test-' },
      },
    });
    await prisma.mod.deleteMany({
      where: { source: 'test' },
    });
  } catch {
    // Ignore errors during cleanup - may be in unit test mode without DB
  }
}
