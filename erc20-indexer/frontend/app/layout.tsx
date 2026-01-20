import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";

export const metadata: Metadata = {
  title: "ERC20 Transfer Indexer",
  description: "View your ERC20 token transfer history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
