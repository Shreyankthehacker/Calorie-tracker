export function SkeletonBlock({ label }: { label: string }) {
  return (
    <div className="skeleton-stack" aria-busy="true">
      <p className="sr-only">{label}</p>
      <div className="skeleton skeleton-lg" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
