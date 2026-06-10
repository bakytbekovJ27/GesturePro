import { useEffect, useState } from 'react';
import { Users, Monitor, Presentation, CheckCircle, Activity, Clock, AlertCircle } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/Badge';
import { getStats } from '../api/stats';
import type { DashboardStats } from '../api/stats';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.8125rem',
    }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{payload[0].value}</p>
    </div>
  );
};

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch {
      setError('Failed to load dashboard stats. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const chartData = stats
    ? Object.entries(stats.presentation_status_counts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back — here's what's happening in GesturePro</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setLoading(true); setError(''); load(); }}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : <Activity size={14} />}
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px 20px', borderRadius: 12, marginBottom: 24,
          background: 'var(--rose-dim)', border: '1px solid rgba(244,63,94,0.2)',
          color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          label="Total Users"
          value={loading ? '—' : stats?.total_users ?? 0}
          icon={Users}
          color="accent"
          sub="Registered accounts"
        />
        <StatsCard
          label="Active Sessions"
          value={loading ? '—' : stats?.active_sessions ?? 0}
          icon={Monitor}
          color="emerald"
          sub={`of ${stats?.total_sessions ?? '—'} total`}
        />
        <StatsCard
          label="Presentations"
          value={loading ? '—' : stats?.total_presentations ?? 0}
          icon={Presentation}
          color="teal"
          sub="All uploaded files"
        />
        <StatsCard
          label="Ready"
          value={loading ? '—' : stats?.presentation_status_counts?.ready ?? 0}
          icon={CheckCircle}
          color="emerald"
          sub="Ready to present"
        />
      </div>

      {/* Chart + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Status Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: 20 }}>Presentation Statuses</h3>
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : chartData.length === 0 ? (
            <div className="empty-state" style={{ height: 220 }}>
              <Presentation size={36} />
              <p>No presentations yet</p>
            </div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={32}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false} tickLine={false} allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Stats Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: 20 }}>Status Breakdown</h3>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(stats?.presentation_status_counts ?? {}).map(([key, count], i) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--glass-bg)', borderRadius: 10,
                  border: '1px solid var(--glass-border)',
                }}>
                  <StatusBadge status={key} />
                  <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Presentations */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3>Recent Activity</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} /> Last 10 uploads
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        ) : !stats?.recent_presentations?.length ? (
          <div className="empty-state">
            <Presentation size={36} />
            <p>No recent activity</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recent_presentations.map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--glass-bg)', borderRadius: 10,
                border: '1px solid var(--glass-border)',
                gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: p.extension === '.pdf' ? 'var(--rose-dim)' : 'var(--accent-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 700,
                  color: p.extension === '.pdf' ? 'var(--rose)' : 'var(--accent-light)',
                  border: `1px solid ${p.extension === '.pdf' ? 'rgba(244,63,94,0.2)' : 'var(--accent-dim)'}`,
                }}>
                  {p.extension?.replace('.', '').toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    by {p.uploaded_by?.username ?? 'Unknown'} · {formatBytes(p.file_size)}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <StatusBadge status={p.status} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(p.uploaded_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
