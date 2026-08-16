import type { GoalType, Units } from "@arise/domain";
import { Panel } from "@arise/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MedicalDisclaimer } from "../../components/disclaimer/MedicalDisclaimer.js";
import { ApiRequestError } from "../../lib/api.js";
import { formatAuthError } from "../../lib/auth-client.js";
import { defaultTimeZone, isIanaTimeZone } from "../../lib/settings-client.js";
import {
  displayLength,
  displayMass,
  storeLengthCm,
  storeMassKg,
} from "../../lib/units.js";
import {
  deleteOnboardingAccount,
  isPregnancyHardStop,
  previewPlan,
  submitAfterPreview,
  submitOnboarding,
} from "./client.js";
import {
  BACK,
  CONFIRM_PLAN,
  CONTINUE,
  EASY_ONLY_BANNER,
  EASY_ONLY_CTA,
  EASY_ONLY_LEDE,
  EASY_ONLY_TITLE,
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  INJURY_PRESETS,
  JOB_LABELS,
  PARQ_LABELS,
  PREGNANCY_ALERT,
  PREGNANCY_CTA,
  PREGNANCY_LEDE,
  PREGNANCY_TITLE,
  PREVIEW_EMPTY,
  PREVIEW_LOADING,
  STEP_COUNT,
  STEP_LEDES,
  STEP_TITLES,
  UNSAFE_CTA,
  UNSAFE_LEDE,
  UNSAFE_TITLE,
  WEEKDAY_LABELS,
  unsafeLossAlert,
} from "./copy.js";
import { bodyForPregnancyPut, toOnboardingBody } from "./draft.js";
import { emptyDraft } from "./fixture.js";
import { PlanView } from "./PlanView.js";
import {
  PARQ_KEYS,
  type DietPreference,
  type EquipmentId,
  type Experience,
  type JobActivity,
  type OnboardingDraft,
  type ParqKey,
  type Sex,
} from "./types.js";
import {
  advance,
  applyPreview,
  applyPregnancyStop,
  applyWizardError,
  canAdvance,
  canGoBack,
  createWizard,
  goBack,
  isDeadEnd,
  patchDraft,
  type WizardState,
} from "./wizard.js";
import "./onboarding.css";

