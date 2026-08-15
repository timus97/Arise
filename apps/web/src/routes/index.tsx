import { useQuery } from "@tanstack/react-query";
import { Link, createRoute } from "@tanstack/react-router";
import { getSession, sessionQueryKey } from "../lib/auth-client.js";
import { rootRoute } from "./__root.js";

function HomePage() {
  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  if (session.isPending) {
    return (
      <section className="panel">
        <h1>SYSTEM</h1>
        <p className="lede">Checking session…</p>
      </section>
    );
  }

  if (session.isError) {
    return (
      <section className="panel">
        <h1>SYSTEM</h1>
        <p className="banner banner-error" role="alert">
          {session.error instanceof Error
            ? session.error.message
            : "Could not reach the API."}
        </p>
      </section>
    );
  }

  if (session.data) {
    return (
      <section className="panel">
        <h1>SYSTEM</h1>
        <p className="lede">Session is attached on this origin.</p>
        <p className="banner banner-ok">
          Signed in. Player id <span className="mono">{session.data.userId}</span>
        </p>
        <p className="hint">
          The daily window ships later. Cookies stay on this host — the browser
          never calls :8787.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>SYSTEM</h1>
      <p className="lede">
        Arise issues today&apos;s work in a private SYSTEM window. Sign in or
        register on this origin so the session cookie attaches.
      </p>
      <div className="actions">
        <Link to="/login" className="btn">
          Sign in
        </Link>
        <Link to="/register" className="btn">
          Register
        </Link>
      </div>
    </section>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
