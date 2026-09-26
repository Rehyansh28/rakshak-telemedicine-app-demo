import DataTag from './DataTag';
import { isSensorAlert } from '../../services/sensorStatus';

/** Tags for an emergency alert: sensor alerts are EXPERIMENTAL (or REPLAY); ended ones are RESOLVED. */
export default function AlertTags({ alert }) {
  if (!isSensorAlert(alert)) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 mt-1.5">
      <DataTag kind="sensor" />
      <DataTag kind={alert.source === 'hub-replay' ? 'replay' : 'experimental'} />
      {alert.resolvedAt && <DataTag kind="resolved" />}
    </span>
  );
}
