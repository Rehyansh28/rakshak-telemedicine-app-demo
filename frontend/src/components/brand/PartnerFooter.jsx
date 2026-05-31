import { Shield } from 'lucide-react';
import IITJodhpurBadge from './IITJodhpurBadge';
import { BRAND } from '../../data/brand';

/** Splash / marketing footer: IIT Jodhpur + Indian Army. */
export default function PartnerFooter({ className = '' }) {
  return (
    <div className={`flex flex-col md:flex-row items-center gap-6 md:gap-8 ${className}`}>
      <IITJodhpurBadge size="lg" />
      <div className="hidden md:block w-px h-14 bg-outline-variant/50" />
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center bg-surface-container-low">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <span className="label-caps text-[10px] text-on-surface-variant block">Operational Unit</span>
          <p className="font-sora font-bold text-primary text-sm">{BRAND.armyUnit}</p>
        </div>
      </div>
    </div>
  );
}
