import { OnboardingBody } from "@arise/domain";
import { describe, expect, it } from "vitest";
import * as copy from "./copy.js";
import {
  EASY_ONLY_BANNER,
  EASY_ONLY_CTA,
  EASY_ONLY_LEDE,
  EASY_ONLY_TITLE,
  PREGNANCY_ALERT,
  PREGNANCY_CTA,
  PREGNANCY_LEDE,
  PREGNANCY_TITLE,
  PUSH_FORBIDDEN,
  STEP_COUNT,
  UNSAFE_CTA,
  UNSAFE_LEDE,
  UNSAFE_TITLE,
  unsafeLossAlert,
} from "./copy.js";
import { stepSatisfied, toOnboardingBody } from "./draft.js";
import { FIXTURE_BODY, emptyDraft, fixtureDraft } from "./fixture.js";
import { evaluateDraftLoss, evaluateImpliedLoss } from "./loss.js";
import type { OnboardingDraft } from "./types.js";
import {
  advance,
  applyWizardError,
  canAdvance,
  canGoBack,
  createWizard,
  currentStep,
  goBack,
  isDeadEnd,
  patchDraft,
} from "./wizard.js";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function draftAt(step: 1 | 2 | 3 | 4 | 5 | 6): OnboardingDraft {
  const full = fixtureDraft();
  if (step >= 6) return full;
  const base = emptyDraft("Europe/Stockholm");
  if (step < 1) return base;
  base.acceptedMedicalDisclaimer = true;
  if (step < 2) return base;
  base.parq = { ...full.parq };
  if (step < 3) return base;
  base.age = full.age;
  base.sex = full.sex;
  base.height = full.height;
  base.weight = full.weight;
  base.units = full.units;
  base.timeZone = full.timeZone;
  base.goalType = full.goalType;
  base.targetWeight = full.targetWeight;
  base.targetDate = full.targetDate;
  if (step < 4) return base;
  base.sleepStart = full.sleepStart;
  base.sleepEnd = full.sleepEnd;
  base.jobActivity = full.jobActivity;
  base.commuteWalkMinutes = full.commuteWalkMinutes;
  base.dietPreference = full.dietPreference;
  if (step < 5) return base;
  base.experience = full.experience;
  base.equipment = [...full.equipment];
  base.injuries = [...full.injuries];
  base.week = full.week.map((day) => ({ ...day }));
  return base;
}

function walkTo(step: 1 | 2 | 3 | 4 | 5 | 6) {
  let state = createWizard(draftAt(step));
  while (currentStep(state) < step) {
    const result = advance(state, NOW);
    state = result.state;
  }
  return state;
}

describe("wizard steps", () => {
  it("has six steps and blocks continue until required fields are set", () => {
    expect(STEP_COUNT).toBe(6);
    let state = createWizard(emptyDraft("Europe/Stockholm"));
    expect(currentStep(state)).toBe(1);
    expect(canAdvance(state)).toBe(false);

    state = patchDraft(state, { acceptedMedicalDisclaimer: true });
    expect(canAdvance(state)).toBe(true);
    state = advance(state, NOW).state;
    expect(currentStep(state)).toBe(2);
    expect(canAdvance(state)).toBe(false);

    state = patchDraft(state, (draft) => ({
      ...draft,
      parq: {
        chestPain: false,
        dizziness: false,
        doctorAdvisedAgainst: false,
        pregnancy: false,
        uncontrolledCondition: false,
      },
    }));
    expect(canAdvance(state)).toBe(true);
    state = advance(state, NOW).state;
    expect(currentStep(state)).toBe(3);
    expect(canAdvance(state)).toBe(false);

    state = patchDraft(state, {
      age: "29",
      height: "168",
      weight: "72",
      timeZone: "Europe/Stockholm",
      goalType: "fat_loss",
    });
    expect(stepSatisfied(3, state.draft)).toBe(true);
    expect(canAdvance(state)).toBe(true);

    state = advance(state, NOW).state;
    expect(currentStep(state)).toBe(4);
    expect(canAdvance(state)).toBe(false);
    state = patchDraft(state, {
      sleepStart: "23:00",
      sleepEnd: "07:00",
      jobActivity: "sedentary",
      commuteWalkMinutes: "15",
    });
    expect(canAdvance(state)).toBe(true);

    state = advance(state, NOW).state;
    expect(currentStep(state)).toBe(5);
    expect(canAdvance(state)).toBe(false);
    state = patchDraft(state, {
      experience: 1,
      equipment: ["bands"],
      week: [
        { weekday: 1, minutes: 40 },
        { weekday: 3, minutes: 40 },
        { weekday: 5, minutes: 30 },
        { weekday: 6, minutes: 50 },
      ],
    });
    expect(canAdvance(state)).toBe(true);

    const toPreview = advance(state, NOW);
    expect(toPreview.state.phase).toEqual({ kind: "step", step: 6 });
    expect(toPreview.intent).toBe("loadPreview");
  });

  it("allows optional target weight and date", () => {
    const draft = draftAt(3);
    draft.targetWeight = "";
    draft.targetDate = "";
    draft.goalType = "general_fitness";
    expect(stepSatisfied(3, draft)).toBe(true);
    const body = toOnboardingBody({
      ...fixtureDraft(),
      targetWeight: "",
      targetDate: "",
      goalType: "general_fitness",
    });
    expect(body?.goal.targetWeightKg).toBeNull();
    expect(body?.goal.targetDate).toBeNull();
  });

  it("does not skip a required step", () => {
    const state = walkTo(4);
    expect(currentStep(state)).toBe(4);
    expect(canGoBack(state)).toBe(true);
    expect(advance(createWizard(emptyDraft()), NOW).intent).toBe("none");
  });
});

