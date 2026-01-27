/**
 * POST /api/affiliates/persona-chat - Chat with a specific persona
 * GET /api/affiliates/persona-chat - List available personas
 *
 * PRD: Affiliate Research Agent System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { personaSwarmService } from '@/lib/services/personaSwarmService';

interface ChatRequest {
  persona: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const VALID_PERSONAS = ['emily', 'sofia', 'luna', 'mia', 'claire'];

export async function POST(request: NextRequest) {
  // Require admin authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ChatRequest = await request.json();
    const { persona, message, history = [] } = body;

    // Validate persona
    if (!persona || !VALID_PERSONAS.includes(persona.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Invalid persona. Choose from: ${VALID_PERSONAS.join(', ')}`,
          validPersonas: VALID_PERSONAS,
        },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1000 characters.' },
        { status: 400 }
      );
    }

    // Validate history
    if (!Array.isArray(history)) {
      return NextResponse.json(
        { error: 'History must be an array' },
        { status: 400 }
      );
    }

    if (history.length > 20) {
      return NextResponse.json(
        { error: 'History too long. Maximum 20 messages.' },
        { status: 400 }
      );
    }

    const response = await personaSwarmService.chatWithPersona(
      persona.toLowerCase(),
      message,
      history
    );

    return NextResponse.json({
      success: true,
      persona: persona.toLowerCase(),
      response,
    });
  } catch (error) {
    console.error('Persona chat error:', error);
    return NextResponse.json(
      { error: 'Chat failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // List of personas - no auth required for this info
  const personas = personaSwarmService.getPersonas();

  return NextResponse.json({
    personas: personas.map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      location: p.location,
      aesthetic: p.aesthetic,
      priceRange: p.priceRange,
    })),
  });
}
