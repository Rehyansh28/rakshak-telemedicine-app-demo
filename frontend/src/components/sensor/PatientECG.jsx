import LiveECG from '../charts/LiveECG';
import MiniECG from '../charts/MiniECG';
import DataTag from './DataTag';
import { ecgOverlayText } from '../../services/sensorStatus';

/** The live ECG for a soldier with a sensor; otherwise the old dummy wave, labelled SIMULATED. */
export default function PatientECG({ soldierId, sensor, height = 80 }) {
  if (sensor.linked) {
    return <LiveECG soldierId={soldierId} height={height} overlay={ecgOverlayText(sensor)} />;
  }
  return (
    <div className="relative">
      <MiniECG height={height} patientId={soldierId} />
      <DataTag kind="simulated" className="absolute top-1 right-1" />
    </div>
  );
}
