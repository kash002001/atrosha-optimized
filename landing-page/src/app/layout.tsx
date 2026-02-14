import type { Metadata } from "next";
import { Inter, Playfair_Display, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const mono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono", // Hijacking the variable name to match globals.css
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atrosha — Autonomous Agent Security",
  description: "The security layer for the agentic economy. AI agents make financial decisions. Atrosha blocks the risky ones in real-time.",
  keywords: ["AI security", "agent safety", "financial AI", "autonomous agents", "spend limits"],
  openGraph: {
    title: "Atrosha — Code hallucinates. Capital shouldn't.",
    description: "The essential security layer for AI agents making financial decisions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // default to light mode. only go dark if user explicitly toggled it.
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${mono.variable} font-sans bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark antialiased transition-colors duration-300`}>
        {children}
      </body>
    </html>
  );
}
