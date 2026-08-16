import { evaluateDraftLoss, maxKgPerWeekFromDetails } from "./loss.js";
import { otherParqYes, pregnancyYes, stepSatisfied } from "./draft.js";
import { emptyDraft } from "./fixture.js";
import type {
  OnboardingDraft,
  PlanPreview,
  StepId,
  WizardIntent,
  WizardPhase,
} from "./types.js";

export type WizardState = {
  phase: WizardPhase;
  draft: OnboardingDraft;
  preview: PlanPreview | null;
  unsafeMaxKgPerWeek: number | null;
  error: string | null;
  previewLoaded: boolean;
};

export type AdvanceResult = {
  state: WizardState;
  intent: WizardIntent;
};

export function createWizard(draft: OnboardingDraft = emptyDraft()): WizardState {
  return {
    phase: { kind: "step", step: 1 },
    draft,
    preview: null,
    unsafeMaxKgPerWeek: null,
    error: null,
    previewLoaded: false,
  };
}

export function currentStep(state: WizardState): StepId {
  if (state.phase.kind === "easyOnly") return 2;
  if (state.phase.kind === "pregnancy") return 2;
  return state.phase.step;
}

export function canGoBack(state: WizardState): boolean {
  if (state.phase.kind === "pregnancy") return false;
  if (state.phase.kind === "easyOnly") return true;
  return state.phase.step > 1;
}

export function canAdvance(state: WizardState): boolean {
  if (state.phase.kind === "pregnancy") return false;
  if (state.phase.kind === "easyOnly") return true;
  return stepSatisfied(state.phase.step, state.draft);
}

export function patchDraft(
  state: WizardState,
  patch: Partial<OnboardingDraft> | ((draft: OnboardingDraft) => OnboardingDraft),
): WizardState {
  const draft = typeof patch === "function" ? patch(state.draft) : { ...state.draft, ...patch };
  return {
    ...state,
    draft,
    preview: null,
    previewLoaded: false,
    error: null,
    unsafeMaxKgPerWeek: state.phase.kind === "step" && state.phase.step === 3
      ? state.unsafeMaxKgPerWeek
      : null,
  };
}

export function goBack(state: WizardState): WizardState {
  if (!canGoBack(state)) return state;
  if (state.phase.kind === "easyOnly") {
    return { ...state, phase: { kind: "step", step: 2 }, error: null };
  }
  if (state.phase.kind !== "step") return state;
  const step = state.phase.step;
  const prev = (step - 1) as StepId;
  return {
    ...state,
    phase: { kind: "step", step: prev },
    error: null,
    preview: step === 6 ? null : state.preview,
    previewLoaded: step === 6 ? false : state.previewLoaded,
  };
}

export function advance(state: WizardState, now: Date = new Date()): AdvanceResult {
  if (state.phase.kind === "pregnancy") {
    return { state, intent: "none" };
  }
  if (state.phase.kind === "easyOnly") {
    return {
      state: { ...state, phase: { kind: "step", step: 3 }, error: null },
      intent: "none",
    };
  }
  const step = state.phase.step;
  if (!stepSatisfied(step, state.draft)) {
    return { state, intent: "none" };
  }

  if (step === 2) {
    if (pregnancyYes(state.draft.parq)) {
      return { state: { ...state, error: null }, intent: "putPregnancy" };
    }
    if (otherParqYes(state.draft.parq)) {
      return {
        state: { ...state, phase: { kind: "easyOnly" }, error: null },
        intent: "none",
      };
    }
    return {
      state: { ...state, phase: { kind: "step", step: 3 }, error: null },
      intent: "none",
    };
  }

  if (step === 3) {
    const loss = evaluateDraftLoss(state.draft, now);
    if (loss.unsafe) {
      return {
        state: {
          ...state,
          phase: { kind: "step", step: 3 },
          unsafeMaxKgPerWeek: loss.maxKgPerWeek,
          error: null,
        },
        intent: "none",
      };
    }
    return {
      state: {
        ...state,
        phase: { kind: "step", step: 4 },
        unsafeMaxKgPerWeek: null,
        error: null,
      },
      intent: "none",
    };
  }

  if (step === 6) {
    return { state: { ...state, error: null }, intent: "persist" };
  }

  const next = (step + 1) as StepId;
  return {
    state: {
      ...state,
      phase: { kind: "step", step: next },
      error: null,
      preview: next === 6 ? state.preview : null,
      previewLoaded: next === 6 ? state.previewLoaded : false,
    },
    intent: next === 6 ? "loadPreview" : "none",
  };
}

export function applyPregnancyStop(state: WizardState): WizardState {
  return {
    ...state,
    phase: { kind: "pregnancy" },
    preview: null,
    previewLoaded: false,
    error: null,
  };
}

export function applyUnsafeLoss(state: WizardState, maxKgPerWeek: number): WizardState {
  return {
    ...state,
    phase: { kind: "step", step: 3 },
    unsafeMaxKgPerWeek: maxKgPerWeek,
    preview: null,
    previewLoaded: false,
    error: null,
  };
}

export function applyPreview(state: WizardState, preview: PlanPreview): WizardState {
  return {
    ...state,
    preview,
    previewLoaded: true,
    error: null,
  };
}

export function applyWizardError(
  state: WizardState,
  err: { code: string; message: string; details?: unknown },
): WizardState {
  if (err.code === "PREGNANCY_HARD_STOP") {
    return applyPregnancyStop(state);
  }
  if (err.code === "UNSAFE_LOSS_RATE") {
    const max = maxKgPerWeekFromDetails(err.details);
    return applyUnsafeLoss(state, max ?? 0);
  }
  if (err.code === "AGE_RESTRICTED") {
    return {
      ...state,
      phase: { kind: "step", step: 3 },
      error: err.message,
    };
  }
  return { ...state, error: err.message };
}

export function isDeadEnd(state: WizardState): boolean {
  return state.phase.kind === "pregnancy";
}
