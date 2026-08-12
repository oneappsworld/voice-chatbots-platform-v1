import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Voice Chatbots Platform — Easy-to-Deploy, ROI-Driven Voice AI",
  description:
    "Pre-trained, no-code voice AI agents for sales, support, and internal ops. Live in days, not months. Starting at $500/month with a 14-day free trial.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
