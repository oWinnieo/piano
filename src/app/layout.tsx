import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Piano Lab",
  description: "基于 PixiJS 与 Tone.js 的网页电子钢琴原型。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
