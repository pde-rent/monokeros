import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { ThemeProvider } from "@/components/layout/theme-provider";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "MonokerOS",
  description: "AI Agency Operating System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${silkscreen.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface text-fg antialiased">
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
