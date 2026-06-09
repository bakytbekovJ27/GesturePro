import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import type { AdminUser } from '../api/users';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users';
import { useAuth } from '../context/AuthContext';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const EMPTY_FORM = { username: '', email: '', password: '', is_staff: false };

export const UsersPage = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await listUsers(search || undefined)); }
    catch { setUsers([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  /* Create */
  const openCreate = () => { setForm(EMPTY_FORM); setFormError(''); setCreateOpen(true); };
  const handleCreate = async () => {
    if (!form.username || !form.email || !form.password) {
      setFormError('All fields are required.'); return;
    }
    setSaving(true); setFormError('');
    try {
      await createUser(form);
      setCreateOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.detail || 'Failed to create user.');
    } finally { setSaving(false); }
  };

  /* Edit */
  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setForm({ username: u.username, email: u.email, password: '', is_staff: u.is_staff });
    setFormError('');
  };
  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true); setFormError('');
    try {
      const payload: any = { username: form.username, email: form.email, is_staff: form.is_staff };
      if (form.password) payload.password = form.password;
      await updateUser(editUser.id, payload);
      setEditUser(null);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.detail || 'Failed to update user.');
    } finally { setSaving(false); }
  };

  /* Delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteUser(deleteTarget.id); setDeleteTarget(null); load(); }
    catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'username', label: 'User', sortable: true,
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
            {u.username[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{u.username}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'is_staff', label: 'Role',
      render: (u) => u.is_staff
        ? <Badge color="purple"><ShieldCheck size={11} /> Admin</Badge>
        : <Badge color="gray">User</Badge>,
    },
    {
      key: 'is_active', label: 'Status',
      render: (u) => u.is_active
        ? <Badge color="green" dot>Active</Badge>
        : <Badge color="red" dot>Inactive</Badge>,
    },
    { key: 'date_joined', label: 'Joined', sortable: true, render: (u) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(u.date_joined)}</span> },
    { key: 'last_login', label: 'Last Login', render: (u) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(u.last_login)}</span> },
  ];

  const UserForm = (
    <>
      {formError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--rose-dim)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--rose)', fontSize: '0.8125rem' }}>
          {formError}
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Username</label>
        <input id="user-form-username" className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="john_doe" />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input id="user-form-email" className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
      </div>
      <div className="form-group">
        <label className="form-label">{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
        <input id="user-form-password" className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input id="user-form-is-staff" type="checkbox" className="toggle" checked={form.is_staff} onChange={(e) => setForm({ ...form, is_staff: e.target.checked })} />
        <label htmlFor="user-form-is-staff" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} /> Grant admin privileges
        </label>
      </div>
    </>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage user accounts and permissions</p>
        </div>
        <button id="create-user-btn" className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        loading={loading}
        searchable
        searchPlaceholder="Search users…"
        searchValue={search}
        onSearch={setSearch}
        emptyMessage="No users found."
        actions={(u) => (
          <>
            <button
              id={`edit-user-${u.id}`}
              className="btn btn-ghost btn-icon"
              title="Edit"
              onClick={() => openEdit(u)}
            >
              <Pencil size={15} />
            </button>
            <button
              id={`delete-user-${u.id}`}
              className="btn btn-ghost btn-icon"
              title="Delete"
              onClick={() => setDeleteTarget(u)}
              disabled={u.id === me?.id}
              style={{ color: u.id !== me?.id ? 'var(--rose)' : 'var(--text-muted)' }}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New User"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button id="create-user-submit" className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? <span className="spinner" /> : <UserPlus size={15} />} Create
            </button>
          </>
        }
      >
        {UserForm}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit — ${editUser?.username}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
            <button id="edit-user-submit" className="btn btn-primary" onClick={handleEdit} disabled={saving}>
              {saving ? <span className="spinner" /> : <Pencil size={15} />} Save
            </button>
          </>
        }
      >
        {UserForm}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete User"
        message={`Are you sure you want to permanently delete "${deleteTarget?.username}"? This action cannot be undone.`}
      />
    </div>
  );
};
