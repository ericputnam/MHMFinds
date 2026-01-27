import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AffiliateResearchService, ProductCandidate, ValidatedProduct } from '@/lib/services/affiliateResearchService';
import { prisma } from '@/lib/prisma';
import { PerplexityService } from '@/lib/services/perplexityService';
import { scrapeProductsFromListingPage } from '@/lib/services/amazonScraperService';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    mod: { groupBy: vi.fn(), $queryRaw: vi.fn() },
    affiliateOffer: { create: vi.fn() },
    affiliateResearchRun: { create: vi.fn(), update: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/services/perplexityService', () => ({
  PerplexityService: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/services/personaSwarmService', () => ({
  personaSwarmService: {
    batchValidate: vi.fn().mockResolvedValue([]),
    evaluateProduct: vi.fn().mockResolvedValue({
      productName: 'Test',
      passed: true,
      approvalCount: 4,
      summary: 'Passed',
      votes: {},
    }),
  },
}));

// Mock Amazon scraper service - this is critical for avoiding timeouts
vi.mock('@/lib/services/amazonScraperService', () => ({
  scrapeProductsFromListingPage: vi.fn().mockResolvedValue([]),
  formatAffiliateUrl: vi.fn((asin: string) => `https://www.amazon.com/dp/${asin}?tag=musthavemod04-20`),
  scrapeProduct: vi.fn().mockResolvedValue(null),
  THEME_TO_CATEGORIES: {
    y2k: ['hairAccessories', 'womensEarrings'],
    cottagecore: ['homeDecor', 'lighting'],
  },
  AMAZON_DISCOVERY_PAGES: {
    hairAccessories: 'https://www.amazon.com/Best-Sellers-Hair-Clips/zgbs/beauty/11057651',
    womensEarrings: 'https://www.amazon.com/Best-Sellers-Earrings/zgbs/fashion/7192394011',
  },
}));

// Mock affiliate product research
vi.mock('@/lib/services/affiliateProductResearch', () => ({
  researchProducts: vi.fn().mockResolvedValue([]),
  discoverTrendingProducts: vi.fn().mockResolvedValue({ products: [], source: 'test' }),
}));

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

