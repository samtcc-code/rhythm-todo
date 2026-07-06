// Source of truth for the Eisenhower Matrix color story.
// Change these values here and every badge, header, and pill picks them up.

export type QuadrantKey = "doNow" | "doLater" | "delegate" | "delete";

interface QuadrantMeta {
  label: string;
  text: string;
  bg: string;
  border: string;
}

export const quadrantMeta: Record<QuadrantKey, QuadrantMeta> = {
  doNow: {
    label: "Do Now",
    text:   "text-[#156A6B] dark:text-[#73B5B6]",
    bg:     "bg-[#156A6B]/20 dark:bg-[#156A6B]/30",
    border: "border-[#8EB4B5] dark:border-[#0D4B4C]",
  },
  doLater: {
    label: "Do Later",
    text:   "text-[#668F90] dark:text-[#A9C4C4]",
    bg:     "bg-[#7FA5A6]/10 dark:bg-[#7FA5A6]/15",
    border: "border-[#B7CDCD] dark:border-[#486D6E]",
  },
  delegate: {
    label: "Delegate",
    text:   "text-[#B98200] dark:text-[#FFD86B]",
    bg:     "bg-[#FFC531]/15 dark:bg-[#FFC531]/15",
    border: "border-[#FFE08A] dark:border-[#806219]",
  },
  delete: {
    label: "Delete",
    text:   "text-[#D94D00] dark:text-[#FF9B63]",
    bg:     "bg-[#FF6712]/10 dark:bg-[#FF6712]/15",
    border: "border-[#FFB087] dark:border-[#7F3309]",
  },
};

export function quadrantKeyFromFlags(isUrgent: boolean, isImportant: boolean): QuadrantKey {
  if (isUrgent && isImportant) return "doNow";
  if (!isUrgent && isImportant) return "doLater";
  if (isUrgent && !isImportant) return "delegate";
  return "delete";
}

export function quadrantLabel(q: string): string {
  return quadrantMeta[q as QuadrantKey]?.label ?? q;
}

// Full badge classes (bg + text + border) — used with variant="outline" Badge.
export function quadrantBadgeClass(q: string): string {
  const m = quadrantMeta[q as QuadrantKey];
  if (!m) return "";
  return `${m.text} ${m.bg} ${m.border}`;
}

// Bg + text only (no border) — used on filled pills like Today mobile.
export function quadrantPillClass(q: string): string {
  const m = quadrantMeta[q as QuadrantKey];
  if (!m) return "";
  return `${m.text} ${m.bg}`;
}

// Text only — used to color icons/labels inline.
export function quadrantTextClass(q: string): string {
  return quadrantMeta[q as QuadrantKey]?.text ?? "";
}

// Convenience for quadrant "card" (MatrixView-style large panel).
export function quadrantCardClass(q: string): string {
  const m = quadrantMeta[q as QuadrantKey];
  if (!m) return "";
  return `${m.bg} ${m.border}`;
}
