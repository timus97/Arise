import {
  GoalType,
  type Equipment,
  type ExperienceTag,
  type QuestBlock,
  type QuestPrescription,
  type QuestTemplate,
} from "@arise/domain";

export type { QuestTemplate };

export const ALL_GOAL_TYPES: GoalType[] = [...GoalType.options];

export function experienceTagsFor(minExperience: 0 | 1 | 2 | 3): ExperienceTag[] {
  if (minExperience >= 2) return ["advanced"];
  if (minExperience === 1) return ["intermediate", "advanced"];
  return ["beginner", "intermediate", "advanced"];
}

export function equipmentOk(t: QuestTemplate, have: Equipment[]): boolean {
  const anyOk =
    t.requiredAny.length === 0 ||
    t.requiredAny.some((e) => have.includes(e) || e === "none");
  const allOk = t.requiredAll.every((e) => have.includes(e));
  return anyOk && allOk;
}

export interface BuildArgs {
  experience: number;
  recoveryScore: number;
  budgetMinutes: number;
  volumeMul: number;
}

/** `sets' = max(1, round(sets * volumeMul * (recoveryScore < 55 ? 0.75 : 1)))` */
export function scaleSets(sets: number, volumeMul: number, recoveryScore: number): number {
  return Math.max(1, Math.round(sets * volumeMul * (recoveryScore < 55 ? 0.75 : 1)));
}

export function clampBlockRpe(rpeMax: number, experience: number, isPenalty: boolean): number {
  let rpe = rpeMax;
  if (experience <= 1) rpe = Math.min(rpe, 7);
  if (isPenalty) rpe = Math.min(rpe, 4);
  return rpe;
}

export function buildPrescription(args: {
  blocks: QuestBlock[];
  estimatedMinutes: number;
  intensity: QuestPrescription["intensity"];
  build: BuildArgs;
  isPenalty?: boolean;
  /** Sleep / habit / rest ignore budget. Walks scale when budget < baseMinutes. */
  ignoreBudget?: boolean;
  baseMinutes: number;
}): QuestPrescription {
  const { build, baseMinutes } = args;
  const isPenalty = args.isPenalty === true;
  const ignoreBudget = args.ignoreBudget === true;

  let estimatedMinutes = args.estimatedMinutes;
  let timeScale = 1;
  if (!ignoreBudget && build.budgetMinutes < baseMinutes) {
    estimatedMinutes = build.budgetMinutes;
    timeScale = baseMinutes > 0 ? build.budgetMinutes / baseMinutes : 1;
  }

  const blocks = args.blocks.map((block) => {
    const next: QuestBlock = { ...block, rpeMax: clampBlockRpe(block.rpeMax, build.experience, isPenalty) };
    if (block.sets !== undefined) {
      next.sets = scaleSets(block.sets, build.volumeMul, build.recoveryScore);
    }
    if (timeScale !== 1) {
      if (block.seconds !== undefined) next.seconds = Math.round(block.seconds * timeScale);
      if (block.distanceM !== undefined) next.distanceM = Math.round(block.distanceM * timeScale);
    }
    return next;
  });

  return { blocks, estimatedMinutes, intensity: args.intensity };
}
