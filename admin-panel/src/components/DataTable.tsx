import React, { useState } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  searchValue?: string;
  loading?: boolean;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
  headerRight?: React.ReactNode;
}

export function DataTable<T>({
  columns, data, keyExtractor,
  searchable, searchPlaceholder = 'Search…', onSearch, searchValue,
  loading, emptyMessage = 'No data found.',
  actions, headerRight,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as any)[sortKey];
    const bv = (b as any)[sortKey];
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div>
      {(searchable || headerRight) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          {searchable ? (
            <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
              <Search size={15} className="search-icon" />
              <input
                id="table-search"
                className="input"
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </div>
          ) : <div />}
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}

      <div className="table-wrapper glass-card" style={{ borderRadius: 12 }}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, cursor: col.sortable ? 'pointer' : undefined }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
              {actions && <th style={{ width: 120 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="skeleton" style={{ height: 18, width: '80%' }} />
                    </td>
                  ))}
                  {actions && <td><div className="skeleton" style={{ height: 18, width: 80 }} /></td>}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)}>
                  <div className="empty-state" style={{ padding: '40px 24px' }}>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={keyExtractor(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && data.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10, textAlign: 'right' }}>
          {data.length} record{data.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
