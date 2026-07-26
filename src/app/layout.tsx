import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "卡路里追蹤 | 智慧飲食管理",
  description: "AI 拍照辨識食物，自動估算卡路里與營養素。支援品牌餐廳查詢、比例尺估量、每日目標追蹤。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = 'light';
                const local = localStorage.getItem('food-calories-settings');
                if (local) {
                  const settings = JSON.parse(local);
                  if (settings.theme) theme = settings.theme;
                }
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <Toaster position="top-center" toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--neu-raised)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
          }
        }}/>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
