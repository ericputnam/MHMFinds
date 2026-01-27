import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth before importing routes
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock services
vi.mock('@/lib/services/affiliateResearchService', () => ({
  affiliateResearchService: {
    runResearchCycle: vi.fn(),
  },
}));

vi.mock('@/lib/services/personaSwarmService', () => ({
  personaSwarmService: {
    batchValidate: vi.fn(),
    chatWithPersona: vi.fn(),
    getPersonas: vi.fn().mockReturnValue([
      { id: 'emily', name: 'Emily', age: 25, location: 'Ohio, USA', aesthetic: 'Cottagecore/Modern', priceRange: { min: 20, max: 60 } },
      { id: 'sofia', name: 'Sofia', age: 22, location: 'São Paulo, Brazil', aesthetic: 'Y2K/Trendy', priceRange: { min: 10, max: 35 } },
      { id: 'luna', name: 'Luna', age: 28, location: 'London, UK', aesthetic: 'Goth/Alternative', priceRange: { min: 30, max: 80 } },
      { id: 'mia', name: 'Mia', age: 19, location: 'Texas, USA', aesthetic: 'Budget Student', priceRange: { min: 5, max: 25 } },
      { id: 'claire', name: 'Claire', age: 32, location: 'Toronto, Canada', aesthetic: 'Professional/Minimalist', priceRange: { min: 40, max: 150 } },
    ]),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    affiliateOffer: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    affiliateResearchRun: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { affiliateResearchService } from '@/lib/services/affiliateResearchService';
import { personaSwarmService } from '@/lib/services/personaSwarmService';

describe('Affiliate API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/affiliates/research', () => {
    it('should require admin authentication', async () => {
      (getServerSession as Mock).mockResolvedValue(null);

      const { POST } = await import('@/app/api/affiliates/research/route');
      const request = new NextRequest('http://localhost/api/affiliates/research', {
        method: 'POST',
        body: JSON.stringify({ limit: 5 }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 401 for non-admin users', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: false },
      });

      const { POST } = await import('@/app/api/affiliates/research/route');
      const request = new NextRequest('http://localhost/api/affiliates/research', {
        method: 'POST',
        body: JSON.stringify({ limit: 5 }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should trigger research cycle for admin users', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      (affiliateResearchService.runResearchCycle as Mock).mockResolvedValue({
        runId: 'run-123',
        productsFound: 25,
        productsValidated: 25,
        offersCreated: 8,
        themesAnalyzed: ['y2k'],
        summary: '8/25 products passed',
      });

      const { POST } = await import('@/app/api/affiliates/research/route');
      const request = new NextRequest('http://localhost/api/affiliates/research', {
        method: 'POST',
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.runId).toBe('run-123');
    });

    it('should validate limit parameter', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { POST } = await import('@/app/api/affiliates/research/route');
      const request = new NextRequest('http://localhost/api/affiliates/research', {
        method: 'POST',
        body: JSON.stringify({ limit: 100 }), // Over max of 50
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should accept optional themes parameter', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      (affiliateResearchService.runResearchCycle as Mock).mockResolvedValue({
        runId: 'run-123',
        productsFound: 10,
        productsValidated: 10,
        offersCreated: 5,
        themesAnalyzed: ['y2k', 'cottagecore'],
        summary: '5/10 products passed',
      });

      const { POST } = await import('@/app/api/affiliates/research/route');
      const request = new NextRequest('http://localhost/api/affiliates/research', {
        method: 'POST',
        body: JSON.stringify({ limit: 5, themes: ['y2k', 'cottagecore'] }),
      });

      await POST(request);

      expect(affiliateResearchService.runResearchCycle).toHaveBeenCalledWith(5, ['y2k', 'cottagecore']);
    });
  });

  describe('POST /api/affiliates/validate', () => {
    it('should validate products through persona swarm', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      (personaSwarmService.batchValidate as Mock).mockResolvedValue([
        {
          productName: 'Test Product',
          passed: true,
          approvalCount: 4,
          summary: 'Approved by 4/5 personas',
          votes: {},
        },
      ]);

      const { POST } = await import('@/app/api/affiliates/validate/route');
      const request = new NextRequest('http://localhost/api/affiliates/validate', {
        method: 'POST',
        body: JSON.stringify({
          products: [{ name: 'Test Product', price: 25, category: 'accessories' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.passed).toBe(1);
    });

    it('should return 400 for empty products array', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { POST } = await import('@/app/api/affiliates/validate/route');
      const request = new NextRequest('http://localhost/api/affiliates/validate', {
        method: 'POST',
        body: JSON.stringify({ products: [] }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing required product fields', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { POST } = await import('@/app/api/affiliates/validate/route');
      const request = new NextRequest('http://localhost/api/affiliates/validate', {
        method: 'POST',
        body: JSON.stringify({
          products: [{ name: 'Test Product' }], // Missing price and category
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should limit products to 20 per request', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const products = Array(25).fill({ name: 'Product', price: 20, category: 'accessories' });

      const { POST } = await import('@/app/api/affiliates/validate/route');
      const request = new NextRequest('http://localhost/api/affiliates/validate', {
        method: 'POST',
        body: JSON.stringify({ products }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/affiliates/persona-chat', () => {
    it('should chat with valid persona', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      (personaSwarmService.chatWithPersona as Mock).mockResolvedValue('Omg yes! This is so cute!');

      const { POST } = await import('@/app/api/affiliates/persona-chat/route');
      const request = new NextRequest('http://localhost/api/affiliates/persona-chat', {
        method: 'POST',
        body: JSON.stringify({
          persona: 'emily',
          message: 'What do you think of fairy lights?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.persona).toBe('emily');
      expect(data.response).toContain('cute');
    });

    it('should return 400 for invalid persona', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { POST } = await import('@/app/api/affiliates/persona-chat/route');
      const request = new NextRequest('http://localhost/api/affiliates/persona-chat', {
        method: 'POST',
        body: JSON.stringify({
          persona: 'invalid_persona',
          message: 'Hello',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty message', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { POST } = await import('@/app/api/affiliates/persona-chat/route');
      const request = new NextRequest('http://localhost/api/affiliates/persona-chat', {
        method: 'POST',
        body: JSON.stringify({
          persona: 'emily',
          message: '',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should limit message length to 1000 characters', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { POST } = await import('@/app/api/affiliates/persona-chat/route');
      const request = new NextRequest('http://localhost/api/affiliates/persona-chat', {
        method: 'POST',
        body: JSON.stringify({
          persona: 'emily',
          message: 'x'.repeat(1001),
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('GET should return list of available personas', async () => {
      const { GET } = await import('@/app/api/affiliates/persona-chat/route');
      const response = await GET();
      const data = await response.json();

      expect(data.personas).toHaveLength(5);
      expect(data.personas.map((p: { id: string }) => p.id)).toEqual([
        'emily',
        'sofia',
        'luna',
        'mia',
        'claire',
      ]);
    });
  });

  describe('GET /api/affiliates/performance', () => {
    it('should require admin authentication', async () => {
      (getServerSession as Mock).mockResolvedValue(null);

      const { GET } = await import('@/app/api/affiliates/performance/route');
      const request = new NextRequest('http://localhost/api/affiliates/performance?days=30');

      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return performance metrics', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { GET } = await import('@/app/api/affiliates/performance/route');
      const request = new NextRequest('http://localhost/api/affiliates/performance?days=30');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBeDefined();
      expect(data.overall).toBeDefined();
      expect(data.personaValidation).toBeDefined();
    });

    it('should validate days parameter', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { GET } = await import('@/app/api/affiliates/performance/route');
      const request = new NextRequest('http://localhost/api/affiliates/performance?days=500');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should include persona validation comparison', async () => {
      (getServerSession as Mock).mockResolvedValue({
        user: { isAdmin: true },
      });

      const { GET } = await import('@/app/api/affiliates/performance/route');
      const request = new NextRequest('http://localhost/api/affiliates/performance?days=30');

      const response = await GET(request);
      const data = await response.json();

      expect(data.personaValidation.validatedCount).toBeDefined();
      expect(data.personaValidation.nonValidatedCount).toBeDefined();
      expect(data.personaValidation.ctrImprovement).toBeDefined();
      expect(data.personaValidation.convRateImprovement).toBeDefined();
    });
  });
});
