import type { ReactNode } from "react";

export type QuestCardVariant = "training" | "penalty" | "habit";

export type QuestCardProps = {
  title: string;
  kindChip: string;
  prescription: string;
  xpLine?: string;
  status?: string;
  variant?: QuestCardVariant;
  done?: boolean;
  children?: ReactNode;
};

export function QuestCard({
  title,
  kindChip,
  prescription,
  variant = "training",
  done = false,
  children,
  ...rest
}: QuestCardProps) {
  const classes = ["sys-quest"];
  if (variant === "penalty") classes.push("sys-quest-penalty");
  if (variant === "habit") classes.push("sys-quest-habit");
  if (done) classes.push("sys-quest-done");

  return (
    <article className={classes.join(" ")}>
      <div className="sys-quest-kind">{kindChip}</div>
      <h3>{title}</h3>
      {rest.status && rest.status !== "issued" ? (
        <p className="sys-quest-status">{rest.status.replaceAll("_", " ")}</p>
      ) : null}
      <p className="sys-quest-rx">{prescription}</p>
      {rest.xpLine ? <p className="sys-quest-xp">{rest.xpLine}</p> : null}
      {children ? <div className="actions">{children}</div> : null}
    </article>
  );
}
