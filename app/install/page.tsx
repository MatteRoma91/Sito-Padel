import { buildMetadata, getBaseUrl } from '@/lib/seo';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Apple, Smartphone, Share2, Plus, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Installa Banana Padel Tour | iPhone e Android',
    description:
      'Scarica e installa l\'app Banana Padel Tour su iPhone o Android. Aggiungi tornei, classifiche e calendario alla schermata Home.',
    path: '/install',
  }),
};

/** Evita prerender statico in build (conflitto SSR su chunk Toast/React in Next 16). */
export const dynamic = 'force-dynamic';

export default function InstallPage() {
  const baseUrl = getBaseUrl();

  return (
    <div className="min-h-screen p-6 pb-12">
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Installa Banana Padel Tour"
          subtitle="Aggiungi l&apos;app alla schermata Home su iPhone o Android per un accesso più rapido."
          icon={Download}
          breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Installa app' }]}
          className="text-foreground mb-6"
        />

        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Apple className="w-5 h-5 text-foreground/70" />
              iPhone
            </h2>
            <ol className="space-y-5 text-foreground/90">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  1
                </span>
                <div>
                  <p className="font-medium">Apri Safari</p>
                  <p className="text-sm text-foreground/70 mt-0.5">
                    Assicurati di usare Safari (non Chrome o altri browser)
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  2
                </span>
                <div>
                  <p className="font-medium">Tocca il pulsante Condividi</p>
                  <p className="text-sm text-foreground/70 mt-0.5 flex items-center gap-1">
                    <Share2 className="w-4 h-4" />
                    L&apos;icona in basso (quadrato con freccia verso l&apos;alto)
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  3
                </span>
                <div>
                  <p className="font-medium">Seleziona &quot;Aggiungi a Home&quot;</p>
                  <p className="text-sm text-foreground/70 mt-0.5 flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    scorri e trova l&apos;opzione
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  4
                </span>
                <div>
                  <p className="font-medium">Conferma con &quot;Aggiungi&quot;</p>
                  <p className="text-sm text-foreground/70 mt-0.5">
                    L&apos;icona di Banana Padel Tour apparirà sulla schermata Home
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className="card p-6">
            <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-foreground/70" />
              Android
            </h2>
            <ol className="space-y-5 text-foreground/90">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  1
                </span>
                <div>
                  <p className="font-medium">Apri Chrome</p>
                  <p className="text-sm text-foreground/70 mt-0.5">
                    Usa Chrome o il browser predefinito del tuo dispositivo
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  2
                </span>
                <div>
                  <p className="font-medium">Vai su Banana Padel Tour</p>
                  <p className="text-sm text-foreground/70 mt-0.5">
                    Apri {baseUrl.replace(/^https?:\/\//, '')} nel browser
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  3
                </span>
                <div>
                  <p className="font-medium">Tocca il menu (⋮)</p>
                  <p className="text-sm text-foreground/70 mt-0.5">
                    I tre punti in alto a destra
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  4
                </span>
                <div>
                  <p className="font-medium">Seleziona &quot;Aggiungi a schermata Home&quot; o &quot;Installa app&quot;</p>
                  <p className="text-sm text-foreground/70 mt-0.5">
                    Potrebbe apparire anche un banner &quot;Installa&quot; in basso
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-500 font-semibold flex items-center justify-center text-sm">
                  5
                </span>
                <div>
                  <p className="font-medium">Conferma</p>
                  <p className="text-sm text-foreground/70 mt-0.5">
                    L&apos;icona di Banana Padel Tour apparirà nella schermata Home o nel drawer delle app
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className="flex flex-col gap-4">
            <a
              href={baseUrl}
              className="btn btn-primary flex items-center justify-center gap-2 py-4 text-lg"
            >
              Apri Banana Padel Tour e aggiungi a Home
            </a>

            <a
              href={`${baseUrl}/api/install-file`}
              download="banana-padel-tour-install.html"
              className="btn btn-secondary flex items-center justify-center gap-2 py-4"
            >
              <Download className="w-5 h-5" />
              Scarica file installer
            </a>
          </section>

          <p className="text-sm text-foreground/60 text-center">
            Il file installer è una pagina HTML che puoi salvare e aprire in Safari
            per avere sempre a portata di mano le istruzioni.
          </p>

          <div className="text-center">
            <Link
              href="/"
              className="text-accent-500 hover:underline text-sm"
            >
              ← Torna all&apos;app
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
