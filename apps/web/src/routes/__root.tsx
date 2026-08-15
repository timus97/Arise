import { Outlet, createRootRoute, Link, useRouterState } from "@tanstack/react-router";
import { MedicalDisclaimer } from "../components/disclaimer/MedicalDisclaimer.js";

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="shell">
      <header className="chrome">
        <p className="chrome-mark">SYSTEM</p>
        <span className="chrome-product">Arise</span>
      </header>
      <nav className="chrome-nav" aria-label="Primary">
        <Link to="/" aria-current={pathname === "/" ? "page" : undefined}>
          Home
        </Link>
        <Link to="/login" aria-current={pathname === "/login" ? "page" : undefined}>
          Sign in
        </Link>
        <Link
          to="/register"
          aria-current={pathname === "/register" ? "page" : undefined}
        >
          Register
        </Link>
      </nav>
      <main className="main">
        <Outlet />
        <MedicalDisclaimer />
      </main>
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});
