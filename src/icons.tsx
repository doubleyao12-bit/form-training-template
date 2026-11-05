// Template-native system-font glyphs. No inherited SVG paths, icon pack or font files.
import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement> & { size?: number };
const Glyph = ({ symbol, size = 24, ...props }: Props & { symbol: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <text x="12" y="17" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="20" fill="currentColor" stroke="none">{symbol}</text>
  </svg>
);
export const Activity = (props: Props) => <Glyph symbol="~" {...props} />;
export const Dumbbell = (props: Props) => <Glyph symbol="H" {...props} />;
export const Layers3 = (props: Props) => <Glyph symbol="≡" {...props} />;
export const Plus = (props: Props) => <Glyph symbol="+" {...props} />;
export const Search = (props: Props) => <Glyph symbol="⌕" {...props} />;
export const X = (props: Props) => <Glyph symbol="×" {...props} />;
export const ChevronDown = (props: Props) => <Glyph symbol="⌄" {...props} />;
export const SlidersHorizontal = (props: Props) => <Glyph symbol="☷" {...props} />;
export const Filter = (props: Props) => <Glyph symbol="▽" {...props} />;
export const Sparkles = (props: Props) => <Glyph symbol="✦" {...props} />;
export const ArrowLeft = (props: Props) => <Glyph symbol="←" {...props} />;
export const Edit3 = (props: Props) => <Glyph symbol="✎" {...props} />;
