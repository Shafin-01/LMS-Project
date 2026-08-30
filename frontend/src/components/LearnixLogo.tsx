// The Learnix brand mark: a fused "LX" monogram in white, on a rounded
// square filled with the exact same indigo-600 used by every primary
// button in the app (Sign Up, Enroll Now, Save Changes, etc.) — a flat
// solid color rather than a gradient, so the logo matches the app's own
// flat-color design language instead of introducing a look nothing else
// in the UI uses.
//
// Construction: the "L" and the "X" are not two separate letters placed
// side by side — they are drawn as ONE continuous stroke path (L's
// vertical stem -> L's foot -> the X's first diagonal), plus one more
// independent stroke for the X's second diagonal. Both strokes use
// stroke-linecap="round" and stroke-linejoin="round", so every corner and
// every place the strokes meet (including the L-foot / X-diagonal seam)
// is capped by a perfect round join with no gap or notch — this is what
// keeps the L and X reading as one fused mark instead of two letters that
// just happen to touch.
//
// This is a direct SVG re-expression of the approved raster draft
// (logo-drafts/variant_h_lx_matched.png), built on the same 0-24 unit
// grid, so the in-app logo, the browser tab favicon (src/app/icon.png /
// favicon.ico), and the approved design are all pixel-for-pixel the same
// mark.
export default function LearnixLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5.4" fill="#4f46e5" />
      {/* L: vertical stroke + foot, fused into the X's first diagonal */}
      <path
        d="M6.5 5 L6.5 17.3 L11.3 17.3 L18.9 5.8"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* X: second, independent diagonal stroke */}
      <line
        x1="11.9"
        y1="5.8"
        x2="19.1"
        y2="16.7"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
