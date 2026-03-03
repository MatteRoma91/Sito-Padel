import type { ReactNode } from 'react';

interface SimpleTableProps {
  headers: ReactNode[];
  children: ReactNode;
  caption?: string;
}

export function SimpleTable({ headers, children, caption }: SimpleTableProps) {
  return (
    <div className="overflow-x-auto -mx-1 sm:mx-0">
      <table className="w-full text-sm min-w-[520px]">
        {caption && (
          <caption className="text-left text-xs text-slate-600 dark:text-slate-400 mb-2">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="border-b border-primary-200 dark:border-primary-600">
            {headers.map((h, idx) => (
              <th
                key={idx}
                scope="col"
                className="text-left py-2 px-2 font-medium text-slate-700 dark:text-slate-300"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

