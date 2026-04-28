import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

const SITE_URL = "https://podium-hackprinceton.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Podium — Hackathon Judging Platform",
    template: "%s | Podium",
  },
  description:
    "Podium is a hackathon judging platform designed for HackPrinceton. Streamline project submissions, judge assignments, and scoring.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Podium",
    title: "Podium — Hackathon Judging Platform",
    description:
      "Podium is a hackathon judging platform designed for HackPrinceton. Streamline project submissions, judge assignments, and scoring.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Podium — Hackathon Judging Platform for HackPrinceton",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@hackprinceton",
    creator: "@kevskgs",
    title: "Podium — Hackathon Judging Platform",
    description:
      "Podium is a hackathon judging platform designed for HackPrinceton. Streamline project submissions, judge assignments, and scoring.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
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
      <body className="bg-zinc-950 ">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
