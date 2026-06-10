import React from 'react';
import { Settings, Globe, Mail, ShieldCheck, Bell, Database, Save } from 'lucide-react';

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="glass-card" style={{ padding: '24px', marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color="var(--accent-light)" />
      </div>
      <h3>{title}</h3>
    </div>
    {children}
  </div>
);

const SettingRow = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 0',
    borderBottom: '1px solid var(--glass-border)',
    gap: 16,
  }}>
    <div>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
      {description && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{description}</p>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

export const SettingsPage = () => (
  <div className="animate-fade-in">
    <div className="page-header">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your GesturePro admin panel</p>
      </div>
      <button className="btn btn-primary btn-sm" disabled>
        <Save size={14} /> Save All
      </button>
    </div>

    {/* Coming soon banner */}
    <div style={{
      padding: '16px 20px', borderRadius: 12, marginBottom: 24,
      background: 'var(--accent-dim)', border: '1px solid var(--border-accent)',
      color: 'var(--accent-light)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Settings size={16} />
      Settings persistence is coming soon. These controls are for preview only.
    </div>

    <Section icon={Globe} title="General">
      <SettingRow label="Site Name" description="Displayed in the browser title and emails">
        <input className="input" defaultValue="GesturePro" style={{ width: 200 }} disabled />
      </SettingRow>
      <SettingRow label="Timezone" description="Server timezone for logs and reports">
        <input className="input" defaultValue="Asia/Almaty" style={{ width: 200 }} disabled />
      </SettingRow>
      <SettingRow label="Debug Mode" description="Show detailed error pages (disable in production)">
        <input type="checkbox" className="toggle" defaultChecked disabled />
      </SettingRow>
    </Section>

    <Section icon={Mail} title="Email Configuration">
      <SettingRow label="SMTP Host" description="Outgoing mail server address">
        <input className="input" placeholder="smtp.example.com" style={{ width: 220 }} disabled />
      </SettingRow>
      <SettingRow label="SMTP Port" description="Standard port: 587 (TLS) or 465 (SSL)">
        <input className="input" placeholder="587" style={{ width: 100 }} disabled />
      </SettingRow>
      <SettingRow label="Email Notifications" description="Send alerts for critical events">
        <input type="checkbox" className="toggle" disabled />
      </SettingRow>
    </Section>

    <Section icon={ShieldCheck} title="Security">
      <SettingRow label="JWT Expiry" description="Access token lifetime in minutes">
        <input className="input" defaultValue="60" style={{ width: 100 }} disabled />
      </SettingRow>
      <SettingRow label="Allow Registration" description="Allow new users to register via the mobile app">
        <input type="checkbox" className="toggle" defaultChecked disabled />
      </SettingRow>
      <SettingRow label="Session Lifetime" description="Hours before a device session expires">
        <input className="input" defaultValue="24" style={{ width: 100 }} disabled />
      </SettingRow>
    </Section>

    <Section icon={Database} title="Storage">
      <SettingRow label="Max Upload Size" description="Maximum file size in megabytes">
        <input className="input" defaultValue="100" style={{ width: 100 }} disabled />
      </SettingRow>
      <SettingRow label="Media Root" description="Absolute path to uploaded files on disk">
        <input className="input" defaultValue="/backend/media" style={{ width: 220 }} disabled />
      </SettingRow>
    </Section>

    <Section icon={Bell} title="Notifications">
      <SettingRow label="Admin Alerts" description="Notify on new user registration">
        <input type="checkbox" className="toggle" defaultChecked disabled />
      </SettingRow>
      <SettingRow label="Error Notifications" description="Notify on presentation conversion errors">
        <input type="checkbox" className="toggle" defaultChecked disabled />
      </SettingRow>
    </Section>
  </div>
);
