import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/MobileChrome";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-pfc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PFC Club",
  description: "Personal Finance Club — quản lý câu lạc bộ (mobile)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={plusJakarta.variable}>
      <body className={plusJakarta.className}>
        <a className="skip-link" href="#main-content">
          Bỏ qua đến nội dung chính
        </a>
        <div className="phone-shell">
          <div className="phone-frame">
            <div className="phone-scroll" id="main-content">
              {children}
            </div>
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  );
}