const GOAL_TYPES = Object.keys(GOAL_LABELS) as GoalType[];
const EQUIPMENT_IDS = Object.keys(EQUIPMENT_LABELS) as EquipmentId[];
const JOB_IDS = Object.keys(JOB_LABELS) as JobActivity[];
const EXPERIENCE: Experience[] = [0, 1, 2, 3];
const DIETS: DietPreference[] = ["omnivore", "vegetarian", "vegan", "unspecified"];
const SEXES: Sex[] = ["female", "male", "other", "unspecified"];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<WizardState>(() =>
    createWizard(emptyDraft(defaultTimeZone())),
  );
  const [injuryDraft, setInjuryDraft] = useState("");
  const previewStarted = useRef(false);

  const previewMutation = useMutation({
    mutationFn: previewPlan,
    onSuccess: (preview) => {
      setState((current) => applyPreview(current, preview));
    },
    onError: (err) => {
      setState((current) =>
        applyWizardError(current, toWizardError(err)),
      );
    },
  });

  const persistMutation = useMutation({
    mutationFn: submitAfterPreview,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await navigate({ to: "/" });
    },
    onError: (err) => {
      setState((current) => applyWizardError(current, toWizardError(err)));
    },
  });

  const pregnancyMutation = useMutation({
    mutationFn: submitOnboarding,
    onSuccess: () => {
      setState((current) => applyPregnancyStop(current));
    },
    onError: (err) => {
      if (isPregnancyHardStop(err)) {
        setState((current) => applyPregnancyStop(current));
        return;
      }
      setState((current) => applyWizardError(current, toWizardError(err)));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOnboardingAccount,
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: "/login" });
    },
  });

  const step = state.phase.kind === "step" ? state.phase.step : 2;

  useEffect(() => {
    if (state.phase.kind !== "step" || state.phase.step !== 6) {
      previewStarted.current = false;
      return;
    }
    if (state.previewLoaded || previewStarted.current) return;
    const body = toOnboardingBody(state.draft);
    if (!body) return;
    previewStarted.current = true;
    previewMutation.mutate(body);
  }, [state.phase, state.draft, state.previewLoaded, previewMutation]);

  function update(patch: Partial<OnboardingDraft>) {
    setState((current) => patchDraft(current, patch));
  }

  function onContinue() {
    const result = advance(state);
    setState(result.state);
    if (result.intent === "putPregnancy") {
      const body = bodyForPregnancyPut(result.state.draft);
      if (!body) {
        setState((current) => ({
          ...current,
          error: "Fill the medical notice so the account can be closed.",
        }));
        return;
      }
      pregnancyMutation.mutate(body);
      return;
    }
    if (result.intent === "loadPreview") {
      const body = toOnboardingBody(result.state.draft);
      if (body) previewMutation.mutate(body);
      return;
    }
    if (result.intent === "persist") {
      const body = toOnboardingBody(result.state.draft);
      if (body) persistMutation.mutate(body);
    }
  }

  function onBack() {
    setState((current) => goBack(current));
  }

  function onUnits(next: Units) {
    const current = state.draft;
    if (current.units === next) return;
    const height = Number(current.height);
    const weight = Number(current.weight);
    const target = Number(current.targetWeight);
    update({
      units: next,
      height: Number.isFinite(height) && height > 0
        ? String(round1(displayLength(storeLengthCm(height, current.units), next)))
        : current.height,
      weight: Number.isFinite(weight) && weight > 0
        ? String(round1(displayMass(storeMassKg(weight, current.units), next)))
        : current.weight,
      targetWeight:
        current.targetWeight.trim() !== "" && Number.isFinite(target) && target > 0
          ? String(round1(displayMass(storeMassKg(target, current.units), next)))
          : current.targetWeight,
    });
  }

  function toggleEquipment(id: EquipmentId) {
    setState((current) =>
      patchDraft(current, (draft) => ({
        ...draft,
        equipment: draft.equipment.includes(id)
          ? draft.equipment.filter((item) => item !== id)
          : [...draft.equipment, id],
      })),
    );
  }

  function toggleInjury(name: string) {
    setState((current) =>
      patchDraft(current, (draft) => ({
        ...draft,
        injuries: draft.injuries.includes(name)
          ? draft.injuries.filter((item) => item !== name)
          : [...draft.injuries, name],
      })),
    );
  }

  function toggleWeekday(weekday: number) {
    setState((current) =>
      patchDraft(current, (draft) => {
        const exists = draft.week.some((day) => day.weekday === weekday);
        return {
          ...draft,
          week: exists
            ? draft.week.filter((day) => day.weekday !== weekday)
            : [...draft.week, { weekday, minutes: 40 }].sort((a, b) => a.weekday - b.weekday),
        };
      }),
    );
  }

  function setWeekMinutes(weekday: number, minutes: number) {
    setState((current) =>
      patchDraft(current, (draft) => ({
        ...draft,
        week: draft.week.map((day) =>
          day.weekday === weekday ? { ...day, minutes } : day,
        ),
      })),
    );
  }

  if (isDeadEnd(state)) {
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

  if (state.phase.kind === "easyOnly") {
    return (
      <Panel>
        <StepDots step={2} />
        <h1>{EASY_ONLY_TITLE}</h1>
        <p className="banner banner-warn">{EASY_ONLY_BANNER}</p>
        <p className="lede">{EASY_ONLY_LEDE}</p>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            {BACK}
          </button>
          <button type="button" className="btn btn-primary" onClick={onContinue}>
            {EASY_ONLY_CTA}
          </button>
        </div>
      </Panel>
    );
  }

  const busy =
    previewMutation.isPending || persistMutation.isPending || pregnancyMutation.isPending;
  const mutationError = persistMutation.isError
    ? formatAuthError(persistMutation.error)
    : pregnancyMutation.isError && !isPregnancyHardStop(pregnancyMutation.error)
      ? formatAuthError(pregnancyMutation.error)
      : previewMutation.isError
        ? formatAuthError(previewMutation.error)
        : null;
  const error = state.error ?? mutationError;
  const unsafe = state.unsafeMaxKgPerWeek;

  return (
    <Panel>
      <StepDots step={step} />
      <h1>{STEP_TITLES[step]}</h1>
      <p className="lede">{STEP_LEDES[step]}</p>

      {unsafe !== null && step === 3 ? (
        <>
          <h2>{UNSAFE_TITLE}</h2>
          <p className="banner banner-error" role="alert">
            {unsafeLossAlert(unsafe)}
          </p>
          <p className="lede">{UNSAFE_LEDE}</p>
          <p className="hint">{UNSAFE_CTA}</p>
        </>
      ) : null}

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <MedicalDisclaimer
          checked={state.draft.acceptedMedicalDisclaimer}
          onChange={(checked) => update({ acceptedMedicalDisclaimer: checked })}
          disabled={busy}
        />
      ) : null}

      {step === 2 ? <ParqFields draft={state.draft} onChange={update} /> : null}

      {step === 3 ? (
        <BodyGoalFields draft={state.draft} onChange={update} onUnits={onUnits} />
      ) : null}

      {step === 4 ? <LifeFields draft={state.draft} onChange={update} /> : null}

      {step === 5 ? (
        <TrainingFields
          draft={state.draft}
          injuryDraft={injuryDraft}
          setInjuryDraft={setInjuryDraft}
          onChange={update}
          toggleEquipment={toggleEquipment}
          toggleInjury={toggleInjury}
          toggleWeekday={toggleWeekday}
          setWeekMinutes={setWeekMinutes}
        />
      ) : null}

      {step === 6 ? (
        state.preview ? (
          <PlanView preview={state.preview} />
        ) : (
          <p className="hint">{previewMutation.isPending ? PREVIEW_LOADING : PREVIEW_EMPTY}</p>
        )
      ) : null}

      <div className="actions">
        {canGoBack(state) ? (
          <button type="button" className="btn btn-ghost" onClick={onBack} disabled={busy}>
            {BACK}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onContinue}
          disabled={!canAdvance(state) || busy || (step === 6 && !state.preview)}
        >
          {step === 6
            ? persistMutation.isPending
              ? "Saving plan…"
              : CONFIRM_PLAN
            : pregnancyMutation.isPending
              ? "Checking…"
              : CONTINUE}
        </button>
      </div>
    </Panel>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <ol className="onb-steps" aria-label={`Step ${step} of ${STEP_COUNT}`}>
      {Array.from({ length: STEP_COUNT }, (_, index) => {
        const n = index + 1;
        return (
          <li
            key={n}
            className="onb-step"
            aria-current={n === step ? "step" : undefined}
            data-done={n < step ? "true" : "false"}
          >
            <span className="sr-only">
              Step {n}
              {n === step ? " current" : n < step ? " done" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ParqFields({
  draft,
  onChange,
}: {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
}) {
  return (
    <div className="form">
      {PARQ_KEYS.map((key) => (
        <div className="field" key={key}>
          <span>{PARQ_LABELS[key]}</span>
          <YesNo
            name={key}
            value={draft.parq[key]}
            onChange={(next) =>
              onChange({ parq: { ...draft.parq, [key]: next } })
            }
          />
        </div>
      ))}
    </div>
  );
}

function BodyGoalFields({
  draft,
  onChange,
  onUnits,
}: {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onUnits: (units: Units) => void;
}) {
  const massUnit = draft.units === "imperial" ? "lb" : "kg";
  const lengthUnit = draft.units === "imperial" ? "in" : "cm";
  return (
    <div className="form">
      <label className="field">
        <span>Age</span>
        <input
          name="age"
          type="number"
          inputMode="numeric"
          min={16}
          max={100}
          step={1}
          value={draft.age}
          onChange={(event) => onChange({ age: event.target.value })}
          required
        />
      </label>
      <label className="field">
        <span>Sex (optional)</span>
        <select
          name="sex"
          value={draft.sex}
          onChange={(event) => onChange({ sex: event.target.value as Sex | "" })}
        >
          <option value="">Prefer not to say</option>
          {SEXES.map((sex) => (
            <option key={sex} value={sex}>
              {sex}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Units</span>
        <div className="seg" role="group" aria-label="Units">
          <button
            type="button"
            className="btn"
            aria-pressed={draft.units === "metric"}
            onClick={() => onUnits("metric")}
          >
            Metric
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={draft.units === "imperial"}
            onClick={() => onUnits("imperial")}
          >
            Imperial
          </button>
        </div>
      </div>
      <label className="field">
        <span>Height ({lengthUnit})</span>
        <input
          name="height"
          type="number"
          inputMode="decimal"
          min={1}
          step="0.1"
          value={draft.height}
          onChange={(event) => onChange({ height: event.target.value })}
          required
        />
      </label>
      <label className="field">
        <span>Weight ({massUnit})</span>
        <input
          name="weight"
          type="number"
          inputMode="decimal"
          min={1}
          step="0.1"
          value={draft.weight}
          onChange={(event) => onChange({ weight: event.target.value })}
          required
        />
      </label>
      <div className="field">
        <span>Goal</span>
        <div className="seg" role="group" aria-label="Goal">
          {GOAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="btn"
              aria-pressed={draft.goalType === type}
              onClick={() => onChange({ goalType: type })}
            >
              {GOAL_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Target weight optional ({massUnit})</span>
        <input
          name="targetWeight"
          type="number"
          inputMode="decimal"
          min={1}
          step="0.1"
          value={draft.targetWeight}
          onChange={(event) => onChange({ targetWeight: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Target date optional</span>
        <input
          name="targetDate"
          type="date"
          value={draft.targetDate}
          onChange={(event) => onChange({ targetDate: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Time zone</span>
        <input
          name="timeZone"
          autoComplete="off"
          value={draft.timeZone}
          onChange={(event) => onChange({ timeZone: event.target.value })}
          placeholder="Europe/Stockholm"
          required
        />
      </label>
      {draft.timeZone.trim() !== "" && !isIanaTimeZone(draft.timeZone) ? (
        <p className="hint">Enter a valid IANA timezone such as Europe/Stockholm.</p>
      ) : null}
    </div>
  );
}

function LifeFields({
  draft,
  onChange,
}: {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
}) {
  return (
    <div className="form">
      <label className="field">
        <span>Sleep window start</span>
        <input
          name="sleepStart"
          type="time"
          value={draft.sleepStart}
          onChange={(event) => onChange({ sleepStart: normalizeTime(event.target.value) })}
          required
        />
      </label>
      <label className="field">
        <span>Sleep window end</span>
        <input
          name="sleepEnd"
          type="time"
          value={draft.sleepEnd}
          onChange={(event) => onChange({ sleepEnd: normalizeTime(event.target.value) })}
          required
        />
      </label>
      <div className="field">
        <span>Job activity</span>
        <div className="seg" role="group" aria-label="Job activity">
          {JOB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="btn"
              aria-pressed={draft.jobActivity === id}
              onClick={() => onChange({ jobActivity: id })}
            >
              {JOB_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Commute walk minutes</span>
        <input
          name="commuteWalkMinutes"
          type="number"
          inputMode="numeric"
          min={0}
          max={300}
          step={1}
          value={draft.commuteWalkMinutes}
          onChange={(event) => onChange({ commuteWalkMinutes: event.target.value })}
          required
        />
      </label>
      <label className="field">
        <span>Diet preference</span>
        <select
          name="dietPreference"
          value={draft.dietPreference}
          onChange={(event) =>
            onChange({ dietPreference: event.target.value as DietPreference })
          }
        >
          {DIETS.map((diet) => (
            <option key={diet} value={diet}>
              {diet}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TrainingFields({
  draft,
  injuryDraft,
  setInjuryDraft,
  onChange,
  toggleEquipment,
  toggleInjury,
  toggleWeekday,
  setWeekMinutes,
}: {
  draft: OnboardingDraft;
  injuryDraft: string;
  setInjuryDraft: (value: string) => void;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  toggleEquipment: (id: EquipmentId) => void;
  toggleInjury: (name: string) => void;
  toggleWeekday: (weekday: number) => void;
  setWeekMinutes: (weekday: number, minutes: number) => void;
}) {
  const extras = draft.injuries.filter(
    (item) => !(INJURY_PRESETS as readonly string[]).includes(item),
  );

  function addInjury() {
    const name = injuryDraft.trim().toLowerCase();
    if (name === "" || draft.injuries.includes(name)) {
      setInjuryDraft("");
      return;
    }
    onChange({ injuries: [...draft.injuries, name] });
    setInjuryDraft("");
  }

  return (
    <div className="form">
      <div className="field">
        <span>Experience</span>
        <div className="seg" role="group" aria-label="Experience">
          {EXPERIENCE.map((value) => (
            <button
              key={value}
              type="button"
              className="btn"
              aria-pressed={draft.experience === value}
              onClick={() => onChange({ experience: value })}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Equipment</span>
        <div className="seg" role="group" aria-label="Equipment">
          {EQUIPMENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="btn"
              aria-pressed={draft.equipment.includes(id)}
              onClick={() => toggleEquipment(id)}
            >
              {EQUIPMENT_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Injuries</span>
        <div className="seg" role="group" aria-label="Injuries">
          {INJURY_PRESETS.map((name) => (
            <button
              key={name}
              type="button"
              className="btn"
              aria-pressed={draft.injuries.includes(name)}
              onClick={() => toggleInjury(name)}
            >
              {name}
            </button>
          ))}
          {extras.map((name) => (
            <button
              key={name}
              type="button"
              className="btn"
              aria-pressed={true}
              onClick={() => toggleInjury(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Add injury</span>
          <input
            name="injury"
            value={injuryDraft}
            onChange={(event) => setInjuryDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addInjury();
              }
            }}
          />
        </label>
      </div>
      <label className="field">
        <span>Injury notes (optional)</span>
        <textarea
          name="injuryNotes"
          maxLength={500}
          rows={3}
          value={draft.injuryNotes}
          onChange={(event) => onChange({ injuryNotes: event.target.value })}
        />
      </label>
      <div className="field">
        <span>Available weekdays</span>
        <div className="seg" role="group" aria-label="Weekdays">
          {WEEKDAY_LABELS.map((label, index) => {
            const weekday = index + 1;
            return (
              <button
                key={weekday}
                type="button"
                className="btn"
                aria-pressed={draft.week.some((day) => day.weekday === weekday)}
                onClick={() => toggleWeekday(weekday)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {draft.week.map((day) => (
          <label className="field" key={day.weekday}>
            <span>{WEEKDAY_LABELS[day.weekday - 1]} minutes</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={180}
              step={5}
              value={day.minutes}
              onChange={(event) =>
                setWeekMinutes(day.weekday, Number.parseInt(event.target.value, 10) || 0)
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function YesNo({
  name,
  value,
  onChange,
}: {
  name: ParqKey;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={PARQ_LABELS[name]}>
      <button
        type="button"
        className="btn"
        aria-pressed={value === false}
        onClick={() => onChange(false)}
      >
        No
      </button>
      <button
        type="button"
        className="btn"
        aria-pressed={value === true}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
    </div>
  );
}

function toWizardError(err: unknown): { code: string; message: string; details?: unknown } {
  if (err instanceof ApiRequestError) {
    return { code: err.code, message: err.message, details: err.details };
  }
  return { code: "REQUEST_FAILED", message: formatAuthError(err) };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeTime(value: string): string {
  const match = /^(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? value;
}
