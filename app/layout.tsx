import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteConfig } from "@/lib/db/queries";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Banana Padel Tour",
  description: "Gestione tornei di padel",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function buildConfigCss(config: Record<string, string>): string {
  const vars: string[] = [];
  const colorKeys = [
    'accent_50', 'accent_100', 'accent_200', 'accent_300', 'accent_400',
    'accent_500', 'accent_600', 'accent_700', 'accent_800', 'accent_900',
    'primary_50', 'primary_100', 'primary_200', 'primary_300', 'primary_400',
    'primary_500', 'primary_600', 'primary_700', 'primary_800', 'primary_900',
  ];
  for (const k of colorKeys) {
    const key = `color_${k}`;
    const cssKey = k.replace(/_/g, '-');
    const val = config[key];
    if (val && /^#[0-9A-Fa-f]{6}$/.test(val)) {
      vars.push(`--${cssKey}: ${val}`);
    }
  }
  return vars.length > 0 ? `:root { ${vars.join('; ')} }` : '';
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = getSiteConfig();
  const configCss = buildConfigCss(config);
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} antialiased min-h-screen bg-[var(--background)]`}>
        {configCss && (
          <style dangerouslySetInnerHTML={{ __html: configCss }} />
        )}
        {children}
      </body>
    </html>
  );
}