describe("pregnancy dead-end", () => {
  it("PUTs onboarding on pregnancy yes and then blocks retry", () => {
    let state = walkTo(2);
    state = patchDraft(state, (draft) => ({
      ...draft,
      parq: { ...draft.parq, pregnancy: true },
    }));
    const result = advance(state, NOW);
    expect(result.intent).toBe("putPregnancy");
    expect(result.state.phase.kind).not.toBe("pregnancy");

    state = applyWizardError(result.state, {
      code: "PREGNANCY_HARD_STOP",
      message: PREGNANCY_ALERT,
    });
    expect(state.phase.kind).toBe("pregnancy");
    expect(isDeadEnd(state)).toBe(true);
    expect(canAdvance(state)).toBe(false);
    expect(canGoBack(state)).toBe(false);
    expect(advance(state, NOW).intent).toBe("none");
    expect(goBack(state)).toBe(state);
  });

  it("shows easy-only copy then continues when another PAR-Q item is yes", () => {
    let state = walkTo(2);
    state = patchDraft(state, (draft) => ({
      ...draft,
      parq: { ...draft.parq, chestPain: true },
    }));
    const result = advance(state, NOW);
    expect(result.intent).toBe("none");
    expect(result.state.phase).toEqual({ kind: "easyOnly" });
    expect(EASY_ONLY_TITLE).toBe("Easy-only whitelist");
    expect(EASY_ONLY_BANNER).toContain("easy or rest work");
    expect(EASY_ONLY_LEDE).toContain("You can still continue");
    expect(EASY_ONLY_CTA).toBe("Continue");
    state = advance(result.state, NOW).state;
    expect(state.phase).toEqual({ kind: "step", step: 3 });
  });
});

describe("unsafe loss stays on step 3", () => {
  it("keeps the wizard on body & goal when implied loss exceeds 1% BW/week", () => {
    let state = walkTo(3);
    state = patchDraft(state, {
      weight: "72",
      targetWeight: "66",
      targetDate: "2026-08-23",
      goalType: "fat_loss",
      timeZone: "Europe/Stockholm",
    });
    const loss = evaluateDraftLoss(state.draft, NOW);
    expect(loss.unsafe).toBe(true);
    if (loss.unsafe) {
      expect(loss.maxKgPerWeek).toBeCloseTo(0.72);
    }

    const result = advance(state, NOW);
    expect(result.intent).toBe("none");
    expect(result.state.phase).toEqual({ kind: "step", step: 3 });
    expect(result.state.unsafeMaxKgPerWeek).toBeCloseTo(0.72);
    expect(unsafeLossAlert(0.72)).toBe(
      "That implied loss is faster than 1% of body weight per week. Maximum allowed is 0.72 kg / week. Relax the date or the target.",
    );
    expect(unsafeLossAlert(0.72)).not.toMatch(/kcal/i);
    expect(UNSAFE_TITLE).toBe("Slow the target");
    expect(UNSAFE_LEDE).toBe("No calorie numbers. Stay on this step until the rate is safe.");
    expect(UNSAFE_CTA).toBe("Edit goal");
  });

  it("returns to step 3 when preview or persist reports UNSAFE_LOSS_RATE", () => {
    let state = createWizard(fixtureDraft());
    state = { ...state, phase: { kind: "step", step: 6 } };
    state = applyWizardError(state, {
      code: "UNSAFE_LOSS_RATE",
      message: "too fast",
      details: { maxKgPerWeek: 0.72 },
    });
    expect(state.phase).toEqual({ kind: "step", step: 3 });
    expect(state.unsafeMaxKgPerWeek).toBe(0.72);
  });

  it("treats the design fixture as a safe fat-loss rate", () => {
    const parsed = OnboardingBody.safeParse(FIXTURE_BODY);
    expect(parsed.success).toBe(true);
    expect(FIXTURE_BODY.profile.age).toBe(29);
    expect(FIXTURE_BODY.profile.timeZone).toBe("Europe/Stockholm");
    expect(FIXTURE_BODY.goal).toEqual({
      type: "fat_loss",
      targetWeightKg: 66,
      targetDate: "2026-12-01",
    });
    expect(FIXTURE_BODY.habit.experience).toBe(1);
    expect(FIXTURE_BODY.habit.equipment).toEqual(["bands"]);
    expect(FIXTURE_BODY.habit.injuries).toEqual(["knee"]);
    expect(FIXTURE_BODY.habit.week.map((day) => day.weekday)).toEqual([1, 3, 5, 6]);
    expect(toOnboardingBody(fixtureDraft())).toEqual(FIXTURE_BODY);
    expect(
      evaluateImpliedLoss({
        type: "fat_loss",
        weightKg: 72,
        targetWeightKg: 66,
        targetDate: "2026-12-01",
        now: NOW,
        timeZone: "Europe/Stockholm",
      }).unsafe,
    ).toBe(false);
  });
});

describe("P7 copy and SYSTEM voice", () => {
  it("locks pregnancy dead-end strings and forbids push IP", () => {
    expect(PREGNANCY_TITLE).toBe("Not appropriate now");
    expect(PREGNANCY_ALERT).toBe(
      "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.",
    );
    expect(PREGNANCY_LEDE).toBe("This is a dead-end. There is no retry and no plan.");
    expect(PREGNANCY_CTA).toBe("Delete account");

    const { PUSH_FORBIDDEN: _banned, ...shipped } = copy;
    void _banned;
    const blob = JSON.stringify(shipped).toLowerCase();
    for (const banned of PUSH_FORBIDDEN) {
      expect(blob).not.toContain(banned);
    }
    expect(blob).not.toContain("solo leveling");
    expect(blob).not.toContain("jin-woo");
    expect(blob).not.toContain("igris");
    expect(blob).not.toContain("shadow monarch");
  });
});
