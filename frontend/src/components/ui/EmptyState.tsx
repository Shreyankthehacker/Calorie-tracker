import type { ReactNode } from 'react';

export function EmptyState({
  title,
  action,
  illustration = 'plate',
}: {
  title: string;
  action?: ReactNode;
  illustration?: 'plate' | 'target' | 'sun';
}) {
  return (
    <div className="empty-state">
      <span className="empty-art" aria-hidden="true">
        {illustration === 'target' ? <TargetArt /> : illustration === 'sun' ? <SunArt /> : <PlateArt />}
      </span>
      <p>{title}</p>
      {action}
    </div>
  );
}

function PlateArt() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72">
      <circle cx="36" cy="36" r="28" fill="#E7EEE8" />
      <circle cx="36" cy="36" r="18" fill="#FBF7F0" stroke="#C9D4C8" strokeWidth="2" />
      <circle cx="36" cy="36" r="6" fill="#E7EEE8" />
    </svg>
  );
}

function TargetArt() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72">
      <circle cx="36" cy="36" r="28" fill="#F3D9D0" />
      <circle cx="36" cy="36" r="18" fill="none" stroke="#D36B4A" strokeWidth="3" />
      <circle cx="36" cy="36" r="8" fill="#D36B4A" />
    </svg>
  );
}

function SunArt() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72">
      <circle cx="36" cy="36" r="28" fill="#F4E7B0" />
      <circle cx="36" cy="36" r="12" fill="#E6C84A" />
    </svg>
  );
}
