import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/MobileChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "PFC Club",
  description: "Personal Finance Club — quản lý câu lạc bộ (mobile)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <div className="phone-shell">
          <div className="phone-frame">
            <div className="phone-scroll">{children}</div>
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  );
}
