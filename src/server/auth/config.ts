// File: auth.config.ts

import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "../firebase"; // Make sure this path is correct
import { doc, getDoc } from "firebase/firestore";
import type { Judge } from "../../types/types"; // Make sure this path is correct

// Define and export the configuration object directly
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        judgeId: { label: "Judge ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.judgeId || typeof credentials.judgeId !== "string") {
          return null;
        }

        const judgeRef = doc(db, "judges", credentials.judgeId);
        const judgeSnap = await getDoc(judgeRef);

        if (judgeSnap.exists()) {
          const judgeData = judgeSnap.data() as Omit<Judge, "id">;
          // Return user object if judge is found
          return { id: judgeSnap.id, name: judgeData.name };
        }

        // Return null if judge is not found
        return null;
      },
    }),
  ],
  callbacks: {
    // This JWT callback attaches the user's ID to the token
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // This session callback attaches the user's ID to the session object
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Redirect users to your homepage for login
  },
} satisfies NextAuthConfig; // Using "satisfies" provides type-safety
