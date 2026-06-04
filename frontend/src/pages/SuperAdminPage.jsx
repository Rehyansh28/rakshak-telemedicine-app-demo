import { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  RefreshCw,
  Plus,
  Pencil,
  LogOut,
} from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
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

function Field({ label, value, onChange, type = 'text', placeholder, disabled = false, rows }) {
  const cls =
    'w-full rounded-xl bg-surface-container-low border border-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-secondary-container';
  return (
    <label className="block">
      <div className="label-caps text-secondary mb-2">{label}</div>
      {rows ? (
        <textarea
          className={cls}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <input
          className={cls}
          value={value}
          type={type}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </label>
  );
}

function DataTable({ columns, rows, onEdit, onDelete, onView, emptyLabel = 'No records' }) {
  if (!rows?.length) return <p className="text-sm text-on-surface-variant py-8 text-center">{emptyLabel}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-low">
            {columns.map((c) => (
              <th key={c.key} className="label-caps text-left px-4 py-3 text-secondary whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="px-4 py-3 text-right label-caps text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._key} className="border-b border-surface-container/50 hover:bg-surface-container-low/50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-on-surface max-w-[200px] truncate">
                  {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                </td>
              ))}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {onView && (
                  <button type="button" onClick={() => onView(row)} className="text-secondary hover:underline text-xs mr-3">
                    View
                  </button>
                )}
                {onEdit && (
                  <button type="button" onClick={() => onEdit(row)} className="text-primary hover:underline text-xs mr-3">
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button type="button" onClick={() => onDelete(row)} className="text-error hover:underline text-xs">
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SuperAdminPage() {
  const [token, setTokenState] = useState(getAdminToken());
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [overview, setOverview] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [medicalStaff, setMedicalStaff] = useState([]);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [reports, setReports] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [queue, setQueue] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);

  const [editor, setEditor] = useState(null);
  const [patientFull, setPatientFull] = useState(null);

  const loadTab = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      switch (tab) {
        case 'overview': {
          const o = await adminApiGet('/admin/overview/');
          setOverview(o);
          break;
        }
        case 'doctors':
          setDoctors(await adminApiGet('/admin/doctors/'));
          break;
        case 'medicalStaff':
          setMedicalStaff(await adminApiGet('/admin/medical-staff/'));
          break;
        case 'patients':
          setPatients(await adminApiGet('/admin/patients/'));
          break;
        case 'alerts':
          setAlerts(await adminApiGet('/admin/alerts/'));
          break;
        case 'activity':
          setActivity(await adminApiGet('/admin/activity/'));
          break;
        case 'reports':
          setReports(await adminApiGet('/admin/reports/'));
          break;
        case 'recommendations':
          setRecommendations(await adminApiGet('/admin/recommendations/'));
          break;
        case 'queue':
          setQueue(await adminApiGet('/admin/queue/'));
          break;
        case 'system':
          setSystemConfig(await adminApiGet('/admin/system-config/'));
          break;
        default:
          break;
      }
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTab();
  }, [loadTab]);

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
    setOverview(null);
  };

  const openPatientFull = async (patient) => {
    setLoading(true);
    try {
      const full = await adminApiGet(`/admin/patients/${patient.id}/`);
      setPatientFull(full);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id, soldierId) => {
    if (!confirm('Delete this record?')) return;
    setLoading(true);
    try {
      const paths = {
        doctor: `/admin/doctors/${id}/`,
        staff: `/admin/medical-staff/${id}/`,
        patient: `/admin/patients/${soldierId || id}/`,
        alert: `/admin/alerts/${id}/`,
        activity: `/admin/activity/${id}/`,
        report: `/admin/reports/${id}/`,
        recommendation: `/admin/recommendations/${id}/`,
        queue: `/admin/queue/${id}/`,
      };
      await adminApiDelete(paths[type]);
      await loadTab();
      if (patientFull?.patient?.id === soldierId) setPatientFull(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-secondary-container" />
            <div>
              <p className="label-caps text-secondary">Super Admin</p>
              <h1 className="font-sora text-xl font-bold text-primary">Admin Console</h1>
            </div>
          </div>
          {error && <div className="rounded-xl border border-error/30 bg-error/10 text-error px-4 py-3 text-sm mb-4">{error}</div>}
          <form onSubmit={login} className="space-y-4">
            <Field label="Username" value={username} onChange={setUsername} placeholder="superadmin" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>
          <p className="text-xs text-on-surface-variant mt-4">
            Demo: superadmin / rakshak2026 · fieldmedic / rakshak2026 (after seed_demo)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex">
      <AdminSidebar activeTab={tab} onSelect={setTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-surface-container bg-surface-container-low/50 sticky top-0 z-50 backdrop-blur-md shrink-0">
          <div className="px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 text-secondary-container" />
              <div>
                <p className="label-caps text-secondary text-[10px]">Rakshak Telemedicine</p>
                <h1 className="font-sora text-lg font-bold text-primary">Super Admin Console</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadTab} disabled={loading}>
                Refresh
              </Button>
              <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {error && (
          <div className="rounded-xl border border-error/30 bg-error/10 text-error px-4 py-3 text-sm mb-4">{error}</div>
        )}
        {loading && <p className="text-xs text-secondary mb-4">Loading…</p>}

        {tab === 'overview' && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Object.entries(overview.stats || {}).map(([k, v]) => (
                <GlassCard key={k} className="p-4 text-center">
                  <p className="font-sora text-2xl font-bold text-primary">{v}</p>
                  <p className="label-caps text-[9px] text-secondary mt-1">{k.replace(/([A-Z])/g, ' $1')}</p>
                </GlassCard>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <GlassCard className="p-4">
                <h3 className="font-sora font-semibold mb-3">Recent Activity</h3>
                <DataTable
                  columns={[
                    { key: 'action', label: 'Action' },
                    { key: 'patient', label: 'Patient' },
                    { key: 'time', label: 'Time' },
                  ]}
                  rows={(overview.recentActivity || []).map((r) => ({ ...r, _key: r.id }))}
                />
              </GlassCard>
              <GlassCard className="p-4">
                <h3 className="font-sora font-semibold mb-3">Recent Alerts</h3>
                <DataTable
                  columns={[
                    { key: 'title', label: 'Title' },
                    { key: 'type', label: 'Type' },
                    { key: 'patientId', label: 'Patient' },
                  ]}
                  rows={(overview.recentAlerts || []).map((r) => ({ ...r, _key: r.id }))}
                />
              </GlassCard>
            </div>
          </div>
        )}

        {tab === 'doctors' && (
          <Section
            title="All Doctors"
            subtitle="Portal login credentials for doctor command center"
            onCreate={() => setEditor({ entity: 'doctor', mode: 'create' })}
          >
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'rank', label: 'Rank' },
                { key: 'unit', label: 'Unit' },
                { key: 'user', label: 'Username', render: (r) => r.user?.username || '—' },
              ]}
              rows={doctors.map((d) => ({ ...d, _key: d.id }))}
              onEdit={(r) => setEditor({ entity: 'doctor', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('doctor', r.id)}
            />
          </Section>
        )}

        {tab === 'medicalStaff' && (
          <Section
            title="Medical Staff"
            subtitle="Portal login credentials for field medical staff console"
            onCreate={() => setEditor({ entity: 'staff', mode: 'create' })}
          >
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'rank', label: 'Rank' },
                { key: 'post', label: 'Post' },
                { key: 'user', label: 'Username', render: (r) => r.user?.username || '—' },
              ]}
              rows={medicalStaff.map((s) => ({ ...s, _key: s.id }))}
              onEdit={(r) => setEditor({ entity: 'staff', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('staff', r.id)}
            />
          </Section>
        )}

        {tab === 'patients' && (
          <Section
            title="All Soldiers"
            subtitle="Patient profiles and vitals only — no portal login (managed by medical staff)"
            onCreate={() => setEditor({ entity: 'patient', mode: 'create' })}
          >
            <DataTable
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Name' },
                { key: 'status', label: 'Status' },
                { key: 'heartRate', label: 'HR' },
                { key: 'spo2', label: 'SpO2' },
                { key: 'altitude', label: 'Alt (ft)' },
                { key: 'location', label: 'Location' },
              ]}
              rows={patients.map((p) => ({ ...p, _key: p.id }))}
              onView={(r) => openPatientFull(r)}
              onEdit={(r) => setEditor({ entity: 'patient', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('patient', r.id, r.id)}
            />
          </Section>
        )}

        {tab === 'alerts' && (
          <Section title="Emergency Alerts" onCreate={() => setEditor({ entity: 'alert', mode: 'create' })}>
            <DataTable
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'alertType', label: 'Type' },
                { key: 'patientId', label: 'Patient' },
                { key: 'message', label: 'Message' },
                { key: 'timeLabel', label: 'Time' },
              ]}
              rows={alerts.map((a) => ({ ...a, _key: a.id }))}
              onEdit={(r) => setEditor({ entity: 'alert', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('alert', r.id)}
            />
          </Section>
        )}

        {tab === 'activity' && (
          <Section title="Activity Log" onCreate={() => setEditor({ entity: 'activity', mode: 'create' })}>
            <DataTable
              columns={[
                { key: 'action', label: 'Action' },
                { key: 'patientName', label: 'Patient' },
                { key: 'timeLabel', label: 'Time' },
              ]}
              rows={activity.map((a) => ({ ...a, _key: a.id }))}
              onEdit={(r) => setEditor({ entity: 'activity', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('activity', r.id)}
            />
          </Section>
        )}

        {tab === 'reports' && (
          <Section title="Medical Reports">
            <DataTable
              columns={[
                { key: 'reportId', label: 'Report ID' },
                { key: 'patientName', label: 'Patient' },
                { key: 'doctorName', label: 'Doctor' },
                { key: 'diagnosis', label: 'Diagnosis' },
              ]}
              rows={reports.map((r) => ({ ...r, _key: r.id }))}
              onEdit={(r) => setEditor({ entity: 'report', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('report', r.id)}
            />
          </Section>
        )}

        {tab === 'recommendations' && (
          <Section title="AI Recommendations" onCreate={() => setEditor({ entity: 'recommendation', mode: 'create' })}>
            <DataTable
              columns={[
                { key: 'text', label: 'Text' },
                { key: 'patientId', label: 'Patient' },
                { key: 'order', label: 'Order' },
              ]}
              rows={recommendations.map((r) => ({ ...r, _key: r.id }))}
              onEdit={(r) => setEditor({ entity: 'recommendation', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('recommendation', r.id)}
            />
          </Section>
        )}

        {tab === 'queue' && (
          <Section title="Consultation Queue">
            <DataTable
              columns={[
                { key: 'patientId', label: 'Patient' },
                { key: 'queuePosition', label: 'Position' },
                { key: 'waitTime', label: 'Wait (min)' },
              ]}
              rows={queue.map((q) => ({ ...q, _key: q.id }))}
              onEdit={(r) => setEditor({ entity: 'queue', mode: 'edit', data: r })}
              onDelete={(r) => handleDelete('queue', r.id)}
            />
          </Section>
        )}

        {tab === 'system' && systemConfig && (
          <GlassCard className="p-6 max-w-2xl">
            <h3 className="font-sora font-semibold text-lg mb-4">System Configuration</h3>
            <SystemConfigForm
              config={systemConfig}
              onSave={async (body) => {
                await adminApiPatch('/admin/system-config/', body);
                await loadTab();
              }}
            />
          </GlassCard>
        )}
      </main>

      {editor && (
        <EntityEditor
          editor={editor}
          patients={patients}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await loadTab();
          }}
          setError={setError}
          setLoading={setLoading}
        />
      )}

      {patientFull && (
        <PatientFullModal
          full={patientFull}
          onClose={() => setPatientFull(null)}
          onRefresh={async () => {
            const id = patientFull.patient.id;
            setPatientFull(await adminApiGet(`/admin/patients/${id}/`));
          }}
          setError={setError}
          setLoading={setLoading}
        />
      )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, onCreate }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-sora text-lg font-semibold text-primary">{title}</h2>
          {subtitle && <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>}
        </div>
        {onCreate && (
          <Button size="sm" icon={Plus} onClick={onCreate} className="shrink-0">
            Add New
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function SystemConfigForm({ config, onSave }) {
  const [secureNode, setSecureNode] = useState(config.secureNode || '');
  const [uplinkJson, setUplinkJson] = useState(JSON.stringify(config.uplinkData || {}, null, 2));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const uplinkData = JSON.parse(uplinkJson);
      await onSave({ secureNode, uplinkData });
    } catch {
      alert('Invalid JSON in uplink data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Secure Node" value={secureNode} onChange={setSecureNode} />
      <Field label="Uplink Data (JSON)" value={uplinkJson} onChange={setUplinkJson} rows={12} />
      <Button onClick={save} loading={saving}>
        Save System Config
      </Button>
    </div>
  );
}

function EntityEditor({ editor, patients, onClose, onSaved, setError, setLoading }) {
  const { entity, mode, data } = editor;
  const isCreate = mode === 'create';

  const initForm = () => {
    const d = data || {};
    return {
      username: d.user?.username || '',
      email: d.user?.email || '',
      password: '',
      name: d.name || '',
      rank: d.rank || '',
      unit: d.unit || '',
      post: d.post || '',
      regiment: d.regiment || '',
      avatarUrl: d.avatarUrl || '',
      id: d.id || '',
      status: d.status || 'stable',
      altitude: String(d.altitude ?? 0),
      heartRate: String(d.heartRate ?? 70),
      spo2: String(d.spo2 ?? 98),
      temp: String(d.temp ?? 36.8),
      fatigue: String(d.fatigue ?? 0),
      stress: String(d.stress ?? 0),
      location: d.location || '',
      lastUpdate: d.lastUpdate || 'just now',
      respiration: String(d.respiration ?? 16),
      bpSystolic: String(d.bpSystolic ?? 120),
      bpDiastolic: String(d.bpDiastolic ?? 80),
      title: d.title || '',
      alertType: d.alertType || 'info',
      message: d.message || '',
      timeLabel: d.timeLabel || 'now',
      patientId: d.patientId || '',
      action: d.action || '',
      patientName: d.patientName || '',
      text: d.text || '',
      order: String(d.order ?? 0),
      diagnosis: d.diagnosis || '',
      notes: d.notes || '',
      hashValue: d.hashValue || '',
      reportId: d.reportId || '',
      queuePosition: String(d.queuePosition ?? 1),
      waitTime: String(d.waitTime ?? 5),
    };
  };

  const [form, setForm] = useState(initForm);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setLoading(true);
    setSaveError('');
    setError('');

    if (isCreate && (entity === 'doctor' || entity === 'staff')) {
      if (!form.username?.trim() || !form.password?.trim() || !form.name?.trim()) {
        setSaveError('Username, password, and name are required.');
        setSaving(false);
        setLoading(false);
        return;
      }
    }
    if (isCreate && entity === 'patient' && (!form.id?.trim() || !form.name?.trim())) {
      setSaveError('Soldier ID and name are required.');
      setSaving(false);
      setLoading(false);
      return;
    }

    try {
      if (entity === 'doctor') {
        const payload = {
          username: form.username.trim(),
          email: form.email,
          password: form.password,
          name: form.name,
          rank: form.rank,
          unit: form.unit,
          avatarUrl: form.avatarUrl,
        };
        if (isCreate) await adminApiPost('/admin/doctors/', payload);
        else await adminApiPatch(`/admin/doctors/${data.id}/`, { ...payload, password: form.password || undefined });
      } else if (entity === 'staff') {
        const payload = {
          username: form.username.trim(),
          email: form.email,
          password: form.password,
          name: form.name,
          rank: form.rank,
          post: form.post,
        };
        if (isCreate) await adminApiPost('/admin/medical-staff/', payload);
        else await adminApiPatch(`/admin/medical-staff/${data.id}/`, { ...payload, password: form.password || undefined });
      } else if (entity === 'patient') {
        const payload = isCreate
          ? {
              soldierId: form.id,
              name: form.name,
              rank: form.rank,
              regiment: form.regiment,
              status: form.status,
              location: form.location,
            }
          : {
              name: form.name,
              rank: form.rank,
              regiment: form.regiment,
              status: form.status,
              altitude: Number(form.altitude),
              heartRate: Number(form.heartRate),
              spo2: Number(form.spo2),
              temp: Number(form.temp),
              fatigue: Number(form.fatigue),
              stress: Number(form.stress),
              location: form.location,
              lastUpdate: form.lastUpdate,
              respiration: Number(form.respiration),
              bpSystolic: Number(form.bpSystolic),
              bpDiastolic: Number(form.bpDiastolic),
            };
        if (isCreate) await adminApiPost('/admin/patients/', payload);
        else await adminApiPatch(`/admin/patients/${data.id}/`, payload);
      } else if (entity === 'alert') {
        const payload = {
          patientId: form.patientId,
          alertType: form.alertType,
          title: form.title,
          message: form.message,
          timeLabel: form.timeLabel,
        };
        if (isCreate) await adminApiPost('/admin/alerts/', payload);
        else await adminApiPatch(`/admin/alerts/${data.id}/`, payload);
      } else if (entity === 'activity') {
        const payload = { action: form.action, patientName: form.patientName, timeLabel: form.timeLabel };
        if (isCreate) await adminApiPost('/admin/activity/', payload);
        else await adminApiPatch(`/admin/activity/${data.id}/`, payload);
      } else if (entity === 'report') {
        await adminApiPatch(`/admin/reports/${data.id}/`, {
          diagnosis: form.diagnosis,
          notes: form.notes,
          hashValue: form.hashValue,
          reportId: form.reportId,
        });
      } else if (entity === 'recommendation') {
        const payload = { text: form.text, patientId: form.patientId || null, order: Number(form.order) };
        if (isCreate) await adminApiPost('/admin/recommendations/', payload);
        else await adminApiPatch(`/admin/recommendations/${data.id}/`, payload);
      } else if (entity === 'queue') {
        await adminApiPatch(`/admin/queue/${data.id}/`, {
          queuePosition: Number(form.queuePosition),
          waitTime: Number(form.waitTime),
        });
      }
      await onSaved();
    } catch (e) {
      const message = e.message || 'Save failed';
      setSaveError(message);
      setError(message);
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  const titles = {
    doctor: 'Doctor',
    staff: 'Medical Staff',
    patient: 'Soldier',
    alert: 'Emergency Alert',
    activity: 'Activity Log',
    report: 'Medical Report',
    recommendation: 'AI Recommendation',
    queue: 'Queue Entry',
  };

  return (
    <Modal open onClose={onClose} title={`${titles[entity]} — ${isCreate ? 'Create' : 'Edit'}`} size="full">
      <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
        {saveError && (
          <div className="rounded-xl border border-error/30 bg-error/10 text-error px-4 py-3 text-sm">
            {saveError}
          </div>
        )}
        {(entity === 'doctor' || entity === 'staff' || entity === 'patient') && (
          <>
            <p className="label-caps text-secondary">Profile</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {entity === 'patient' && isCreate && (
                <Field label="Soldier ID" value={form.id} onChange={(v) => set('id', v)} />
              )}
              <Field label="Name" value={form.name} onChange={(v) => set('name', v)} />
              <Field label="Rank" value={form.rank} onChange={(v) => set('rank', v)} />
              {entity === 'doctor' && (
                <>
                  <Field label="Unit" value={form.unit} onChange={(v) => set('unit', v)} />
                  <Field label="Avatar URL" value={form.avatarUrl} onChange={(v) => set('avatarUrl', v)} />
                </>
              )}
              {entity === 'staff' && (
                <Field label="Field Post / Unit" value={form.post} onChange={(v) => set('post', v)} />
              )}
              {entity === 'patient' && (
                <>
                  <Field label="Regiment" value={form.regiment} onChange={(v) => set('regiment', v)} />
                  <label className="block">
                    <div className="label-caps text-secondary mb-2">Status</div>
                    <select
                      className="w-full rounded-xl bg-surface-container-low border px-4 py-3 text-sm"
                      value={form.status}
                      onChange={(e) => set('status', e.target.value)}
                    >
                      {['critical', 'monitoring', 'stable', 'consultation'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Location" value={form.location} onChange={(v) => set('location', v)} />
                  {!isCreate && (
                    <>
                      <Field label="Last Update Label" value={form.lastUpdate} onChange={(v) => set('lastUpdate', v)} />
                      <Field label="Altitude (ft)" value={form.altitude} onChange={(v) => set('altitude', v)} type="number" />
                      <Field label="Heart Rate" value={form.heartRate} onChange={(v) => set('heartRate', v)} type="number" />
                      <Field label="SpO2 %" value={form.spo2} onChange={(v) => set('spo2', v)} type="number" />
                      <Field label="Temp °C" value={form.temp} onChange={(v) => set('temp', v)} type="number" />
                      <Field label="Fatigue" value={form.fatigue} onChange={(v) => set('fatigue', v)} type="number" />
                      <Field label="Stress" value={form.stress} onChange={(v) => set('stress', v)} type="number" />
                      <Field label="Respiration" value={form.respiration} onChange={(v) => set('respiration', v)} type="number" />
                      <Field label="BP Systolic" value={form.bpSystolic} onChange={(v) => set('bpSystolic', v)} type="number" />
                      <Field label="BP Diastolic" value={form.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} type="number" />
                    </>
                  )}
                </>
              )}
            </div>
            {(entity === 'doctor' || entity === 'staff') && (
              <>
                <p className="label-caps text-secondary mt-4">Credentials</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Username" value={form.username} onChange={(v) => set('username', v)} />
                  <Field label="Email" value={form.email} onChange={(v) => set('email', v)} />
                  <Field
                    label={isCreate ? 'Password' : 'New password (optional)'}
                    value={form.password}
                    onChange={(v) => set('password', v)}
                    type="password"
                  />
                </div>
                <p className="text-xs text-on-surface-variant">
                  {entity === 'doctor'
                    ? 'Used at /doctor/login. Username or email plus password. Demo account "doctor" already exists after seed — use a new username (e.g. dr.sharma).'
                    : 'Used at /staff/login. Demo account "fieldmedic" already exists after seed — use a new username.'}
                </p>
              </>
            )}
            {entity === 'patient' && (
              <p className="text-xs text-on-surface-variant mt-4">
                Soldiers do not log in to this portal. Vitals are populated from the bio-suit after registration
                {isCreate ? ' — only profile fields are required when creating a soldier.' : '.'}
              </p>
            )}
          </>
        )}

        {entity === 'alert' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Patient ID" value={form.patientId} onChange={(v) => set('patientId', v)} />
            <Field label="Type" value={form.alertType} onChange={(v) => set('alertType', v)} />
            <Field label="Title" value={form.title} onChange={(v) => set('title', v)} />
            <Field label="Time Label" value={form.timeLabel} onChange={(v) => set('timeLabel', v)} />
            <Field label="Message" value={form.message} onChange={(v) => set('message', v)} rows={3} />
          </div>
        )}

        {entity === 'activity' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Action" value={form.action} onChange={(v) => set('action', v)} />
            <Field label="Patient Name" value={form.patientName} onChange={(v) => set('patientName', v)} />
            <Field label="Time Label" value={form.timeLabel} onChange={(v) => set('timeLabel', v)} />
          </div>
        )}

        {entity === 'report' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Report ID" value={form.reportId} onChange={(v) => set('reportId', v)} />
            <Field label="Hash" value={form.hashValue} onChange={(v) => set('hashValue', v)} />
            <Field label="Diagnosis" value={form.diagnosis} onChange={(v) => set('diagnosis', v)} rows={4} />
            <Field label="Notes" value={form.notes} onChange={(v) => set('notes', v)} rows={4} />
          </div>
        )}

        {entity === 'recommendation' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Text" value={form.text} onChange={(v) => set('text', v)} rows={3} />
            <Field label="Patient ID (optional)" value={form.patientId} onChange={(v) => set('patientId', v)} />
            <Field label="Order" value={form.order} onChange={(v) => set('order', v)} type="number" />
          </div>
        )}

        {entity === 'queue' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Queue Position" value={form.queuePosition} onChange={(v) => set('queuePosition', v)} type="number" />
            <Field label="Wait Time (min)" value={form.waitTime} onChange={(v) => set('waitTime', v)} type="number" />
          </div>
        )}

        {entity === 'alert' && isCreate && patients.length > 0 && (
          <p className="text-xs text-on-surface-variant">
            Patient IDs: {patients.map((p) => p.id).join(', ')}
          </p>
        )}
      </div>
      <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-surface-container">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} loading={saving}>{isCreate ? 'Create' : 'Save changes'}</Button>
      </div>
    </Modal>
  );
}

function PatientFullModal({ full, onClose, onRefresh, setError, setLoading }) {
  const p = full.patient;
  const [editingPatient, setEditingPatient] = useState(false);
  const [form, setForm] = useState({ ...p });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const savePatient = async () => {
    setLoading(true);
    try {
      await adminApiPatch(`/admin/patients/${p.id}/`, {
        name: form.name,
        rank: form.rank,
        regiment: form.regiment,
        status: form.status,
        altitude: Number(form.altitude),
        heartRate: Number(form.heartRate),
        spo2: Number(form.spo2),
        temp: Number(form.temp),
        fatigue: Number(form.fatigue),
        stress: Number(form.stress),
        location: form.location,
        lastUpdate: form.lastUpdate,
        respiration: Number(form.respiration),
        bpSystolic: Number(form.bpSystolic),
        bpDiastolic: Number(form.bpDiastolic),
      });
      setEditingPatient(false);
      await onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Patient — ${p.name} (${p.id})`} size="full">
      <div className="max-h-[75vh] overflow-y-auto space-y-6 pr-2">
        <div className="flex justify-between items-center">
          <h3 className="font-sora font-semibold">Profile & Vitals</h3>
          <Button size="sm" variant="secondary" icon={editingPatient ? undefined : Pencil} onClick={() => setEditingPatient(!editingPatient)}>
            {editingPatient ? 'Cancel edit' : 'Edit all fields'}
          </Button>
        </div>

        {editingPatient ? (
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ['name', 'Name'],
              ['rank', 'Rank'],
              ['regiment', 'Regiment'],
              ['status', 'Status'],
              ['location', 'Location'],
              ['lastUpdate', 'Last update'],
              ['altitude', 'Altitude'],
              ['heartRate', 'HR'],
              ['spo2', 'SpO2'],
              ['temp', 'Temp'],
              ['fatigue', 'Fatigue'],
              ['stress', 'Stress'],
              ['respiration', 'Resp'],
              ['bpSystolic', 'BP Sys'],
              ['bpDiastolic', 'BP Dia'],
            ].map(([k, label]) => (
              <Field key={k} label={label} value={String(form[k] ?? '')} onChange={(v) => set(k, v)} />
            ))}
            <div className="sm:col-span-3">
              <Button onClick={savePatient}>Save patient</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {Object.entries(p).map(([k, v]) =>
              k === 'user' ? null : (
                <div key={k} className="bg-surface-container-low rounded-lg p-2">
                  <p className="label-caps text-[9px] text-secondary">{k}</p>
                  <p className="font-mono text-xs truncate">{String(v)}</p>
                </div>
              )
            )}
          </div>
        )}

        <DetailBlock title={`Alerts (${full.alerts?.length || 0})`} items={full.alerts} fields={['alertType', 'title', 'message', 'timeLabel']} />
        <DetailBlock title={`Sensor steps (${full.sensorSteps?.length || 0})`} items={full.sensorSteps} fields={['label', 'icon', 'status', 'order']} />
        <DetailBlock title={`Reports (${full.reports?.length || 0})`} items={full.reports} fields={['reportId', 'diagnosis', 'notes']} />

        {full.aiInsight && (
          <GlassCard className="p-4">
            <h4 className="font-sora font-semibold mb-2">AI Insights</h4>
            <pre className="text-xs overflow-auto bg-surface-container-low p-3 rounded-lg">{JSON.stringify(full.aiInsight, null, 2)}</pre>
            <InsightEditor insight={full.aiInsight} onRefresh={onRefresh} setError={setError} setLoading={setLoading} />
          </GlassCard>
        )}

        {full.queue && (
          <GlassCard className="p-4">
            <h4 className="font-sora font-semibold mb-2">Consultation Queue</h4>
            <p className="text-sm">Position #{full.queue.queuePosition} · Wait {full.queue.waitTime} min</p>
          </GlassCard>
        )}

        {full.organs?.length > 0 && (
          <GlassCard className="p-4">
            <h4 className="font-sora font-semibold mb-2">Organ Diagnostics ({full.organs.length})</h4>
            {full.organs.map((o) => (
              <OrganEditor key={o.id} organ={o} onRefresh={onRefresh} setError={setError} setLoading={setLoading} />
            ))}
          </GlassCard>
        )}

        {full.recommendations?.length > 0 && (
          <GlassCard className="p-4">
            <h4 className="font-sora font-semibold mb-2">Patient AI Recommendations</h4>
            <ul className="text-sm space-y-1">
              {full.recommendations.map((r) => (
                <li key={r.id} className="border-b border-surface-container py-1">
                  {r.text}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>
      <Button variant="ghost" className="w-full mt-4" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}

function DetailBlock({ title, items, fields }) {
  if (!items?.length) return null;
  return (
    <GlassCard className="p-4">
      <h4 className="font-sora font-semibold mb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="text-xs border border-surface-container rounded-lg p-2 grid sm:grid-cols-2 gap-1">
            {fields.map((f) => (
              <span key={f}>
                <strong>{f}:</strong> {String(item[f] ?? '—')}
              </span>
            ))}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function InsightEditor({ insight, onRefresh, setError, setLoading }) {
  const [json, setJson] = useState(JSON.stringify(insight, null, 2));
  const save = async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(json);
      await adminApiPatch(`/admin/insights/${insight.id}/`, parsed);
      await onRefresh();
    } catch (e) {
      setError(e.message || 'Invalid JSON');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mt-2">
      <textarea className="w-full text-xs font-mono rounded-lg border p-2 h-32" value={json} onChange={(e) => setJson(e.target.value)} />
      <Button size="sm" className="mt-2" onClick={save}>
        Save AI insight
      </Button>
    </div>
  );
}

function OrganEditor({ organ, onRefresh, setError, setLoading }) {
  const [json, setJson] = useState(JSON.stringify(organ.data, null, 2));
  const save = async () => {
    setLoading(true);
    try {
      await adminApiPatch(`/admin/organs/${organ.id}/`, { data: JSON.parse(json), organId: organ.organId });
      await onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mt-3 border-t pt-3">
      <p className="label-caps text-secondary mb-1">{organ.organId}</p>
      <textarea className="w-full text-xs font-mono rounded-lg border p-2 h-24" value={json} onChange={(e) => setJson(e.target.value)} />
      <Button size="sm" className="mt-1" onClick={save}>
        Save organ data
      </Button>
    </div>
  );
}
