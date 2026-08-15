import { RegisterBody } from "@arise/domain";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MedicalDisclaimer } from "../components/disclaimer/MedicalDisclaimer.js";
import {
  formatAuthError,
  register,
  sessionQueryKey,
  type RegisterInput,
} from "../lib/auth-client.js";
import { rootRoute } from "./__root.js";

function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await navigate({ to: "/" });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsedAge = Number.parseInt(age, 10);
    const usernameTrimmed = username.trim();
    const body = {
      email: email.trim(),
      password,
      name: name.trim(),
      age: Number.isFinite(parsedAge) ? parsedAge : Number.NaN,
      inviteCode: inviteCode.trim(),
      acceptedMedicalDisclaimer: accepted ? (true as const) : false,
      ...(usernameTrimmed !== "" ? { username: usernameTrimmed } : {}),
    };

    const parsed = RegisterBody.safeParse(body);
    if (!parsed.success) {
      setFormError("Check email, name, age, password (min 10), and the medical notice.");
      return;
    }

    const input: RegisterInput = {
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      age: parsed.data.age,
      inviteCode: parsed.data.inviteCode ?? "",
      acceptedMedicalDisclaimer: true,
    };
    if (parsed.data.username !== undefined) {
      input.username = parsed.data.username;
    }
    mutation.mutate(input);
  }

  const error =
    formError ?? (mutation.isError ? formatAuthError(mutation.error) : null);

  return (
    <section className="panel">
      <h1>Register</h1>
      <p className="lede">
        Email is required. Username is optional. You must be 16 or older and
        present a valid invite code.
      </p>
      <form className="form" onSubmit={onSubmit}>
        {error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Username (optional)</span>
          <input
            name="username"
            autoComplete="username"
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_]+"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Age</span>
          <input
            name="age"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Invite code</span>
          <input
            name="inviteCode"
            autoComplete="off"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            required
          />
        </label>
        <MedicalDisclaimer
          checked={accepted}
          onChange={setAccepted}
          disabled={mutation.isPending}
        />
        <div className="actions">
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating account…" : "Create account"}
          </button>
          <Link to="/login">Already registered?</Link>
        </div>
      </form>
    </section>
  );
}

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});
