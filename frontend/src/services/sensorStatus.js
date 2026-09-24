/**
 * Turns the hub's live data into one status for a soldier's sensor (EXPERIMENTAL).
 *
 * status:
 *   'none'          this soldier has no sensor -> the page shows SIMULATED values
 *   'hub-offline'   the hub program is not running / not reachable
 *   'waiting'       hub runs, but no data from this soldier's sensor yet
 *   'disconnected'  the hub lost the sensor (USB unplugged, ESP32 off)
 *   'stale'         data stopped arriving (agoS seconds ago)
 *   'leads-off'     an ECG electrode is off
 *   'signal-poor'   ECG signal flat / stuck / clipping (e.g. loose wire)
 *   'live'          all good - hr is the real (experimental) heart rate
 */
import { hubStream } from './hubStream';

const SUMMARY_OLD_S = 4;
const ECG_OLD_S = 3;

export function describeSensor(soldierId, backend) {
  const device = soldierId ? hubStream.devices.get(soldierId) : undefined;
  const linked = Boolean(device) || Boolean(backend?.latest);
  const base = { soldierId, linked, device: device || null, hr: null, agoS: null };
  if (!linked) return { ...base, status: 'none' };
  if (hubStream.connection !== 'open') return { ...base, status: 'hub-offline' };
  if (!device) return { ...base, status: 'waiting' };
  if (!device.connected) return { ...base, status: 'disconnected', agoS: Math.round(device.lastSeenAgoS ?? 0) };
  const summaryAge = (Date.now() - hubStream.lastSummaryAt) / 1000;
  if (summaryAge > SUMMARY_OLD_S) return { ...base, status: 'stale', agoS: Math.round(summaryAge) };
  if (device.leadsOff) return { ...base, status: 'leads-off' };
  if (device.ecgSignal && device.ecgSignal !== 'ok') return { ...base, status: 'signal-poor' };
  const ecg = hubStream.getEcg(soldierId);
  const ecgAge = ecg?.lastAt ? (performance.now() - ecg.lastAt) / 1000 : Infinity;
  if (ecgAge > ECG_OLD_S) {
    return { ...base, status: 'stale', agoS: Number.isFinite(ecgAge) ? Math.round(ecgAge) : null };
  }
  return { ...base, status: 'live', hr: device.hr ?? null };
}

/** Badge text + colour style for a status (null = no badge). */
export function sensorBadge(info) {
  switch (info.status) {
    case 'live':
      return { label: 'Live sensor', tone: 'good' };
    case 'waiting':
      return { label: 'Waiting for sensor', tone: 'idle' };
    case 'hub-offline':
      return { label: 'Hub offline', tone: 'idle' };
    case 'disconnected':
      return { label: 'Sensor disconnected', tone: 'bad' };
    case 'leads-off':
      return { label: 'Electrodes off', tone: 'warn' };
    case 'signal-poor':
      return { label: 'ECG signal poor', tone: 'warn' };
    case 'stale':
      return { label: info.agoS != null ? `Data old · ${info.agoS}s` : 'No ECG data', tone: 'warn' };
    default:
      return null;
  }
}

/** Short text shown over the ECG graph when it is not showing good live data. */
export function ecgOverlayText(info) {
  switch (info.status) {
    case 'hub-offline':
      return 'Hub offline - start the hub to see the live ECG';
    case 'waiting':
      return 'Waiting for the sensor...';
    case 'disconnected':
      return 'Sensor disconnected';
    case 'leads-off':
      return 'Electrodes off - check the ECG pads';
    case 'signal-poor':
      return 'ECG signal poor - check wires and pads';
    case 'stale':
      return info.agoS != null ? `No new ECG data for ${info.agoS}s` : 'No ECG data';
    default:
      return null;
  }
}

const POSTURE_TEXT = { upright: 'Upright', leaning: 'Leaning', lying: 'Lying down', unknown: 'Calibrating' };

const CURRENT = new Set(['live', 'leads-off', 'signal-poor']);

/** e.g. "Lying down (back) · still 12 s" - or null when there is no current posture data. */
export function postureText(info) {
  const device = info.device;
  if (!device || !CURRENT.has(info.status)) return null;
  if (device.calibrating) return 'Calibrating - stand still';
  const parts = [];
  if (device.posture) {
    parts.push(POSTURE_TEXT[device.posture] || device.posture);
    if (device.lyingSide) parts[0] += ` (${device.lyingSide})`;
  }
  if (device.activity === 'moving') parts.push('moving');
  else if (device.activity === 'still') parts.push(device.stillForS ? `still ${device.stillForS} s` : 'still');
  return parts.length ? parts.join(' · ') : null;
}
