import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            accounts: {
              where: {
                provider: 'credentials'
              }
            }
          }
        });

        if (!user || !user.accounts || user.accounts.length === 0) {
          return null;
        }

        // Get hashed password from account (stored in id_token field)
        const hashedPassword = user.accounts[0].id_token;
        if (!hashedPassword) {
          return null;
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, hashedPassword);
        if (!isValid) {
          return null;
        }

        // Return user object
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
          isCreator: user.isCreator,
          isPremium: user.isPremium,
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.isCreator = user.isCreator;
        token.isPremium = user.isPremium;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.isCreator = token.isCreator as boolean;
        session.user.isPremium = token.isPremium as boolean;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
    async signIn({ user, account, profile }: any) {
      // Create user profile if it doesn't exist
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              username: user.email.split('@')[0], // Generate username from email
              displayName: user.name || user.email.split('@')[0],
              avatar: user.image,
            },
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  events: {
    async createUser({ user }: any) {
      // Create default collection for new users
      await prisma.collection.create({
        data: {
          userId: user.id,
          name: "Favorites",
          description: "Your favorite mods",
          isPublic: false,
        },
      });
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
