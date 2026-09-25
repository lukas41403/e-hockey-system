// Simplified speech-bubble mark (not the WhatsApp logo) so the icon stays in the palette.
export function WhatsappIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.5 19.5l1.1-3.6A8 8 0 1 1 8.4 18.6z" strokeLinejoin="round" />
      <path d="M9.2 9.2c.3 1.9 1.7 3.4 3.6 3.9l1-1 1.9.9-.3 1.4c-3.3.3-6.6-3-6.4-6.3l1.4-.3.9 1.9z" fill="currentColor" stroke="none" />
    </svg>
  )
}
