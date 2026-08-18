import { describe, expect, it } from "vitest";
import * as Domain from "../index.js";
import {
  DEFAULT_STATS,
  ActivityStatusPut,
  EffectKind,
  Equipment,
  GOAL_STAT_WEIGHTS,
  GoalType,
  HealthMetric,
  HealthSource,
  OnboardingBody,
  PlayerStats,
  ExerciseGuide,
  QuestKind,
  QuestPrescription,
  QuestStatus,
  Rank,
  RegisterBody,
  STAT_KEYS,
  type PlayerStats as PlayerStatsInferred,
  type QuestTemplate,
} from "../index.js";

const ONBOARDING_EXAMPLE = {
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
} as const;

const validRegister = {
  email: "ada@example.com",
  password: "tenchars!!",
  name: "Ada",
  age: 29,
  acceptedMedicalDisclaimer: true as const,
};

type AssertNeverInt<T> = "int" extends keyof T ? never : true;
const _playerStatsHasNoInt: AssertNeverInt<PlayerStatsInferred> = true;
const _defaultStatsHasNoInt: AssertNeverInt<typeof DEFAULT_STATS> = true;
void _playerStatsHasNoInt;
void _defaultStatsHasNoInt;

describe("STAT_KEYS and GOAL_STAT_WEIGHTS", () => {
  it('STAT_KEYS is exactly ["str","agi","vit","intl","sta"]', () => {
    expect(STAT_KEYS).toEqual(["str", "agi", "vit", "intl", "sta"]);
  });

  it("GOAL_STAT_WEIGHTS matches design goldens", () => {
    expect(GOAL_STAT_WEIGHTS.muscle_gain.str).toBe(1.6);
    expect(GOAL_STAT_WEIGHTS.mobility.vit).toBe(1.8);
    expect(GOAL_STAT_WEIGHTS.fat_loss.sta).toBe(1.4);
  });

  it("GOAL_STAT_WEIGHTS matches §9.1 exactly", () => {
    expect(GOAL_STAT_WEIGHTS).toEqual({
      fat_loss: { str: 0.8, agi: 1.0, vit: 0.8, intl: 0.6, sta: 1.4 },
      muscle_gain: { str: 1.6, agi: 0.6, vit: 0.8, intl: 0.5, sta: 0.7 },
      recomposition: { str: 1.3, agi: 0.8, vit: 0.8, intl: 0.6, sta: 1.0 },
      endurance: { str: 0.6, agi: 1.1, vit: 0.7, intl: 0.5, sta: 1.7 },
      general_fitness: { str: 1.0, agi: 1.0, vit: 1.0, intl: 0.8, sta: 1.0 },
      mobility: { str: 0.5, agi: 0.7, vit: 1.8, intl: 0.8, sta: 0.6 },
    });
  });
});

describe("intl never int", () => {
  it("does not export a symbol named for the forbidden stat key int", () => {
    expect(Object.keys(Domain)).not.toContain("int");
    expect(STAT_KEYS).not.toContain("int");
    expect(Object.keys(DEFAULT_STATS)).not.toContain("int");
    for (const weights of Object.values(GOAL_STAT_WEIGHTS)) {
      expect(Object.keys(weights)).not.toContain("int");
      expect(weights).toHaveProperty("intl");
    }
  });

  it("PlayerStats accepts the five keys and rejects int", () => {
    expect(
      PlayerStats.safeParse({ str: 10, agi: 10, vit: 10, intl: 10, sta: 10 }).success,
    ).toBe(true);
    expect(
      PlayerStats.safeParse({
        str: 10,
        agi: 10,
        vit: 10,
        intl: 10,
        sta: 10,
        int: 10,
      }).success,
    ).toBe(false);
    expect(
      PlayerStats.safeParse({ str: 10, agi: 10, vit: 10, int: 10, sta: 10 }).success,
    ).toBe(false);
  });

  it("DEFAULT_STATS is 10 on every stat including intl", () => {
    expect(DEFAULT_STATS).toEqual({
      str: 10,
      agi: 10,
      vit: 10,
      intl: 10,
      sta: 10,
    });
  });
});

describe("RegisterBody", () => {
  it("rejects password length 9, missing email, acceptedMedicalDisclaimer false", () => {
    expect(
      RegisterBody.safeParse({ ...validRegister, password: "ninechar!" }).success,
    ).toBe(false);

    const { email: _email, ...noEmail } = validRegister;
    void _email;
    expect(RegisterBody.safeParse(noEmail).success).toBe(false);

    expect(
      RegisterBody.safeParse({
        ...validRegister,
        acceptedMedicalDisclaimer: false,
      }).success,
    ).toBe(false);
  });

  it("accepts valid email+password 10+ + name + age + disclaimer true", () => {
    expect(RegisterBody.safeParse(validRegister).success).toBe(true);
    expect(
      RegisterBody.safeParse({
        ...validRegister,
        username: "ada_l",
        inviteCode: "invite",
      }).success,
    ).toBe(true);
  });
});

