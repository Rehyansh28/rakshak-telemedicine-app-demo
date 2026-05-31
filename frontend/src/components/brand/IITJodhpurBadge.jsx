import { BRAND } from '../../data/brand';

/** IIT Jodhpur institutional mark — footers, reports, splash. */
export default function IITJodhpurBadge({ size = 'md', showLabel = true, className = '' }) {
  const imgClass =
    size === 'sm' ? 'h-10' : size === 'lg' ? 'h-16 md:h-20' : 'h-12 md:h-14';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={BRAND.iitJodhpurLogo}
        alt={`${BRAND.iitJodhpurLabel} logo`}
        className={`${imgClass} w-auto object-contain`}
      />
      {showLabel && (
        <div>
          <span className="label-caps text-[10px] text-on-surface-variant block">Developed by</span>
          <p className="font-sora font-bold text-primary text-sm leading-tight">
            {BRAND.iitJodhpurLabel}
          </p>
          <p className="text-xs text-on-surface-variant">{BRAND.iitJodhpurUnit}</p>
        </div>
      )}
    </div>
  );
}
