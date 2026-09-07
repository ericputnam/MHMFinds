import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import PatreonProvider from "next-auth/providers/patreon";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  fetchPatreonMembership,
  isPatreonProviderConfigured,
  qualifiesForMembership,
  PATREON_SCOPE,
  PATREON_USERINFO_URL,
} from "@/lib/membership";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Membership via Patreon OAuth (B2, Rio 2026-09-07). Registered ONLY when
    // NEXT_PUBLIC_MEMBERSHIP_ENABLED=1 and PATREON_CLIENT_ID/SECRET exist —
    // with the flag off this spread is empty and auth is byte-for-byte the
    // same as before. See lib/membership.ts and the operator-queue package.
    ...(isPatreonProviderConfigured()
      ? [
          PatreonProvider({
            clientId: process.env.PATREON_CLIENT_ID!,
            clientSecret: process.env.PATREON_CLIENT_SECRET!,
            authorization: { params: { scope: PATREON_SCOPE } },
            // The provider default is the deprecated v1 `current_user`; use v2.
            userinfo: { url: PATREON_USERINFO_URL },
            profile(profile: any) {
              return {
                id: profile?.data?.id,
                name: profile?.data?.attributes?.full_name ?? null,
                email: profile?.data?.attributes?.email ?? null,
                image: profile?.data?.attributes?.image_url ?? null,
              };
            },
            // Patreon verifies emails. Linking by email lets an existing
            // (credentials) account connect Patreon and receive member status
            // instead of erroring with OAuthAccountNotLinked — which is what
            // the signIn callback's pre-create below would otherwise cause.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
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

        // Check for admin login with env vars
        const adminUsername = process.env.ADMIN_USERNAME || 'adminuser45';
        const adminEmail = `${adminUsername}@admin.local`;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (credentials.email === adminEmail && adminPassword && credentials.password === adminPassword) {
          // Admin login with environment variables
          let adminUser = await prisma.user.findUnique({
            where: { email: adminEmail }
          });

          // Create admin user if doesn't exist
          if (!adminUser) {
            adminUser = await prisma.user.create({
              data: {
                email: adminEmail,
                username: adminUsername,
                displayName: 'Administrator',
                isAdmin: true,
                isPremium: true,
                emailVerified: new Date(),
              }
            });
          } else if (!adminUser.isAdmin) {
            // Update to admin if not already
            adminUser = await prisma.user.update({
              where: { id: adminUser.id },
              data: { isAdmin: true }
            });
          }

          return {
            id: adminUser.id,
            email: adminUser.email,
            username: adminUser.username,
            isAdmin: adminUser.isAdmin,
            isCreator: adminUser.isCreator,
            isPremium: adminUser.isPremium,
          };
        }

        // Regular user login with database credentials
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.isCreator = user.isCreator;
        token.isPremium = user.isPremium;
        token.isAdmin = user.isAdmin;
      }

      // Membership via Patreon OAuth: on a Patreon sign-in, ask Patreon whether
      // this person is an active patron and persist it as `isPremium`. Runs
      // only when the Patreon provider is registered (flag on). A Patreon API
      // failure returns null and leaves the existing status untouched — it
      // never blocks sign-in.
      if (account?.provider === 'patreon' && account.access_token && token.id) {
        try {
          const membership = await fetchPatreonMembership(account.access_token);
          if (membership) {
            const isPremium = qualifiesForMembership(membership);
            await prisma.user.update({
              where: { id: token.id as string },
              data: { isPremium },
            });
            token.isPremium = isPremium;
          }
        } catch (error) {
          console.error('[membership] Patreon membership check failed:', error);
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
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

      // Create subscription record for new users
      await prisma.subscription.create({
        data: {
          userId: user.id,
          isPremium: false,
          clickLimit: 5,
          lifetimeClicksUsed: 0,
          status: 'ACTIVE'
        }
      });
    },
  },
};
