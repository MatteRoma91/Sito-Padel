import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteConfig } from "@/lib/db/queries";
import { getBaseUrl, buildMetadata, SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seo";
import { RegisterPWA } from "@/components/pwa/RegisterPWA";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: true });

export async function generateMetadata(): Promise<Metadata> {
  const config = getSiteConfig();
  const tourName = config.text_tour_name || SITE_NAME;
  const base = buildMetadata({
    title: tourName,
    description: DEFAULT_DESCRIPTION,
    tourName,
  });
  return {
    ...base,
    applicationName: tourName,
    appleWebApp: { capable: true, statusBarStyle: "default", title: tourName },
    icons: {
      icon: "/logo.png",
      apple: "/logo.png",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#162079",
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

function JsonLdSchema({ baseUrl, tourName }: { baseUrl: string; tourName: string }) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: tourName,
    url: baseUrl,
    description: DEFAULT_DESCRIPTION,
    logo: `${baseUrl}/logo.png`,
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: tourName,
    url: baseUrl,
    description: DEFAULT_DESCRIPTION,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = getSiteConfig();
  const configCss = buildConfigCss(config);
  const tourName = config.text_tour_name || SITE_NAME;
  const baseUrl = getBaseUrl();
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} antialiased min-h-screen bg-[var(--background)]`}>
        <JsonLdSchema baseUrl={baseUrl} tourName={tourName} />
        {configCss && (
          <style dangerouslySetInnerHTML={{ __html: configCss }} />
        )}
        {children}
        <RegisterPWA />
      </body>
    </html>
  );
}
