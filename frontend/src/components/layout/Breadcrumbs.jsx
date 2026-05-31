import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 flex-wrap text-sm mb-2">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-outline-variant shrink-0" />}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="label-caps text-[10px] text-on-surface-variant hover:text-secondary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`label-caps text-[10px] ${isLast ? 'text-secondary' : 'text-on-surface-variant'}`}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
