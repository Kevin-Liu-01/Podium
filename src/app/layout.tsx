import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Podium",
  description: "Hackathon Judging Platform designed for HackPrinceton",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-zinc-950 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
