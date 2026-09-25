// App mark: center-ice circle with the face-off dot, split by the red line.
export function RinkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="var(--boards)" />
      <circle cx="24" cy="24" r="13" fill="none" stroke="#7fa6ff" strokeWidth="3" />
      <line x1="24" y1="4" x2="24" y2="44" stroke="#ff5a6e" strokeWidth="3" />
      <circle cx="24" cy="24" r="4" fill="#ffffff" />
    </svg>
  )
}
