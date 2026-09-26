export default function Logo({ size = 32, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-label="AdForge logo">
        <rect x="1" y="1" width="34" height="34" rx="9" fill="#141417" stroke="#2A2A31" strokeWidth="1.5" />
        {/* forged A */}
        <path d="M9 27 L18 9 L27 27" stroke="#FF5A1F" strokeWidth="3.6" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M13.2 21.5 H22.8" stroke="#FAFAF7" strokeWidth="2.6" strokeLinecap="square" />
        {/* spark */}
        <path d="M26.5 8.5 L27.6 11 L30.1 12.1 L27.6 13.2 L26.5 15.7 L25.4 13.2 L22.9 12.1 L25.4 11 Z" fill="#FF8A5C" />
      </svg>
      {withWord && (
        <span className="font-display text-[19px] font-bold tracking-tight text-paper">
          AdForge
        </span>
      )}
    </span>
  );
}
