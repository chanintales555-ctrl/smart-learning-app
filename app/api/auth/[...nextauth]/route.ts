import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateUser, registerUser } from '@/lib/userStore';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-google-client-secret',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'User ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            return null;
          }
          const user = await authenticateUser(credentials.username, credentials.password);
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
            };
          }
          return null;
        } catch (error) {
          console.error('Login Error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          await registerUser({
            userId: user.email || user.name || 'google_user',
            name: user.name || user.email || 'Google User',
            email: user.email || '-',
            password: 'Google_Account',
            isGoogleOAuth: true,
          });
          return true;
        } catch (error) {
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id || user.name || user.email;
        token.name = user.name || user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string) || session.user.name;
        session.user.email = (token.email as string) || session.user.email;
        (session.user as any).id = (token.uid as string) || (token.name as string) || session.user.name;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'nj-tutor-academy-secret-key-2026',
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };