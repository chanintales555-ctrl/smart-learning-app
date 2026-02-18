import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // ส่งข้อมูลไปบันทึกที่ Google Sheets ผ่าน API ที่คุณมีอยู่แล้ว
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
          console.error("Error saving to sheets:", error);
          return true; 
        }
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };