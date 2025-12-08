import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username?: string;
      isCreator?: boolean;
      isPremium?: boolean;
      isAdmin?: boolean;
      hasStripeSubscription?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username?: string;
    isCreator?: boolean;
    isPremium?: boolean;
    isAdmin?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username?: string;
    isCreator?: boolean;
    isPremium?: boolean;
    isAdmin?: boolean;
    hasStripeSubscription?: boolean;
  }
}
