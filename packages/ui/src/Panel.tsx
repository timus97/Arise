import type { ReactNode } from "react";

export type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className }: PanelProps) {
  return (
    <section className={className ? `panel sys-panel ${className}` : "panel sys-panel"}>
      {children}
    </section>
  );
}
