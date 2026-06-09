import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';
  dot?: boolean;
}

export const Badge = ({ children, color = 'gray', dot }: BadgeProps) => (
  <span className={`badge badge-${color}`}>
    {dot && <span className={`dot dot-${color}`} />}
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { color: BadgeProps['color']; label: string }> = {
    ready:       { color: 'green',  label: 'Ready' },
    presenting:  { color: 'blue',   label: 'Presenting' },
    uploading:   { color: 'yellow', label: 'Uploading' },
    converting:  { color: 'yellow', label: 'Converting' },
    downloading: { color: 'purple', label: 'Downloading' },
    error:       { color: 'red',    label: 'Error' },
  };
  const cfg = map[status] ?? { color: 'gray', label: status };
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
};
