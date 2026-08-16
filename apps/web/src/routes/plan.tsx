import { Panel } from "@arise/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createRoute, useNavigate } from "@tanstack/react-router";
import {
  getPlan,
  isOnboardingRequired,
  isPregnancyHardStop,
  planQueryKey,
} from "../features/onboarding/client.js";
import {
  PREGNANCY_ALERT,
  PREGNANCY_CTA,
  PREGNANCY_LEDE,
  PREGNANCY_TITLE,
} from "../features/onboarding/copy.js";
import { PlanView } from "../features/onboarding/PlanView.js";
import { formatAuthError, getSession, sessionQueryKey } from "../lib/auth-client.js";
import { deleteAccount } from "../lib/settings-client.js";
import { rootRoute } from "./__root.js";

function PlanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const plan = useQuery({
    queryKey: planQueryKey,
    queryFn: getPlan,
    enabled: Boolean(session.data),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: "/login" });
    },
  });

  if (session.isPending) {
    return (
      <Panel>
        <h1>Plan</h1>
        <p className="lede">Checking session…</p>
      </Panel>
    );
  }

  if (session.isError) {
    return (
      <Panel>
        <h1>Plan</h1>
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
        <h1>Plan</h1>
        <p className="lede">Sign in to view the 7-day plan.</p>
        <div className="actions">
          <Link to="/login" className="btn">
            Sign in
          </Link>
        </div>
      </Panel>
    );
  }

  if (plan.isPending) {
    return (
      <Panel>
        <h1>Plan</h1>
        <p className="lede">Loading this week…</p>
      </Panel>
    );
  }

  if (plan.isError) {
    if (isPregnancyHardStop(plan.error)) {
      return (
        <Panel>
          <h1>{PREGNANCY_TITLE}</h1>
          <p className="banner banner-error" role="alert">
            {PREGNANCY_ALERT}
          </p>
          <p className="lede">{PREGNANCY_LEDE}</p>
          {deleteMutation.isError ? (
            <p className="banner banner-error" role="alert">
              {formatAuthError(deleteMutation.error)}
            </p>
          ) : null}
          <div className="actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : PREGNANCY_CTA}
            </button>
          </div>
        </Panel>
      );
    }

    if (isOnboardingRequired(plan.error)) {
      return (
        <Panel>
          <h1>Plan</h1>
          <p className="lede">Onboarding is required before a plan exists.</p>
          <div className="actions">
            <Link to="/onboarding" className="btn btn-primary">
              Continue to onboarding
            </Link>
          </div>
        </Panel>
      );
    }

    return (
      <Panel>
        <h1>Plan</h1>
        <p className="banner banner-error" role="alert">
          {formatAuthError(plan.error)}
        </p>
        <div className="actions">
          <Link to="/onboarding" className="btn">
            Open onboarding
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <h1>7-day plan</h1>
      <p className="lede">
        Version {plan.data.plan.version} · {plan.data.plan.startDate} – {plan.data.plan.endDate}
      </p>
      <PlanView preview={plan.data} />
    </Panel>
  );
}

export const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan",
  component: PlanPage,
});
