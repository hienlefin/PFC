import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PFC Marketplace",
  description: "Sản phẩm & dịch vụ chất lượng cho hành trình phát triển của bạn",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <div className="phone-shell">
          <div className="phone-frame">{children}</div>
        </div>
      </body>
    </html>
  );
}
