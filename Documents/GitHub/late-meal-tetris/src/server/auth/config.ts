import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Judge } from "../../types/types";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        judgeId: { label: "Judge ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.judgeId) {
          return null;
        }

        const judgeRef = doc(db, "judges", credentials.judgeId);
        const judgeSnap = await getDoc(judgeRef);

        if (judgeSnap.exists()) {
          const judgeData = judgeSnap.data() as Omit<Judge, "id">;
          // Return the user object for the session
          return { id: judgeSnap.id, name: judgeData.name };
        } else {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Redirect users to homepage for login
  },
  secret: process.env.NEXTAUTH_SECRET,
});
