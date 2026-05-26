import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { google } from 'googleapis';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const auth = new google.auth.GoogleAuth({
            credentials: {
              client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
              private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });

          const sheets = google.sheets({ version: 'v4', auth });
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A2:E', // อ่านเริ่มที่แถว 2 ข้ามหัวตาราง
          });

          const rows = response.data.values;
          if (!rows) return null;

          const inputUser = credentials?.username?.trim();
          const inputPass = credentials?.password?.trim();

          // ค้นหา User โดยเทียบ Column A (Index 0) และ Column C (Index 2)
          const user = rows.find(row => {
            const dbUser = row[0]?.toString().trim();
            const dbPass = row[2]?.toString().trim();
            
            // Log ออกมาดูเพื่อ Debug (ดูใน Terminal หน้าจอดำ)
            console.log(`Checking DB: [${dbUser}] vs Input: [${inputUser}]`);
            
            return dbUser === inputUser && dbPass === inputPass;
          });

          if (user) {
            return { 
              id: user[0], 
              name: user[3] || user[0], // Column D
              email: user[1]            // Column B
            };
          }
          return null;
        } catch (error) {
          console.error("Login Error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/register`, {
            method: 'POST',
            body: JSON.stringify({ 
              name: user.name, 
              email: user.email,
              password: "Google_Account" 
            }),
            headers: { 'Content-Type': 'application/json' },
          });
          return true;
        } catch (error) {
          return true; 
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };