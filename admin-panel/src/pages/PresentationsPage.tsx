import { useEffect, useState, useCallback } from 'react';
import { Trash2, RefreshCw, Download } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/Badge';
import type { Presentation } from '../api/presentations';
import { listPresentations, deletePresentation } from '../api/presentations';

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const STATUS_OPTIONS = ['', 'ready', 'presenting', 'uploading', 'converting', 'downloading', 'error'];

export const PresentationsPage = () => {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Presentation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPresentations(await listPresentations({ status: statusFilter || undefined, search: search || undefined }));
    } catch {
      setPresentations([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try { await deletePresentation(target.id); setTarget(null); load(); }
    catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  const columns: Column<Presentation>[] = [
    {
      key: 'title', label: 'Title', sortable: true,
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: p.extension === '.pdf' ? 'var(--rose-dim)' : 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700,
            color: p.extension === '.pdf' ? 'var(--rose)' : 'var(--accent-light)',
          }}>
            {p.extension?.replace('.', '').toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {p.title}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatBytes(p.file_size)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'uploaded_by', label: 'Uploaded By',
      render: (p) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
          {p.uploaded_by?.username ?? '—'}
        </span>
      ),
    },
    {
      key: 'uploaded_at', label: 'Date', sortable: true,
      render: (p) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(p.uploaded_at)}</span>,
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Presentations</h1>
          <p className="page-subtitle">View and manage all uploaded presentation files</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          id="status-filter"
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 180, cursor: 'pointer' }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={presentations}
        keyExtractor={(p) => p.id}
        loading={loading}
        searchable
        searchPlaceholder="Search presentations…"
        searchValue={search}
        onSearch={setSearch}
        emptyMessage="No presentations found."
        actions={(p) => (
          <>
            {p.download_url && (
              <a
                href={p.download_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-icon"
                title="Download"
                style={{ color: 'var(--teal)' }}
              >
                <Download size={15} />
              </a>
            )}
            <button
              id={`delete-presentation-${p.id}`}
              className="btn btn-ghost btn-icon"
              title="Delete"
              onClick={() => setTarget(p)}
              style={{ color: 'var(--rose)' }}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Presentation"
        message={`Are you sure you want to permanently delete "${target?.title}"? All associated files will be removed.`}
      />
    </div>
  );
};
