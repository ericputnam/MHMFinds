import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, isCreator } = body;

    // Validate input
    if (!email || !password || !username) {
      return NextResponse.json(
        { message: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate username (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { message: 'Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return NextResponse.json(
        { message: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash password OUTSIDE transaction to avoid timeout
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user, account, subscription, and collection in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username,
          displayName: username,
          isAdmin: false,
          isPremium: false,
          isCreator: isCreator || false,
          emailVerified: new Date(), // Auto-verify for credentials signup
        }
      });

      // Create credentials account with hashed password in id_token field
      await tx.account.create({
        data: {
          userId: newUser.id,
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: newUser.id,
          id_token: hashedPassword, // Store hashed password here
        }
      });

      // Create default subscription (5 free downloads)
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          isPremium: false,
          clickLimit: 5,
          lifetimeClicksUsed: 0,
          status: 'ACTIVE'
        }
      });

      // Create default "Favorites" collection
      await tx.collection.create({
        data: {
          userId: newUser.id,
          name: "Favorites",
          description: "Your favorite mods",
          isPublic: false,
        }
      });

      return newUser;
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 15000, // Maximum time the transaction can run (15s)
    });

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'An error occurred during signup. Please try again.' },
      { status: 500 }
    );
  }
}
