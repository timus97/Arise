import { OnboardingBody } from "@arise/domain";
import { isIanaTimeZone } from "../../lib/settings-client.js";
import { storeLengthCm, storeMassKg } from "../../lib/units.js";
import { fixtureDraft } from "./fixture.js";
import { PARQ_KEYS, type OnboardingDraft, type StepId } from "./types.js";

const HH_MM = /^\d{2}:\d{2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function otherParqYes(parq: OnboardingDraft["parq"]): boolean {
  return (
    parq.chestPain === true ||
    parq.dizziness === true ||
    parq.doctorAdvisedAgainst === true ||
    parq.uncontrolledCondition === true
  );
}

export function pregnancyYes(parq: OnboardingDraft["parq"]): boolean {
  return parq.pregnancy === true;
}

export function parqComplete(parq: OnboardingDraft["parq"]): boolean {
  return PARQ_KEYS.every((key) => typeof parq[key] === "boolean");
}

function positiveNumber(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function intInRange(raw: string, min: number, max: number): number | null {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

export function stepSatisfied(step: StepId, draft: OnboardingDraft): boolean {
  switch (step) {
    case 1:
      return draft.acceptedMedicalDisclaimer === true;
    case 2:
      return parqComplete(draft.parq);
    case 3: {
      const age = intInRange(draft.age, 16, 100);
      const height = positiveNumber(draft.height);
      const weight = positiveNumber(draft.weight);
      const target = draft.targetWeight.trim();
      const date = draft.targetDate.trim();
      const targetOk = target === "" || positiveNumber(target) !== null;
      const dateOk = date === "" || ISO_DATE.test(date);
      return (
        age !== null &&
        height !== null &&
        weight !== null &&
        isIanaTimeZone(draft.timeZone) &&
        draft.goalType !== null &&
        targetOk &&
        dateOk
      );
    }
    case 4: {
      const commute = intInRange(draft.commuteWalkMinutes, 0, 300);
      return (
        HH_MM.test(draft.sleepStart.trim()) &&
        HH_MM.test(draft.sleepEnd.trim()) &&
        draft.jobActivity !== null &&
        commute !== null
      );
    }
    case 5:
      return (
        draft.experience !== null &&
        draft.equipment.length >= 1 &&
        draft.week.length >= 1 &&
        draft.week.every(
          (day) =>
            day.weekday >= 1 &&
            day.weekday <= 7 &&
            Number.isInteger(day.minutes) &&
            day.minutes >= 0 &&
            day.minutes <= 180,
        ) &&
        draft.injuryNotes.length <= 500
      );
    case 6:
      return (
        stepSatisfied(1, draft) &&
        stepSatisfied(2, draft) &&
        stepSatisfied(3, draft) &&
        stepSatisfied(4, draft) &&
        stepSatisfied(5, draft)
      );
  }
}

export function mergeDraftDefaults(draft: OnboardingDraft): OnboardingDraft {
  const base = fixtureDraft();
  return {
    ...base,
    ...draft,
    parq: { ...draft.parq },
    acceptedMedicalDisclaimer: draft.acceptedMedicalDisclaimer,
    age: draft.age.trim() || base.age,
    sex: draft.sex || base.sex,
    height: draft.height.trim() || base.height,
    weight: draft.weight.trim() || base.weight,
    timeZone: draft.timeZone.trim() || base.timeZone,
    goalType: draft.goalType ?? base.goalType,
    targetWeight: draft.targetWeight.trim() || base.targetWeight,
    targetDate: draft.targetDate.trim() || base.targetDate,
    sleepStart: draft.sleepStart.trim() || base.sleepStart,
    sleepEnd: draft.sleepEnd.trim() || base.sleepEnd,
    jobActivity: draft.jobActivity ?? base.jobActivity,
    commuteWalkMinutes: draft.commuteWalkMinutes.trim() || base.commuteWalkMinutes,
    experience: draft.experience ?? base.experience,
    equipment: draft.equipment.length > 0 ? draft.equipment : base.equipment,
    injuries: draft.injuries,
    injuryNotes: draft.injuryNotes,
    week: draft.week.length > 0 ? draft.week : base.week,
  };
}

export function toOnboardingBody(draft: OnboardingDraft): OnboardingBody | null {
  if (!draft.acceptedMedicalDisclaimer || !parqComplete(draft.parq) || draft.goalType === null) {
    return null;
  }
  if (draft.experience === null || draft.jobActivity === null) return null;

  const age = intInRange(draft.age, 16, 100);
  const height = positiveNumber(draft.height);
  const weight = positiveNumber(draft.weight);
  const commute = intInRange(draft.commuteWalkMinutes, 0, 300);
  if (age === null || height === null || weight === null || commute === null) return null;
  if (!isIanaTimeZone(draft.timeZone)) return null;
  if (!HH_MM.test(draft.sleepStart.trim()) || !HH_MM.test(draft.sleepEnd.trim())) return null;
  if (draft.equipment.length < 1 || draft.week.length < 1) return null;

  const targetRaw = draft.targetWeight.trim();
  const dateRaw = draft.targetDate.trim();
  const targetWeight =
    targetRaw === "" ? null : storeMassKg(Number(targetRaw), draft.units);
  if (targetWeight !== null && !(targetWeight > 0)) return null;
  if (dateRaw !== "" && !ISO_DATE.test(dateRaw)) return null;

  const notes = draft.injuryNotes.trim();
  const body = {
    acceptedMedicalDisclaimer: true as const,
    parq: {
      chestPain: draft.parq.chestPain === true,
      dizziness: draft.parq.dizziness === true,
      doctorAdvisedAgainst: draft.parq.doctorAdvisedAgainst === true,
      pregnancy: draft.parq.pregnancy === true,
      uncontrolledCondition: draft.parq.uncontrolledCondition === true,
    },
    profile: {
      age,
      heightCm: storeLengthCm(height, draft.units),
      weightKg: storeMassKg(weight, draft.units),
      units: draft.units,
      timeZone: draft.timeZone.trim(),
      ...(draft.sex !== "" ? { sex: draft.sex } : {}),
    },
    goal: {
      type: draft.goalType,
      targetWeightKg: targetWeight,
      targetDate: dateRaw === "" ? null : dateRaw,
    },
    habit: {
      experience: draft.experience,
      equipment: [...draft.equipment],
      injuries: draft.injuries.map((item) => item.trim()).filter((item) => item.length > 0),
      ...(notes !== "" ? { injuryNotes: notes.slice(0, 500) } : {}),
      jobActivity: draft.jobActivity,
      commuteWalkMinutes: commute,
      sleepWindow: { start: draft.sleepStart.trim(), end: draft.sleepEnd.trim() },
      dietPreference: draft.dietPreference,
      week: draft.week.map((day) => ({ weekday: day.weekday, minutes: day.minutes })),
    },
  };

  const parsed = OnboardingBody.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export function bodyForPregnancyPut(draft: OnboardingDraft): OnboardingBody | null {
  return toOnboardingBody(mergeDraftDefaults(draft));
}
