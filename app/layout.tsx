import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const title = "ChatSyn — Easy-to-Deploy, ROI-Driven Voice AI";
const description =
  "Pre-trained, no-code voice AI agents for sales, support, and internal ops — live in days, not months. Deploy free for 14 days.";

export const metadata: Metadata = {
  metadataBase: new URL("https://chatsyn.io"),
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/og-image.png", width: 2000, height: 1050, alt: title }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={jakarta.variable}>
      <body>
        {children}
        <AnalyticsScripts />
      </body>
    </html>
  );
}
