import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'accent' | 'teal' | 'emerald' | 'amber' | 'rose';
  sub?: string;
}

const colorMap = {
  accent:  { bg: 'var(--accent-dim)',   icon: 'var(--accent-light)', glow: 'rgba(99,102,241,0.15)'  },
  teal:    { bg: 'var(--teal-dim)',     icon: 'var(--teal)',          glow: 'rgba(6,182,212,0.15)'   },
  emerald: { bg: 'var(--emerald-dim)',  icon: 'var(--emerald)',       glow: 'rgba(16,185,129,0.15)'  },
  amber:   { bg: 'var(--amber-dim)',    icon: 'var(--amber)',         glow: 'rgba(245,158,11,0.15)'  },
  rose:    { bg: 'var(--rose-dim)',     icon: 'var(--rose)',          glow: 'rgba(244,63,94,0.15)'   },
};

export const StatsCard = ({ label, value, icon: Icon, color = 'accent', sub }: StatsCardProps) => {
  const c = colorMap[color];
  return (
    <div className="glass-card" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 100, height: 100,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: c.bg,
          border: `1px solid ${c.glow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} color={c.icon} />
        </div>
      </div>
    </div>
  );
};
