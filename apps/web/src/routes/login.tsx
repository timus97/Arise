import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { formatAuthError, login, sessionQueryKey } from "../lib/auth-client.js";
import { rootRoute } from "./__root.js";

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => login({ identifier, password }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await navigate({ to: "/" });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!identifier.trim()) {
      setFormError("Email or username is required.");
      return;
    }
    if (password.length < 10) {
      setFormError("Password must be at least 10 characters.");
      return;
    }
    mutation.mutate();
  }

  const error =
    formError ?? (mutation.isError ? formatAuthError(mutation.error) : null);

  return (
    <section className="panel">
      <h1>Sign in</h1>
      <p className="lede">Email or username, plus password. Same-origin cookies only.</p>
      <form className="form" onSubmit={onSubmit}>
        {error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span>Email or username</span>
          <input
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <div className="actions">
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in…" : "Sign in"}
          </button>
          <Link to="/register">Need an account?</Link>
        </div>
      </form>
    </section>
  );
}

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});
