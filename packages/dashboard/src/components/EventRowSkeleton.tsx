/**
 * Loading skeleton for event list rows.
 */
export function EventRowSkeleton() {
  return (
    <div className="event-row skeleton-row" aria-hidden="true">
      <div className="skeleton skeleton-badge" />
      <div className="skeleton skeleton-text skeleton-text-long" />
      <div className="skeleton skeleton-text skeleton-text-medium" />
      <div className="skeleton skeleton-text skeleton-text-short" />
      <div className="skeleton skeleton-text skeleton-text-short" />
    </div>
  );
}

export function EventListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="event-list-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <EventRowSkeleton key={i} />
      ))}
    </div>
  );
}
