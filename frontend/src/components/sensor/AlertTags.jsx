import DataTag from './DataTag';

/** Tags for an emergency alert: sensor alerts are EXPERIMENTAL; ended ones are RESOLVED. */
export default function AlertTags({ alert }) {
  if (alert.source !== 'hub') return null;
  return (
    <span className="inline-flex flex-wrap gap-1 mt-1.5">
      <DataTag kind="sensor" />
      <DataTag kind="experimental" />
      {alert.resolvedAt && <DataTag kind="resolved" />}
    </span>
  );
}
