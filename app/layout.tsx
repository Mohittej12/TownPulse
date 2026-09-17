import type { Metadata } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { QuizGameProvider } from "@/context/QuizGameContext";
import { DevToolbar } from "@/components/DevToolbar";

const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "TownPulse",
  description: "Live, gamified engagement for townhalls, meetings, and workshops.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body bg-canvas text-ink antialiased min-h-screen">
        <QuizGameProvider>
          {children}
          <DevToolbar />
        </QuizGameProvider>
      </body>
    </html>
  );
}
