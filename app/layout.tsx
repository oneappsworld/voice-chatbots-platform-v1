import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Chatbots Platform — Easy-to-Deploy, ROI-Driven Voice AI",
  description:
    "Pre-trained, no-code voice AI agents for sales, support, and internal ops. Live in days, not months. Starting at $500/month with a 14-day free trial.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
