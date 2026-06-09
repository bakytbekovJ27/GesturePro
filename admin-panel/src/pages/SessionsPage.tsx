import { useEffect, useState, useCallback } from 'react';
import { MonitorOff, RefreshCw, Filter } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import type { Session } from '../api/sessions';
import { listSessions, deactivateSession } from '../api/sessions';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const SessionsPage = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [target, setTarget] = useState<Session | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSessions(await listSessions(activeOnly)); }
    catch { setSessions([]); }
    finally { setLoading(false); }
  }, [activeOnly]);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async () => {
    if (!target) return;
    setDeactivating(true);
    try { await deactivateSession(target.id); setTarget(null); load(); }
    catch { /* ignore */ }
    finally { setDeactivating(false); }
  };

  const columns: Column<Session>[] = [
    {
      key: 'pin_code', label: 'PIN / Name',
      render: (s) => (
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
            {s.pin_code}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.display_name}</p>
        </div>
      ),
    },
    {
      key: 'is_active', label: 'Status',
      render: (s) => s.is_active
        ? <Badge color="green" dot>Active</Badge>
        : <Badge color="gray" dot>Inactive</Badge>,
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (s) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(s.created_at)}</span>,
    },
    {
      key: 'expires_at', label: 'Expires',
      render: (s) => {
        const expired = new Date(s.expires_at) < new Date();
        return (
          <span style={{ color: expired ? 'var(--rose)' : 'var(--text-muted)', fontSize: '0.8125rem' }}>
            {formatDate(s.expires_at)}
          </span>
        );
      },
    },
    {
      key: 'access_token', label: 'Token',
      render: (s) => (
        <code style={{
          fontSize: '0.7rem', color: 'var(--text-muted)',
          background: 'var(--glass-bg)', padding: '3px 8px', borderRadius: 6,
          fontFamily: 'monospace',
        }}>
          {s.access_token.slice(0, 16)}…
        </code>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Device Sessions</h1>
          <p className="page-subtitle">Monitor and manage all desktop pairing sessions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="filter-active-btn"
            className={`btn btn-sm ${activeOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveOnly((a) => !a)}
          >
            <Filter size={14} /> {activeOnly ? 'All Sessions' : 'Active Only'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyMessage="No sessions found."
        actions={(s) => (
          <button
            id={`deactivate-session-${s.id}`}
            className="btn btn-ghost btn-icon"
            title="Deactivate"
            onClick={() => setTarget(s)}
            disabled={!s.is_active}
            style={{ color: s.is_active ? 'var(--rose)' : 'var(--text-muted)' }}
          >
            <MonitorOff size={15} />
          </button>
        )}
      />

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={handleDeactivate}
        loading={deactivating}
        title="Deactivate Session"
        confirmLabel="Deactivate"
        message={`Are you sure you want to deactivate session "${target?.pin_code}"? The paired device will be disconnected.`}
      />
    </div>
  );
};
