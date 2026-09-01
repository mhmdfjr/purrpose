"use client";

import * as React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md Section 4: strokeWidth 2.5 untuk konsistensi dengan border tebal neo brutalism (default lucide 2)
const DEFAULT_STROKE_WIDTH = 2.5;

type NeoIconProps = LucideProps & {
  icon: LucideIcon;
};

/**
 * Wrapper untuk Lucide icon dengan strokeWidth 2.5 default.
 * Usage:
 *   import { Trophy } from "lucide-react"
 *   import { NeoIcon } from "@/components/ui/neo-icon"
 *   <NeoIcon icon={Trophy} className="size-5" />
 *
 * Atau untuk override: <NeoIcon icon={Trophy} strokeWidth={2} />
 */
export function NeoIcon({ icon: Icon, className, strokeWidth = DEFAULT_STROKE_WIDTH, ...props }: NeoIconProps) {
  return <Icon strokeWidth={strokeWidth} className={cn(className)} {...props} />;
}

/**
 * HOC untuk membungkus icon agar default strokeWidth 2.5 tanpa mengubah call site per-icon.
 * Usage:
 *   import { Trophy } from "lucide-react"
 *   const TrophyNeo = withNeoStroke(Trophy)
 *   <TrophyNeo className="size-5" />
 */
export function withNeoStroke<P extends LucideProps>(Icon: LucideIcon) {
  const Wrapped = (props: P) => <Icon strokeWidth={DEFAULT_STROKE_WIDTH} {...(props as LucideProps)} />;
  Wrapped.displayName = `Neo(${Icon.displayName ?? Icon.name ?? "Icon"})`;
  return Wrapped;
}