describe("OnboardingBody", () => {
  it("rejects age 15; accepts 16", () => {
    expect(
      OnboardingBody.safeParse({
        ...ONBOARDING_EXAMPLE,
        profile: { ...ONBOARDING_EXAMPLE.profile, age: 15 },
      }).success,
    ).toBe(false);
    expect(
      OnboardingBody.safeParse({
        ...ONBOARDING_EXAMPLE,
        profile: { ...ONBOARDING_EXAMPLE.profile, age: 16 },
      }).success,
    ).toBe(true);
  });

  it("parses the design example JSON", () => {
    const parsed = OnboardingBody.safeParse(ONBOARDING_EXAMPLE);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.profile.age).toBe(29);
      expect(parsed.data.goal.type).toBe("fat_loss");
      expect(parsed.data.habit.experience).toBe(1);
    }
  });
});

describe("QuestPrescription", () => {
  const valid = {
    blocks: [{ name: "Easy walk", rpeMax: 4 }],
    estimatedMinutes: 15,
    intensity: "easy" as const,
  };

  it("rejects a block without rpeMax", () => {
    expect(
      QuestPrescription.safeParse({
        ...valid,
        blocks: [{ name: "Easy walk" }],
      }).success,
    ).toBe(false);
  });

  it("rejects missing estimatedMinutes and bad intensity", () => {
    const { estimatedMinutes: _mins, ...noMinutes } = valid;
    void _mins;
    expect(QuestPrescription.safeParse(noMinutes).success).toBe(false);
    expect(
      QuestPrescription.safeParse({ ...valid, intensity: "max" }).success,
    ).toBe(false);
  });

  it("rejects a block without name", () => {
    expect(
      QuestPrescription.safeParse({
        ...valid,
        blocks: [{ rpeMax: 4 }],
      }).success,
    ).toBe(false);
  });

  it("accepts a legal prescription including empty blocks", () => {
    expect(QuestPrescription.safeParse(valid).success).toBe(true);
    expect(
      QuestPrescription.safeParse({
        blocks: [],
        estimatedMinutes: 0,
        intensity: "rest",
      }).success,
    ).toBe(true);
  });
});

describe("closed enums", () => {
  it("Rank is E–S", () => {
    expect(Rank.options).toEqual(["E", "D", "C", "B", "A", "S"]);
  });

  it("GoalType matches §9.1", () => {
    expect(GoalType.options).toEqual([
      "fat_loss",
      "muscle_gain",
      "recomposition",
      "endurance",
      "general_fitness",
      "mobility",
    ]);
  });

  it("ExerciseGuide requires setup, action, and stop-if", () => {
    expect(
      ExerciseGuide.safeParse({
        templateId: "yoga_cat_cow",
        title: "Cat–Cow",
        subtitle: "Marjaryasana–Bitilasana",
        setup: "Hands under shoulders.",
        action: "Move with the breath.",
        stopIf: "Sharp spine pain.",
      }).success,
    ).toBe(true);
    expect(
      ExerciseGuide.safeParse({
        templateId: "yoga_cat_cow",
        title: "Cat–Cow",
        setup: "Hands under shoulders.",
        action: "Move with the breath.",
      }).success,
    ).toBe(false);
  });

  it("QuestKind and QuestStatus match §9.1", () => {
    expect(QuestKind.options).toEqual([
      "strength",
      "cardio",
      "steps",
      "mobility",
      "yoga",
      "skill",
      "recovery",
      "habit",
      "penalty",
    ]);
    expect(QuestStatus.options).toEqual([
      "issued",
      "completed",
      "partial",
      "skipped",
      "failed",
      "auto_completed",
    ]);
  });

  it("HealthSource, HealthMetric, and EffectKind match the contract", () => {
    expect(HealthSource.options).toEqual([
      "manual",
      "csv",
      "apple_export",
      "web_bluetooth",
      "health_connect",
      "healthkit",
    ]);
    expect(HealthMetric.options).toEqual([
      "steps",
      "heart_rate",
      "resting_hr",
      "hrv",
      "sleep_minutes",
      "weight_kg",
      "active_minutes",
      "soreness",
      "sleep_quality",
    ]);
    expect(EffectKind.options).toEqual([
      "pain_no_hard",
      "illness_rest",
      "caution_volume",
      "travel_window",
      "sick_window",
    ]);
  });

  it("ActivityStatusPut requires days for travel and sick", () => {
    expect(ActivityStatusPut.safeParse({ status: "training" }).success).toBe(true);
    expect(ActivityStatusPut.safeParse({ status: "travel" }).success).toBe(false);
    expect(ActivityStatusPut.safeParse({ status: "sick", days: 0 }).success).toBe(false);
    expect(ActivityStatusPut.safeParse({ status: "sick", days: 15 }).success).toBe(false);
    expect(ActivityStatusPut.safeParse({ status: "travel", days: 1 }).success).toBe(true);
    expect(ActivityStatusPut.safeParse({ status: "sick", days: 14 }).success).toBe(true);
  });
});

describe("Equipment and QuestTemplate", () => {
  it("Equipment has no outdoor value", () => {
    expect(Equipment.options).not.toContain("outdoor");
    expect(Equipment.safeParse("outdoor").success).toBe(false);
    expect(Equipment.safeParse("none").success).toBe(true);
  });

  it("QuestTemplate includes build() in its type signature", () => {
    const build: QuestTemplate["build"] = () => ({
      blocks: [{ name: "Rest", rpeMax: 1 }],
      estimatedMinutes: 0,
      intensity: "rest",
    });
    expect(
      build({
        experience: 1,
        recoveryScore: 70,
        budgetMinutes: 40,
        volumeMul: 1,
      }).intensity,
    ).toBe("rest");
  });
});
