import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JLUG | Where Culture Meets Code",
  description: "JEC Linux Users Group. A digital clubhouse for students who build things.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased bg-jlug-black text-jlug-white selection:bg-jlug-accent selection:text-jlug-black`}
    >
      <body className="min-h-full flex flex-col font-sans bg-jlug-black text-jlug-white">{children}</body>
    </html>
  );
}
