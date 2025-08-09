import type { Metadata } from "next";
import "./globals.css";
import { App } from 'antd';
import { WarningSupressor } from '@/components/WarningSupressor';

export const metadata: Metadata = {
  title: "ProjectDuck",
  description: "A file browser and document viewer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <WarningSupressor />
        <App>
          {children}
        </App>
      </body>
    </html>
  );
}
