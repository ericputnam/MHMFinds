/**
 * POST /api/affiliates/validate - Validate products through persona swarm
 *
 * PRD: Affiliate Research Agent System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { personaSwarmService } from '@/lib/services/personaSwarmService';

interface ValidateRequest {
  products: Array<{
    name: string;
    price: number;
    category: string;
    description?: string;
    imageUrl?: string;
  }>;
}

export async function POST(request: NextRequest) {
  // Require admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ValidateRequest = await request.json();
    const { products } = body;

    // Validate input
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided. Send an array of products to validate.' },
        { status: 400 }
      );
    }

    if (products.length > 20) {
      return NextResponse.json(
        { error: 'Too many products. Maximum 20 products per request.' },
        { status: 400 }
      );
    }

    // Validate each product
    for (const product of products) {
      if (!product.name || typeof product.price !== 'number' || !product.category) {
        return NextResponse.json(
          { error: 'Each product must have name, price (number), and category' },
          { status: 400 }
        );
      }
    }

    const results = await personaSwarmService.batchValidate(products);

    // Separate passed and failed
    const passed = results.filter((r) => r.passed);
    const failed = results.filter((r) => !r.passed);

    return NextResponse.json({
      success: true,
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      results: results.map((r) => ({
        product: r.productName,
        passed: r.passed,
        approvalCount: r.approvalCount,
        summary: r.summary,
        votes: r.votes,
      })),
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed', details: String(error) },
      { status: 500 }
    );
  }
}
