import Link from "next/link";

interface BackButtonProps {
  /** Where the button should navigate to. */
  href: string;
  /** The text shown next to the arrow, e.g. "Back to Courses". */
  label: string;
  /** Optional extra classes, e.g. to adjust spacing around the button. */
  className?: string;
}

/**
 * A standard, reusable "go back" button used across the app instead of a
 * plain "← Back to X" text link. Kept as one shared component so every
 * back-navigation control looks and behaves the same way everywhere.
 */
export default function BackButton({ href, label, className = "" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-4 w-4 shrink-0"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      {label}
    </Link>
  );
}