import { useEffect, useState } from "react";
import {
  INSTALL_ANDROID,
  INSTALL_IOS,
  INSTALL_LEDE,
  INSTALL_TITLE,
  markInstallEducationSeen,
  readInstallEnv,
  shouldShowInstallEducation,
} from "../../lib/install-education.js";

export function InstallEducation({
  mode,
}: {
  mode: "settings" | "first-visit";
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const visible = shouldShowInstallEducation({
      ...readInstallEnv(),
      firstVisitOnly: mode === "first-visit",
    });
    if (!visible) return;
    setShow(true);
    if (mode === "first-visit") markInstallEducationSeen();
  }, [mode]);

  if (!show) return null;

  const body = (
    <>
      <h2>{INSTALL_TITLE}</h2>
      <p className="lede">{INSTALL_LEDE}</p>
      <p className="hint">{INSTALL_IOS}</p>
      <p className="hint">{INSTALL_ANDROID}</p>
    </>
  );

  if (mode === "settings") {
    return <div className="section sys-install">{body}</div>;
  }

  return (
    <section className="panel sys-install" aria-label={INSTALL_TITLE}>
      {body}
    </section>
  );
}
