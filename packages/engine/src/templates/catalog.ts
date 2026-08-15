import {
  type Equipment,
  type GoalType,
  type PatternTag,
  type QuestBlock,
  type QuestKind,
  type QuestTemplate,
} from "@arise/domain";
import { BASE_XP } from "../xp.js";
import {
  ALL_GOAL_TYPES,
  buildPrescription,
  experienceTagsFor,
  type BuildArgs,
} from "./types.js";

export const TEMPLATE_IDS = [
  "str_sit_to_stand_l0",
  "str_incline_push_l0",
  "str_backpack_row_l0",
  "str_hip_hinge_l0",
  "str_goblet_squat_l1",
  "str_band_row_l1",
  "str_gym_full_body_l2",
  "cardio_zone2_walk",
  "steps_6k",
  "steps_8k",
  "mob_hip_unload",
  "mob_tspine",
  "rec_nasal_breath",
  "rec_full_rest",
  "habit_sleep_window",
  "penalty_easy_walk",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const EMPTY_DAY_FALLBACK_IDS = ["habit_sleep_window", "cardio_zone2_walk"] as const;

interface TemplateSpec {
  id: TemplateId;
  kind: QuestKind;
  title: string;
  flavor: string;
  goalTags: GoalType[];
  patternTags: PatternTag[];
  requiredAny: Equipment[];
  contraindicationKeys: string[];
  minExperience: 0 | 1 | 2 | 3;
  baseMinutes: number;
  intensity: QuestTemplate["intensity"];
  statDelta: QuestTemplate["statDelta"];
  baseXp: number;
  autoCompletable: boolean;
  healthPredicate?: QuestTemplate["healthPredicate"];
  blocks: QuestBlock[];
  ignoreBudget?: boolean;
}

function defineTemplate(spec: TemplateSpec): QuestTemplate {
  const isPenalty = spec.kind === "penalty";
  const ignoreBudget =
    spec.ignoreBudget === true ||
    spec.intensity === "rest" ||
    spec.kind === "habit" ||
    spec.kind === "recovery";
  const { blocks, ignoreBudget: _ignored, ...fields } = spec;
  void _ignored;
  const template: QuestTemplate = {
    ...fields,
    experienceTags: experienceTagsFor(spec.minExperience),
    requiredAll: [],
    build(args: BuildArgs) {
      return buildPrescription({
        blocks,
        estimatedMinutes: spec.baseMinutes,
        intensity: spec.intensity,
        build: args,
        isPenalty,
        ignoreBudget,
        baseMinutes: spec.baseMinutes,
      });
    },
  };
  return template;
}

const STRENGTH_GOALS: GoalType[] = ["muscle_gain", "recomposition", "general_fitness"];
const WALK_GOALS: GoalType[] = ["fat_loss", "endurance", "general_fitness", "recomposition"];
const STEPS_6K_GOALS: GoalType[] = ["fat_loss", "endurance", "general_fitness"];
const STEPS_8K_GOALS: GoalType[] = ["fat_loss", "endurance"];
const MOB_GOALS: GoalType[] = ["mobility", "general_fitness"];

const SPECS: TemplateSpec[] = [
  {
    id: "str_sit_to_stand_l0",
    kind: "strength",
    title: "Sit to Stand",
    flavor: "Stand up from a chair with control.",
    goalTags: STRENGTH_GOALS,
    patternTags: ["squat"],
    requiredAny: ["none"],
    contraindicationKeys: ["knee"],
    minExperience: 0,
    baseMinutes: 12,
    intensity: "moderate",
    statDelta: { str: 0.3, sta: 0.08 },
    baseXp: BASE_XP.strength,
    autoCompletable: false,
    blocks: [{ name: "Sit-to-stand", sets: 3, reps: 10, rpeMax: 6, restSec: 60 }],
  },
  {
    id: "str_incline_push_l0",
    kind: "strength",
    title: "Incline Push",
    flavor: "Hands on a counter, lower and press.",
    goalTags: STRENGTH_GOALS,
    patternTags: ["push"],
    requiredAny: ["none"],
    contraindicationKeys: ["shoulder", "wrist"],
    minExperience: 0,
    baseMinutes: 10,
    intensity: "moderate",
    statDelta: { str: 0.3 },
    baseXp: BASE_XP.strength,
    autoCompletable: false,
    blocks: [{ name: "Incline push-up", sets: 3, reps: 8, rpeMax: 6, restSec: 60 }],
  },
  {
    id: "str_backpack_row_l0",
    kind: "strength",
    title: "Backpack Row",
    flavor: "Row a loaded bag toward the ribs.",
    goalTags: STRENGTH_GOALS,
    patternTags: ["pull"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 10,
    intensity: "moderate",
    statDelta: { str: 0.28, vit: 0.08 },
    baseXp: BASE_XP.strength,
    autoCompletable: false,
    blocks: [{ name: "Backpack row", sets: 3, reps: 10, rpeMax: 6, restSec: 60 }],
  },
  {
    id: "str_hip_hinge_l0",
    kind: "strength",
    title: "Hip Hinge",
    flavor: "Push the hips back with a long spine.",
    goalTags: STRENGTH_GOALS,
    patternTags: ["hinge"],
    requiredAny: ["none"],
    contraindicationKeys: ["spine"],
    minExperience: 0,
    baseMinutes: 10,
    intensity: "moderate",
    statDelta: { str: 0.28, vit: 0.1 },
    baseXp: BASE_XP.strength,
    autoCompletable: false,
    blocks: [{ name: "Hip hinge (unloaded)", sets: 3, reps: 8, rpeMax: 6, restSec: 60 }],
  },
  {
    id: "str_goblet_squat_l1",
    kind: "strength",
    title: "Goblet Squat",
    flavor: "Hold a weight at the chest and squat.",
    goalTags: STRENGTH_GOALS,
    patternTags: ["squat"],
    requiredAny: ["dumbbells", "bands"],
    contraindicationKeys: ["knee"],
    minExperience: 1,
    baseMinutes: 15,
    intensity: "moderate",
    statDelta: { str: 0.35, vit: 0.14 },
    baseXp: BASE_XP.strength,
    autoCompletable: false,
    blocks: [{ name: "Goblet squat", sets: 3, reps: 8, rpeMax: 7, restSec: 75 }],
  },
  {
    id: "str_band_row_l1",
    kind: "strength",
    title: "Band Row",
    flavor: "Row a band or dumbbell toward the hip.",
    goalTags: STRENGTH_GOALS,
    patternTags: ["pull"],
    requiredAny: ["bands", "dumbbells"],
    contraindicationKeys: [],
    minExperience: 1,
    baseMinutes: 12,
    intensity: "moderate",
    statDelta: { str: 0.32, vit: 0.08 },
    baseXp: BASE_XP.strength,
    autoCompletable: false,
    blocks: [{ name: "Band/DB row", sets: 3, reps: 10, rpeMax: 7, restSec: 60 }],
  },
  {
    id: "str_gym_full_body_l2",
    kind: "strength",
    title: "Gym Full Body",
    flavor: "Squat, hinge, press, and row.",
    goalTags: ["muscle_gain", "recomposition"],
    patternTags: ["squat", "hinge", "push", "pull"],
    requiredAny: ["full_gym"],
    contraindicationKeys: [],
    minExperience: 2,
    baseMinutes: 25,
    intensity: "hard",
    statDelta: { str: 0.4, sta: 0.12 },
    baseXp: BASE_XP.gate,
    autoCompletable: false,
    blocks: [
      { name: "Squat", sets: 3, reps: 5, rpeMax: 7, restSec: 90 },
      { name: "Hinge", sets: 3, reps: 5, rpeMax: 7, restSec: 90 },
      { name: "Press", sets: 3, reps: 6, rpeMax: 7, restSec: 90 },
      { name: "Row", sets: 3, reps: 8, rpeMax: 7, restSec: 90 },
    ],
  },
  {
    id: "cardio_zone2_walk",
    kind: "cardio",
    title: "Zone 2 Walk",
    flavor: "Easy conversational pace.",
    goalTags: WALK_GOALS,
    patternTags: ["gait"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 20,
    intensity: "easy",
    statDelta: { sta: 0.3, agi: 0.1 },
    baseXp: BASE_XP.cardio,
    autoCompletable: false,
    blocks: [{ name: "Easy walk", seconds: 1200, rpeMax: 4 }],
  },
  {
    id: "steps_6k",
    kind: "steps",
    title: "Six Thousand Steps",
    flavor: "Accumulate six thousand steps today.",
    goalTags: STEPS_6K_GOALS,
    patternTags: ["gait"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 0,
    intensity: "easy",
    statDelta: { sta: 0.2 },
    baseXp: BASE_XP.steps,
    autoCompletable: true,
    healthPredicate: { metric: "steps", op: "gte", value: 6000 },
    blocks: [{ name: "Steps", steps: 6000, rpeMax: 3 }],
    ignoreBudget: true,
  },
  {
    id: "steps_8k",
    kind: "steps",
    title: "Eight Thousand Steps",
    flavor: "Accumulate eight thousand steps today.",
    goalTags: STEPS_8K_GOALS,
    patternTags: ["gait"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 0,
    intensity: "easy",
    statDelta: { sta: 0.24 },
    baseXp: BASE_XP.steps,
    autoCompletable: true,
    healthPredicate: { metric: "steps", op: "gte", value: 8000 },
    blocks: [{ name: "Steps", steps: 8000, rpeMax: 3 }],
    ignoreBudget: true,
  },
  {
    id: "mob_hip_unload",
    kind: "mobility",
    title: "Hip Unload",
    flavor: "Open the hips without loading the knees.",
    goalTags: MOB_GOALS,
    patternTags: ["mobility_hip"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 8,
    intensity: "easy",
    statDelta: { vit: 0.32 },
    baseXp: BASE_XP.mobility,
    autoCompletable: false,
    blocks: [{ name: "90° hip openers", sets: 2, seconds: 30, rpeMax: 3, notes: "per side" }],
  },
  {
    id: "mob_tspine",
    kind: "mobility",
    title: "Thoracic Open Book",
    flavor: "Rotate through the upper back.",
    goalTags: MOB_GOALS,
    patternTags: ["mobility_tspine"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 8,
    intensity: "easy",
    statDelta: { vit: 0.28, intl: 0.08 },
    baseXp: BASE_XP.mobility,
    autoCompletable: false,
    blocks: [{ name: "Open-book", sets: 2, reps: 6, rpeMax: 3, notes: "per side" }],
  },
  {
    id: "rec_nasal_breath",
    kind: "recovery",
    title: "Nasal Box Breath",
    flavor: "Five minutes of quiet nasal breathing.",
    goalTags: MOB_GOALS,
    patternTags: ["breath"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 5,
    intensity: "rest",
    statDelta: { intl: 0.2, vit: 0.1 },
    baseXp: BASE_XP.recovery,
    autoCompletable: false,
    blocks: [{ name: "Box breath", seconds: 300, rpeMax: 1 }],
  },
  {
    id: "rec_full_rest",
    kind: "recovery",
    title: "Full Rest",
    flavor: "No training load today.",
    goalTags: ALL_GOAL_TYPES,
    patternTags: ["breath"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 0,
    intensity: "rest",
    statDelta: {},
    baseXp: BASE_XP.recovery,
    autoCompletable: false,
    blocks: [],
  },
  {
    id: "habit_sleep_window",
    kind: "habit",
    title: "Sleep Window",
    flavor: "Protect the night window.",
    goalTags: ALL_GOAL_TYPES,
    patternTags: ["breath"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 0,
    intensity: "rest",
    statDelta: { intl: 0.1, vit: 0.1 },
    baseXp: BASE_XP.habit,
    autoCompletable: true,
    blocks: [],
  },
  {
    id: "penalty_easy_walk",
    kind: "penalty",
    title: "Easy Walk",
    flavor: "A short easy walk to reset.",
    goalTags: ALL_GOAL_TYPES,
    patternTags: ["gait"],
    requiredAny: ["none"],
    contraindicationKeys: [],
    minExperience: 0,
    baseMinutes: 15,
    intensity: "easy",
    statDelta: { sta: 0.08 },
    baseXp: BASE_XP.penalty,
    autoCompletable: false,
    blocks: [{ name: "Easy walk", seconds: 900, rpeMax: 4 }],
  },
];

export const CATALOG: readonly QuestTemplate[] = SPECS.map(defineTemplate);

const BY_ID = new Map(CATALOG.map((t) => [t.id, t]));

export function templateById(id: string): QuestTemplate | undefined {
  return BY_ID.get(id);
}

export function requireTemplate(id: string): QuestTemplate {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`unknown template: ${id}`);
  return t;
}
