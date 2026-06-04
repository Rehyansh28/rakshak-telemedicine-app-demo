import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Play, Search } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/layout/PageHeader';
import { PATHS } from '../routes/paths';
import { useApp } from '../context/useApp';
import { staffApiPost, staffApiPatch, staffApiDelete } from '../api/client';

const emptyForm = {
  soldierId: '',
  name: '',
  rank: '',
  regiment: '',
  location: '',
  status: 'stable',
  altitude: '',
  heartRate: '',
  spo2: '',
  temp: '',
  fatigue: '',
  stress: '',
  respiration: '',
  bpSystolic: '',
  bpDiastolic: '',
};

export default function StaffPatientsPage() {
  const navigate = useNavigate();
  const {
    patientList,
    setSelectedPatient,
    refreshPatientList,
    setSensorProgress,
    showToast,
    selectedPatient,
    loading,
  } = useApp();

  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = patientList.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.rank?.toLowerCase().includes(q) ||
      p.regiment?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setForm(emptyForm);
    setSaveError('');
    setEditor({ mode: 'create' });
  };

  const openEdit = (patient) => {
    setForm({
      soldierId: patient.id,
      name: patient.name || '',
      rank: patient.rank || '',
      regiment: patient.regiment || '',
      location: patient.location || '',
      status: patient.status || 'stable',
      altitude: String(patient.altitude ?? ''),
      heartRate: String(patient.heartRate ?? ''),
      spo2: String(patient.spo2 ?? ''),
      temp: String(patient.temp ?? ''),
      fatigue: String(patient.fatigue ?? ''),
      stress: String(patient.stress ?? ''),
      respiration: String(patient.respiration ?? ''),
      bpSystolic: String(patient.bpSystolic ?? ''),
      bpDiastolic: String(patient.bpDiastolic ?? ''),
    });
    setSaveError('');
    setEditor({ mode: 'edit', patient });
  };

  const beginSession = (patient) => {
    setSelectedPatient(patient);
    setSensorProgress(0);
    showToast(`Session started for ${patient.name}`, 'success');
    navigate(PATHS.staff.sensors);
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      if (editor.mode === 'create') {
        if (!form.soldierId.trim() || !form.name.trim()) {
          setSaveError('Soldier ID and name are required.');
          return;
        }
        await staffApiPost('/patients/', {
          soldierId: form.soldierId.trim(),
          name: form.name.trim(),
          rank: form.rank.trim() || 'Soldier',
          regiment: form.regiment.trim() || 'Unassigned',
          location: form.location.trim() || 'Field Post',
          status: form.status,
        });
        showToast('Soldier registered', 'success');
      } else {
        const patch = {
          name: form.name,
          rank: form.rank,
          regiment: form.regiment,
          location: form.location,
          status: form.status,
        };
        if (form.altitude !== '') patch.altitude = Number(form.altitude);
        if (form.heartRate !== '') patch.heartRate = Number(form.heartRate);
        if (form.spo2 !== '') patch.spo2 = Number(form.spo2);
        if (form.temp !== '') patch.temp = Number(form.temp);
        if (form.fatigue !== '') patch.fatigue = Number(form.fatigue);
        if (form.stress !== '') patch.stress = Number(form.stress);
        if (form.respiration !== '') patch.respiration = Number(form.respiration);
        if (form.bpSystolic !== '') patch.bpSystolic = Number(form.bpSystolic);
        if (form.bpDiastolic !== '') patch.bpDiastolic = Number(form.bpDiastolic);
        await staffApiPatch(`/patients/${editor.patient.id}/`, patch);
        showToast('Soldier updated', 'success');
      }
      await refreshPatientList();
      setEditor(null);
    } catch (e) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await staffApiDelete(`/patients/${deleteTarget.id}/`);
      if (selectedPatient?.id === deleteTarget.id) setSelectedPatient(null);
      await refreshPatientList();
      showToast('Soldier removed', 'success');
      setDeleteTarget(null);
    } catch (e) {
      showToast(e.message || 'Delete failed', 'info');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soldiers"
        description="Register, edit, and manage soldier profiles. Start a session to connect sensors and hand off to a doctor."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Add soldier
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, rank..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant/50 bg-white text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading...</p>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <p className="text-on-surface-variant">No soldiers found.</p>
          <Button className="mt-4" icon={Plus} onClick={openCreate}>
            Add first soldier
          </Button>
        </GlassCard>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface-container-low">
                <th className="text-left px-4 py-3 label-caps text-[10px] text-secondary">ID</th>
                <th className="text-left px-4 py-3 label-caps text-[10px] text-secondary">Name</th>
                <th className="text-left px-4 py-3 label-caps text-[10px] text-secondary">Rank</th>
                <th className="text-left px-4 py-3 label-caps text-[10px] text-secondary">Status</th>
                <th className="text-right px-4 py-3 label-caps text-[10px] text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-outline-variant/20 hover:bg-surface-container-low/50 ${
                    selectedPatient?.id === p.id ? 'bg-secondary-container/10' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-secondary">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-primary">{p.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.rank}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => beginSession(p)}
                      className="text-secondary hover:underline text-xs mr-3 inline-flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-primary hover:underline text-xs mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="text-error hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <Modal
          open
          onClose={() => setEditor(null)}
          title={editor.mode === 'create' ? 'Register soldier' : `Edit — ${editor.patient.name}`}
          size="full"
        >
          <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
            {saveError && (
              <p className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">{saveError}</p>
            )}
            <p className="label-caps text-secondary text-[10px]">Profile</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {editor.mode === 'create' && (
                <label className="block sm:col-span-2">
                  <span className="text-xs text-on-surface-variant">Soldier ID *</span>
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-mono"
                    value={form.soldierId}
                    onChange={(e) => set('soldierId', e.target.value)}
                  />
                </label>
              )}
              <label className="block sm:col-span-2">
                <span className="text-xs text-on-surface-variant">Name *</span>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-on-surface-variant">Rank</span>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                  value={form.rank}
                  onChange={(e) => set('rank', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-on-surface-variant">Regiment</span>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                  value={form.regiment}
                  onChange={(e) => set('regiment', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-on-surface-variant">Status</span>
                <select
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {['stable', 'monitoring', 'critical', 'consultation'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-on-surface-variant">Location</span>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </label>
            </div>
            {editor.mode === 'edit' && (
              <>
                <p className="label-caps text-secondary text-[10px] mt-4">Vitals (optional correction)</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    ['altitude', 'Altitude'],
                    ['heartRate', 'HR'],
                    ['spo2', 'SpO2'],
                    ['temp', 'Temp'],
                    ['respiration', 'Resp'],
                    ['bpSystolic', 'BP Sys'],
                    ['bpDiastolic', 'BP Dia'],
                  ].map(([k, label]) => (
                    <label key={k} className="block">
                      <span className="text-xs text-on-surface-variant">{label}</span>
                      <input
                        className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                        value={form[k]}
                        onChange={(e) => set(k, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
            {editor.mode === 'create' && (
              <p className="text-xs text-on-surface-variant">
                Vitals are recorded automatically when sensors are connected during a session.
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editor.mode === 'create' ? 'Register' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="Delete soldier">
          <p className="text-sm text-on-surface-variant mb-6">
            Remove <strong>{deleteTarget.name}</strong> ({deleteTarget.id})? This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmDelete} loading={saving} className="bg-error">
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