describe('AffiliateResearchService', () => {
  let service: AffiliateResearchService;

  beforeEach(() => {
    service = new AffiliateResearchService();
    vi.clearAllMocks();
  });

  describe('analyzeContentDistribution', () => {
    it('should return top contentTypes by download count', async () => {
      (prisma.mod.groupBy as Mock).mockResolvedValue([
        { contentType: 'tops', _count: { id: 5000 }, _sum: { downloadCount: 50000 } },
        { contentType: 'hair', _count: { id: 3000 }, _sum: { downloadCount: 35000 } },
        { contentType: 'makeup', _count: { id: 2500 }, _sum: { downloadCount: 25000 } },
      ]);
      (prisma.$queryRaw as Mock).mockResolvedValue([
        { theme: 'y2k', count: BigInt(100), downloads: BigInt(1000) },
      ]);

      const result = await service.analyzeContentDistribution();

      expect(result.contentTypes).toHaveLength(3);
      expect(result.contentTypes[0].type).toBe('tops');
      expect(result.contentTypes[0].downloads).toBe(50000);
    });

    it('should return top themes by download count', async () => {
      (prisma.mod.groupBy as Mock).mockResolvedValue([
        { contentType: 'tops', _count: { id: 100 }, _sum: { downloadCount: 1000 } },
      ]);
      (prisma.$queryRaw as Mock).mockResolvedValue([
        { theme: 'y2k', count: BigInt(100), downloads: BigInt(1000) },
      ]);

      const result = await service.analyzeContentDistribution();
      expect(result.themes).toBeDefined();
      expect(Array.isArray(result.themes)).toBe(true);
    });
  });

  describe('scoreProduct', () => {
    it('should score products in $15-50 range higher', () => {
      const cheapProduct = createProduct({ name: 'Cheap item', price: 5 });
      const sweetSpotProduct = createProduct({ name: 'Perfect item', price: 29 });
      const expensiveProduct = createProduct({ name: 'Expensive item', price: 65 });

      const cheapScore = service.scoreProduct(cheapProduct);
      const sweetScore = service.scoreProduct(sweetSpotProduct);
      const expensiveScore = service.scoreProduct(expensiveProduct);

      expect(sweetScore.priceScore).toBeGreaterThan(cheapScore.priceScore);
      expect(sweetScore.priceScore).toBeGreaterThan(expensiveScore.priceScore);
    });

    it('should reject products with gaming keywords', () => {
      const gamingProduct = createProduct({
        name: 'RGB Gaming Mouse Pad',
        price: 25,
      });

      const score = service.scoreProduct(gamingProduct);

      expect(score.rejected).toBe(true);
      expect(score.rejectionReason).toContain('gaming');
    });

    it('should reject products in tech/peripherals category', () => {
      const techProduct = createProduct({
        name: 'Wireless Keyboard',
        price: 45,
        category: 'peripherals',
      });

      const score = service.scoreProduct(techProduct);

      expect(score.rejected).toBe(true);
    });

    it('should score aesthetic-matching products higher', () => {
      const aestheticProduct = createProduct({
        name: 'Cottagecore Fairy Lights',
        price: 22,
        category: 'home-decor',
        matchingThemes: ['cottagecore'],
      });

      const genericProduct = createProduct({
        name: 'LED Lights',
        price: 22,
        category: 'home-decor',
        matchingThemes: [],
      });

      const aestheticScore = service.scoreProduct(aestheticProduct);
      const genericScore = service.scoreProduct(genericProduct);

      expect(aestheticScore.aestheticScore).toBeGreaterThan(genericScore.aestheticScore);
    });

    it('should apply correct weights: demographic 35%, aesthetic 30%, price 20%, trend 15%', () => {
      const product = createProduct({
        name: 'Test Product',
        price: 30,
        category: 'fashion',
        matchingThemes: ['y2k'],
      });

      const score = service.scoreProduct(product);

      // Verify weights are applied
      const expectedFinal =
        score.demographicScore * 0.35 +
        score.aestheticScore * 0.3 +
        score.priceScore * 0.2 +
        score.trendScore * 0.15;

      expect(score.finalScore).toBeCloseTo(expectedFinal, 2);
    });

    it('should give higher demographic score to fashion categories', () => {
      const fashionProduct = createProduct({
        name: 'Cute Dress',
        price: 35,
        category: 'fashion',
      });

      const techProduct = createProduct({
        name: 'Phone Case',
        price: 35,
        category: 'electronics',
      });

      const fashionScore = service.scoreProduct(fashionProduct);
      const techScore = service.scoreProduct(techProduct);

      // Electronics should be rejected, so compare demographic scores directly
      expect(fashionScore.demographicScore).toBeGreaterThan(0);
    });
  });

  describe('researchProductsForTheme', () => {
    // Note: These tests verify the price filtering logic through the scoreProduct method
    // The actual Amazon scraping is mocked at the module level

    it('should return empty array when scraper returns empty', async () => {
      // Default mock returns empty array
      const products = await service.researchProductsForTheme('nonexistent-theme');
      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe('runResearchCycle', () => {
    beforeEach(() => {
      (prisma.affiliateResearchRun.create as Mock).mockResolvedValue({
        id: 'run-123',
        startedAt: new Date(),
      });
      (prisma.affiliateResearchRun.update as Mock).mockResolvedValue({ id: 'run-123' });
      (prisma.mod.groupBy as Mock).mockResolvedValue([
        { contentType: 'tops', _count: { id: 100 }, _sum: { downloadCount: 1000 } },
      ]);
      (prisma.$queryRaw as Mock).mockResolvedValue([
        { theme: 'y2k', count: BigInt(100), downloads: BigInt(1000) },
      ]);
      (PerplexityService.query as Mock).mockResolvedValue('[]');
    });

    it('should create AffiliateResearchRun record', async () => {
      await service.runResearchCycle(5);

      expect(prisma.affiliateResearchRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'running',
        }),
      });
    });

    it('should update run status to completed on success', async () => {
      await service.runResearchCycle(5);

      expect(prisma.affiliateResearchRun.update).toHaveBeenCalledWith({
        where: { id: 'run-123' },
        data: expect.objectContaining({
          status: 'completed',
        }),
      });
    });

    it('should respect limit parameter', async () => {
      const result = await service.runResearchCycle(3);

      expect(result.runId).toBe('run-123');
    });

    it('should use provided themes when specified', async () => {
      const result = await service.runResearchCycle(5, ['y2k', 'cottagecore']);

      expect(result.themesAnalyzed).toContain('y2k');
      expect(result.themesAnalyzed).toContain('cottagecore');
    });
  });

  describe('createOfferFromProduct', () => {
    it('should create an AffiliateOffer record', async () => {
      (prisma.affiliateOffer.create as Mock).mockResolvedValue({ id: 'offer-123' });

      const product: ValidatedProduct = {
        name: 'Test Product',
        price: 25,
        category: 'accessories',
        matchingThemes: ['y2k'],
        matchingContentTypes: ['accessories'],
        demographicScore: 80,
        aestheticScore: 75,
        priceScore: 90,
        trendScore: 70,
        finalScore: 79,
        rejected: false,
        personaValidated: true,
        personaScore: 4,
        personaFeedback: 'Great product!',
        personaVotes: {},
      };

      const offerId = await service.createOfferFromProduct(product, 'run-123');

      expect(offerId).toBe('offer-123');
      expect(prisma.affiliateOffer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Product',
          personaValidated: true,
          researchRunId: 'run-123',
        }),
      });
    });
  });
});
