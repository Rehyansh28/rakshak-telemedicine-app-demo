import Breadcrumbs from './Breadcrumbs';

export default function PageHeader({ eyebrow, title, description, breadcrumbs, actions, className = '' }) {
  return (
    <header className={`mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {breadcrumbs?.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && <p className="label-caps text-secondary mb-1">{eyebrow}</p>}
        <h1 className="font-sora text-2xl md:text-3xl font-bold text-primary tracking-tight">{title}</h1>
        {description && (
          <p className="text-on-surface-variant text-sm mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
