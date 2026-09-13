import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "PFC Opportunity Hub",
  description: "Tìm – lưu – ứng tuyển cơ hội cùng PFC Digital Hub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${geist.variable} antialiased`}>
        <div className="pfc-phone pb-20">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
