import { Link } from 'react-router-dom';
import { BRAND } from '../../data/brand';

/**
 * App logo + wordmark for headers and auth screens.
 */
export default function BrandLogo({
  to,
  size = 'md',
  showText = true,
  className = '',
  onClick,
}) {
  const sizes = {
    sm: { img: 'h-8 w-8', text: 'text-sm' },
    md: { img: 'h-10 w-10', text: 'text-lg' },
    lg: { img: 'h-14 w-14', text: 'text-xl' },
    xl: { img: 'h-20 w-20 md:h-24 md:w-24', text: 'text-2xl md:text-3xl' },
    hero: { img: 'h-32 w-32 md:h-48 md:w-48', text: 'text-3xl md:text-5xl' },
  };
  const s = sizes[size] || sizes.md;

  const content = (
    <>
      <img
        src={BRAND.logo}
        alt={`${BRAND.name} logo`}
        className={`${s.img} object-contain shrink-0 drop-shadow-[0_0_20px_rgba(0,238,252,0.25)]`}
      />
      {showText && (
        <div className="min-w-0">
          <span className={`font-sora font-bold tracking-tight text-primary block ${s.text}`}>
            {BRAND.nameUpper}
          </span>
          {size === 'hero' && (
            <span className="label-caps text-[10px] text-on-surface-variant">{BRAND.tagline}</span>
          )}
        </div>
      )}
    </>
  );

  const wrapperClass = `flex items-center gap-3 ${className}`;

  if (to) {
    return (
      <Link to={to} className={`${wrapperClass} hover:opacity-90 transition-opacity`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${wrapperClass} text-left`}>
        {content}
      </button>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
