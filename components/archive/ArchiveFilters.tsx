'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface ArchiveFiltersProps {
  currentYear?: string;
  currentMonth?: string;
  currentName?: string;
  years: string[];
}

const months = [
  { value: '01', label: 'Gennaio' },
  { value: '02', label: 'Febbraio' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Aprile' },
  { value: '05', label: 'Maggio' },
  { value: '06', label: 'Giugno' },
  { value: '07', label: 'Luglio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Settembre' },
  { value: '10', label: 'Ottobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Dicembre' },
];

export function ArchiveFilters({ currentYear, currentMonth, currentName, years }: ArchiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(currentName || '');

  const updateFilters = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/archive?${params.toString()}`);
  }, [router, searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ name: name || undefined });
  }

  function clearFilters() {
    setName('');
    router.push('/archive');
  }

  const hasFilters = currentYear || currentMonth || currentName;

  return (
    <div className="card p-4 space-y-4">
      {/* Search by name */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            placeholder="Cerca per nome..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Cerca
        </button>
      </form>

      {/* Year and month filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={currentYear || ''}
          onChange={(e) => updateFilters({ year: e.target.value || undefined })}
          className="input w-auto"
        >
          <option value="">Tutti gli anni</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={currentMonth || ''}
          onChange={(e) => updateFilters({ month: e.target.value || undefined })}
          className="input w-auto"
        >
          <option value="">Tutti i mesi</option>
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-secondary flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Rimuovi filtri
          </button>
        )}
      </div>
    </div>
  );
}
