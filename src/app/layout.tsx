import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Lunch OS - ระบบบริหารจัดการอาหารกลางวันโรงเรียน",
  description: "ระบบวางแผนเมนู ตรวจรับวัตถุดิบตอนเช้า และบันทึกบัญชีรายรับ-รายจ่ายอาหารกลางวัน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
