import type { CSSProperties, ReactNode } from "react";

export function Tag({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) { return <span className={`tag ${className}`.trim()} style={style}>{children}</span>; }
export function Cell({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`cell ${className}`.trim()}>{children}</div>; }
export function Grid({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`grid ${className}`.trim()}>{children}</div>; }
export function HatchGutter({ side }: { side: "left" | "right" }) { return <div className={`hatch page-gutter page-gutter-${side}`} aria-hidden="true" />; }
export function DotShape({ type }: { type: "corner" | "sphere" | "plus" }) { return <div className={`dot-shape dot-shape-${type}`} aria-hidden="true"><i /><b /></div>; }
