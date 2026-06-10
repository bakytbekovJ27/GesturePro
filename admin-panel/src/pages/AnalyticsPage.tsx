import { BarChart3, TrendingUp, Users, MousePointer, Clock, Smartphone } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';

// Mock data for the analytics shell
const trafficData = [
  { day: 'Mon', sessions: 12, users: 8 },
  { day: 'Tue', sessions: 19, users: 14 },
  { day: 'Wed', sessions: 15, users: 11 },
  { day: 'Thu', sessions: 27, users: 22 },
  { day: 'Fri', sessions: 34, users: 28 },
  { day: 'Sat', sessions: 18, users: 15 },
  { day: 'Sun', sessions: 9, users: 7 },
];

const deviceData = [
  { name: 'Desktop', value: 54, color: '#6366f1' },
  { name: 'Mobile', value: 31, color: '#06b6d4' },
  { name: 'Tablet', value: 15, color: '#10b981' },
];

const activityData = [
  { hour: '00', activity: 2 }, { hour: '04', activity: 1 }, { hour: '08', activity: 18 },
  { hour: '12', activity: 35 }, { hour: '16', activity: 42 }, { hour: '20', activity: 28 }, { hour: '23', activity: 12 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.8125rem',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export const AnalyticsPage = () => (
  <div className="animate-fade-in">
    <div className="page-header">
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Traffic and usage insights for GesturePro</p>
      </div>
      <span style={{
        padding: '6px 14px', borderRadius: 100,
        background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)',
        color: 'var(--amber)', fontSize: '0.75rem', fontWeight: 600,
      }}>
        Preview — Mock Data
      </span>
    </div>

    {/* KPI Row */}
    <div className="stats-grid" style={{ marginBottom: 24 }}>
      {[
        { label: 'Total Sessions', value: '134', icon: BarChart3, color: '#6366f1' },
        { label: 'Unique Users', value: '48', icon: Users, color: '#06b6d4' },
        { label: 'Avg. Session Time', value: '12m', icon: Clock, color: '#10b981' },
        { label: 'Interactions', value: '892', icon: MousePointer, color: '#f59e0b' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
                {label}
              </p>
              <p style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {value}
              </p>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${color}22`, border: `1px solid ${color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={color} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <TrendingUp size={12} color="var(--emerald)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--emerald)' }}>+12% vs last week</span>
          </div>
        </div>
      ))}
    </div>

    {/* Charts Row */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
      {/* Traffic Line Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: 20 }}>Weekly Traffic</h3>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#6366f1" fill="url(#sessionsGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="users" name="Users" stroke="#06b6d4" fill="url(#usersGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Pie Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Smartphone size={16} color="var(--text-muted)" />
          <h3>Device Types</h3>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={80}
                dataKey="value" paddingAngle={3}
              >
                {deviceData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{value}</span>}
              />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    {/* Activity Heatmap Row */}
    <div className="glass-card" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: 20 }}>Hourly Activity</h3>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}:00`} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="activity" name="Activity" stroke="#f59e0b" strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);
