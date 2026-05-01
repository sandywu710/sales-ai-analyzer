import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WelcomeDialog } from "@/components/welcome-dialog";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales AI Analyzer — 電銷戰情室",
  description: "AI 驅動的銷售邀約電話分析平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.className} bg-[#050d1a] text-white antialiased min-h-screen`}>
        <WelcomeDialog />
        {children}
        <span className="fixed bottom-3 right-4 text-[11px] text-slate-600 pointer-events-none select-none z-50">
          Made by Sandy
        </span>
      </body>
    </html>
  );
}
