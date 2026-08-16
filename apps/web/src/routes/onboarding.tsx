import { Panel } from "@arise/ui";
import { useQuery } from "@tanstack/react-query";
import { Link, createRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "../features/onboarding/OnboardingWizard.js";
import { getSession, sessionQueryKey } from "../lib/auth-client.js";
import { rootRoute } from "./__root.js";

function OnboardingPage() {
  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  if (session.isPending) {
    return (
      <Panel>
        <h1>Onboarding</h1>
        <p className="lede">Checking session…</p>
      </Panel>
    );
  }

  if (session.isError) {
    return (
      <Panel>
        <h1>Onboarding</h1>
        <p className="banner banner-error" role="alert">
          {session.error instanceof Error
            ? session.error.message
            : "Could not reach the API."}
        </p>
      </Panel>
    );
  }

  if (!session.data) {
    return (
      <Panel>
        <h1>Onboarding</h1>
        <p className="lede">Sign in to start the six-step SYSTEM setup.</p>
        <div className="actions">
          <Link to="/login" className="btn">
            Sign in
          </Link>
          <Link to="/register" className="btn">
            Register
          </Link>
        </div>
      </Panel>
    );
  }

  return <OnboardingWizard />;
}

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});
