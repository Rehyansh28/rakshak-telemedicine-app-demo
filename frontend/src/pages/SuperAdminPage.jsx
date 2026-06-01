import { useEffect, useMemo, useState } from 'react';
import { Shield, Users, Stethoscope, RefreshCw, Plus, Pencil, Trash2, KeyRound, LogOut } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import GlassCard from '../components/ui/GlassCard';
import {
  adminApiDelete,
  adminApiGet,
  adminApiPatch,
  adminApiPost,
  getAdminToken,
  setAdminToken,
} from '../api/client';

function Field({ label, value, onChange, type = 'text', placeholder, disabled = false }) {
  return (
    <label className="block">
      <div className="label-caps text-secondary mb-2">{label}</div>
      <input
        className="w-full rounded-xl bg-surface-container-low border border-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary-container"
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function TabButton({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`label-caps inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs transition-all ${
        active
          ? 'bg-primary text-on-primary shadow-md shadow-primary/15'
          : 'border border-surface-container text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

export default function SuperAdminPage() {
  const [token, setTokenState] = useState(getAdminToken());
  const [tab, setTab] = useState('doctors'); // doctors | patients
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);

  const [modal, setModal] = useState(null); // { type, mode, item }

  const title = useMemo(() => (tab === 'doctors' ? 'Doctor Credentials' : 'Patient Credentials'), [tab]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [d, p] = await Promise.all([adminApiGet('/admin/doctors/'), adminApiGet('/admin/patients/')]);
      setDoctors(d);
      setPatients(p);
    } catch (e) {
      setError(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminApiPost('/auth/superadmin/login/', { username, password });
      setAdminToken(res.token);
      setTokenState(res.token);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAdminToken(null);
    setTokenState(null);
    setDoctors([]);
    setPatients([]);
  };

  const openCreate = () => setModal({ type: tab, mode: 'create', item: null });
  const openEdit = (item) => setModal({ type: tab, mode: 'edit', item });

  const removeItem = async (item) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      if (tab === 'doctors') await adminApiDelete(`/admin/doctors/${item.id}/`);
      else await adminApiDelete(`/admin/patients/${item.id}/`);
      await load();
    } catch (e) {
      setError(e.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-secondary-container/15 text-secondary-container">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="label-caps text-secondary">Super Admin</p>
              <h1 className="font-sora text-xl font-bold text-primary">Admin Console</h1>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-error/30 bg-error/10 text-error px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={login} className="space-y-4">
            <Field label="Username" value={username} onChange={setUsername} placeholder="admin" />
            <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const list = tab === 'doctors' ? doctors : patients;

  return (
    <div className="min-h-screen bg-surface text-on-surface p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-secondary-container/15 text-secondary-container">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="label-caps text-secondary">Administration</p>
              <h1 className="font-sora text-2xl font-bold text-primary">Super Admin Console</h1>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <TabButton active={tab === 'doctors'} icon={Stethoscope} onClick={() => setTab('doctors')}>
              Doctors
            </TabButton>
            <TabButton active={tab === 'patients'} icon={Users} onClick={() => setTab('patients')}>
              Patients
            </TabButton>
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button variant="ghost" icon={LogOut} onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-error/30 bg-error/10 text-error px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-sora text-lg font-semibold text-primary">{title}</h2>
          <Button icon={Plus} onClick={openCreate}>
            Create
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((item) => (
            <GlassCard key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-caps text-secondary mb-1">{tab === 'doctors' ? 'Doctor' : 'Patient'}</p>
                  <h3 className="font-sora text-lg font-bold text-primary">
                    {tab === 'doctors' ? item.name : `${item.name} · ${item.id}`}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1 font-mono">
                    user: {item.user?.username || '—'} {item.user?.email ? `· ${item.user.email}` : ''}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {tab === 'doctors' ? `${item.rank || '—'} · ${item.unit || '—'}` : `${item.rank || '—'} · ${item.regiment || '—'}`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" icon={Trash2} onClick={() => removeItem(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
          {!loading && list.length === 0 && (
            <div className="text-sm text-on-surface-variant">No records found.</div>
          )}
        </div>

        <EditorModal
          key={`${modal?.type || 'none'}-${modal?.mode || 'none'}-${modal?.item?.id || 'new'}`}
          open={!!modal}
          onClose={() => setModal(null)}
          mode={modal?.mode}
          type={modal?.type}
          item={modal?.item}
          onSaved={async () => {
            setModal(null);
            await load();
          }}
          setError={setError}
          setLoading={setLoading}
        />
      </div>
    </div>
  );
}

function EditorModal({ open, onClose, mode, type, item, onSaved, setError, setLoading }) {
  const isDoctor = type === 'doctors';

  const [form, setForm] = useState({
    id: item?.id || '',
    name: item?.name || '',
    rank: item?.rank || '',
    unit: item?.unit || '',
    regiment: item?.regiment || '',
    status: item?.status || 'stable',
    username: item?.user?.username || '',
    email: item?.user?.email || '',
    password: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'create') {
        if (isDoctor) {
          await adminApiPost('/admin/doctors/', {
            username: form.username,
            password: form.password,
            email: form.email,
            name: form.name,
            rank: form.rank,
            unit: form.unit,
          });
        } else {
          await adminApiPost('/admin/patients/', {
            soldierId: form.id,
            username: form.username,
            password: form.password,
            email: form.email,
            name: form.name,
            rank: form.rank,
            regiment: form.regiment,
            status: form.status,
          });
        }
      } else {
        if (isDoctor) {
          await adminApiPatch(`/admin/doctors/${item.id}/`, {
            username: form.username,
            email: form.email,
            ...(form.password ? { password: form.password } : {}),
            name: form.name,
            rank: form.rank,
            unit: form.unit,
          });
        } else {
          await adminApiPatch(`/admin/patients/${item.id}/`, {
            username: form.username,
            email: form.email,
            ...(form.password ? { password: form.password } : {}),
            name: form.name,
            rank: form.rank,
            regiment: form.regiment,
            status: form.status,
          });
        }
      }
      await onSaved();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = mode === 'create' ? 'Create credentials' : 'Edit credentials / profile';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${isDoctor ? 'Doctor' : 'Patient'} — ${subtitle}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={isDoctor ? 'Doctor Name' : 'Patient Name'}
            value={form.name}
            onChange={(v) => set('name', v)}
            placeholder={isDoctor ? 'Dr. Name' : 'Patient Name'}
          />
          <Field
            label={isDoctor ? 'Rank' : 'Rank'}
            value={form.rank}
            onChange={(v) => set('rank', v)}
            placeholder="Rank"
          />
          {isDoctor ? (
            <Field label="Unit" value={form.unit} onChange={(v) => set('unit', v)} placeholder="Army Medical Corps" />
          ) : (
            <Field
              label="Regiment"
              value={form.regiment}
              onChange={(v) => set('regiment', v)}
              placeholder="Regiment"
            />
          )}

          {!isDoctor && (
            <label className="block">
              <div className="label-caps text-secondary mb-2">Status</div>
              <select
                className="w-full rounded-xl bg-surface-container-low border border-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary-container"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="critical">critical</option>
                <option value="monitoring">monitoring</option>
                <option value="stable">stable</option>
                <option value="consultation">consultation</option>
              </select>
            </label>
          )}

          {!isDoctor && (
            <Field
              label="Soldier ID"
              value={form.id}
              onChange={(v) => set('id', v)}
              placeholder="IA-SLD-0001"
              disabled={mode !== 'create'}
            />
          )}
        </div>

        <div className="rounded-2xl border border-surface-container p-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-secondary-container" />
            <h3 className="font-sora font-semibold text-primary">Credentials</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Username" value={form.username} onChange={(v) => set('username', v)} placeholder="username" />
            <Field label="Email" value={form.email} onChange={(v) => set('email', v)} placeholder="email@example.com" />
            <Field
              label={mode === 'create' ? 'Password' : 'New password (optional)'}
              value={form.password}
              onChange={(v) => set('password', v)}
              type="password"
              placeholder="••••••••"
            />
          </div>
          <p className="text-xs text-on-surface-variant mt-3">
            Note: existing passwords are never shown. Use “New password” to reset.
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{mode === 'create' ? 'Create' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  );
}

