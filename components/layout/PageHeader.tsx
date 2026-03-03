import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type IconType = React.ComponentType<{
  className?: string;
}>;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: IconType;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  backHref,
  backLabel = 'Torna indietro',
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`space-y-3 mb-6 ${className}`}>
      {backHref && (
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-accent-500 dark:hover:text-accent-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg px-1 py-0.5"
            aria-label={backLabel}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Percorso di navigazione"
          className="text-xs text-slate-600 dark:text-slate-300"
        >
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <span className="opacity-60">/</span>}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="hover:text-accent-500 dark:hover:text-accent-400 underline-offset-2 hover:underline"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'font-semibold' : ''}>{item.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-[#0c1451]/40">
                <Icon className="w-5 h-5 text-accent-500" />
              </span>
            )}
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-sm text-slate-700 dark:text-slate-300 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

