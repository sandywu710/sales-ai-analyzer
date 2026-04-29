import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales AI Analyzer — 電銷戰情室",
  description: "AI 驅動的銷售邀約電話分析平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.className} bg-[#050d1a] text-white antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
