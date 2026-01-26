import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface MatchRequest {
  themes: string[];
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: MatchRequest = await request.json();
    const { themes, limit = 4 } = body;

    if (!themes || !Array.isArray(themes) || themes.length === 0) {
      return NextResponse.json(
        { error: 'themes array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Query active, persona-validated offers with matching themes
    const products = await prisma.affiliateOffer.findMany({
      where: {
        isActive: true,
        personaValidated: true,
        personaScore: {
          gte: 3,
        },
        matchingThemes: {
          hasSome: themes,
        },
      },
      orderBy: [
        { finalScore: 'desc' },
        { personaScore: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error matching affiliate products:', error);
    return NextResponse.json(
      { error: 'Failed to match affiliate products' },
      { status: 500 }
    );
  }
}
