import { OnboardingBody } from "@arise/domain";
import type { OnboardingDraft } from "./types.js";

/** Design §12 / inventory fixture. Valid OnboardingBody. */
export const FIXTURE_BODY: OnboardingBody = {
  acceptedMedicalDisclaimer: true,
  parq: {
    chestPain: false,
    dizziness: false,
    doctorAdvisedAgainst: false,
    pregnancy: false,
    uncontrolledCondition: false,
  },
  profile: {
    age: 29,
    sex: "female",
    heightCm: 168,
    weightKg: 72,
    units: "metric",
    timeZone: "Europe/Stockholm",
  },
  goal: {
    type: "fat_loss",
    targetWeightKg: 66,
    targetDate: "2026-12-01",
  },
  habit: {
    experience: 1,
    equipment: ["bands"],
    injuries: ["knee"],
    injuryNotes: "old ACL, no pain now",
    jobActivity: "sedentary",
    commuteWalkMinutes: 15,
    sleepWindow: { start: "23:00", end: "07:00" },
    dietPreference: "unspecified",
    week: [
      { weekday: 1, minutes: 40 },
      { weekday: 3, minutes: 40 },
      { weekday: 5, minutes: 30 },
      { weekday: 6, minutes: 50 },
    ],
  },
};

export function emptyDraft(timeZone = "UTC"): OnboardingDraft {
  return {
    acceptedMedicalDisclaimer: false,
    parq: {
      chestPain: null,
      dizziness: null,
      doctorAdvisedAgainst: null,
      pregnancy: null,
      uncontrolledCondition: null,
    },
    age: "",
    sex: "",
    height: "",
    weight: "",
    units: "metric",
    timeZone,
    goalType: null,
    targetWeight: "",
    targetDate: "",
    sleepStart: "",
    sleepEnd: "",
    jobActivity: null,
    commuteWalkMinutes: "",
    dietPreference: "unspecified",
    experience: null,
    equipment: [],
    injuries: [],
    injuryNotes: "",
    week: [],
  };
}

export function fixtureDraft(): OnboardingDraft {
  return {
    acceptedMedicalDisclaimer: true,
    parq: { ...FIXTURE_BODY.parq },
    age: String(FIXTURE_BODY.profile.age),
    sex: FIXTURE_BODY.profile.sex ?? "",
    height: String(FIXTURE_BODY.profile.heightCm),
    weight: String(FIXTURE_BODY.profile.weightKg),
    units: FIXTURE_BODY.profile.units,
    timeZone: FIXTURE_BODY.profile.timeZone,
    goalType: FIXTURE_BODY.goal.type,
    targetWeight: String(FIXTURE_BODY.goal.targetWeightKg),
    targetDate: FIXTURE_BODY.goal.targetDate ?? "",
    sleepStart: FIXTURE_BODY.habit.sleepWindow.start,
    sleepEnd: FIXTURE_BODY.habit.sleepWindow.end,
    jobActivity: FIXTURE_BODY.habit.jobActivity,
    commuteWalkMinutes: String(FIXTURE_BODY.habit.commuteWalkMinutes),
    dietPreference: FIXTURE_BODY.habit.dietPreference,
    experience: FIXTURE_BODY.habit.experience,
    equipment: [...FIXTURE_BODY.habit.equipment],
    injuries: [...FIXTURE_BODY.habit.injuries],
    injuryNotes: FIXTURE_BODY.habit.injuryNotes ?? "",
    week: FIXTURE_BODY.habit.week.map((day) => ({ ...day })),
  };
}
