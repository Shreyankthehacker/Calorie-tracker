export function TimeOfDayMark({ hour = new Date().getHours() }: { hour?: number }) {
  if (hour < 12) {
    return (
      <svg className="greeting-mark" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
        <circle cx="24" cy="28" r="10" fill="#E6C84A" />
        <path d="M8 34c8-10 24-10 32 0" fill="none" stroke="#F4E7B0" strokeWidth="4" />
      </svg>
    );
  }
  if (hour < 18) {
    return (
      <svg className="greeting-mark" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
        <circle cx="24" cy="24" r="10" fill="#E6C84A" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="23"
            y="4"
            width="2"
            height="7"
            rx="1"
            fill="#C9A62A"
            transform={`rotate(${deg} 24 24)`}
          />
        ))}
      </svg>
    );
  }
  return (
    <svg className="greeting-mark" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle cx="24" cy="24" r="16" fill="#1E241C" />
      <circle cx="20" cy="22" r="10" fill="#F4E7B0" />
      <circle cx="16" cy="20" r="10" fill="#1E241C" />
    </svg>
  );
}
