import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'User Management',
  '/sessions': 'Device Sessions',
  '/presentations': 'Presentations',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] ?? 'Admin Panel';

  return (
    <div className="page-wrapper">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="page-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setCollapsed((c) => !c)}
              title="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{pageTitle}</h4>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notification bell */}
            <button className="btn btn-ghost btn-icon" title="Notifications" style={{ position: 'relative' }}>
              <Bell size={18} />
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--accent)',
                border: '2px solid var(--bg-base)',
              }} />
            </button>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="avatar" style={{ cursor: 'default' }}>
                {user?.username?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.username}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="main-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
