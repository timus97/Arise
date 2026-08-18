import type { RankLetter } from "@arise/ui";

export type SkipReason = "rest_planned" | "illness" | "pain" | "busy";
export type QuestEffort = "full" | "partial";
export type Rank = RankLetter;

export type TodayPlayer = {
  level: number;
  xp: number;
  xpToNext: number;
  rank: Rank;
  title: string;
  stats: {
    str: number;
    agi: number;
    vit: number;
    intl: number;
    sta: number;
  };
  streakDays: number;
  penaltyPoints30d: number;
};

export type RecoveryParts = {
  sleep: number;
  restHr: number;
  hrv: number;
  load: number;
  subjective: number;
};

export type QuestBlock = {
  name: string;
  sets?: number;
  reps?: number;
  seconds?: number;
  distanceM?: number;
  steps?: number;
  rpeMax: number;
  restSec?: number;
  notes?: string;
};

export type TodayQuest = {
  id: string;
  userId: string;
  localDate: string;
  templateId: string;
  title: string;
  flavor: string;
  kind: string;
  status: string;
  prescription: {
    blocks: QuestBlock[];
    estimatedMinutes: number;
    intensity: string;
  };
  xpReward: number;
  statDelta: Partial<TodayPlayer["stats"]>;
  autoCompletable: boolean;
  healthPredicate?: {
    metric: string;
    op: string;
    value: number;
  };
  modifiersApplied: string[];
  source: string;
  skipReason?: string | null;
};

export type PendingModifier = {
  questId: string;
  key: string;
  next: {
    status?: string;
    healthPredicate?: { metric: string; op: string; value: number };
    prescription?: {
      blocks: QuestBlock[];
      estimatedMinutes?: number;
      intensity?: string;
    };
  };
};

export type TodayPayload = {
  date: string;
  needsEnsure: boolean;
  player: TodayPlayer;
  recoveryScore: number;
  recoveryParts: RecoveryParts;
  planDay: {
    focus: string;
    budgetMinutes: number;
    hardAllowed: boolean;
    isGate: boolean;
  } | null;
  quests: TodayQuest[];
  pendingModifiers: PendingModifier[];
  suggestRegenerate: boolean;
  disclaimer: string;
  busySkipsWeek?: number;
  activityStatus?: {
    status: "training" | "travel" | "sick";
    startsOn: string | null;
    endsOn: string | null;
    days: number | null;
  };
};

export type QuestMutationResult = {
  quest: {
    id: string;
    userId: string;
    localDate: string;
    templateId: string;
    title: string;
    flavor: string;
    kind: string;
    status: string;
    skipReason: string | null;
    xpReward: number;
  };
  player: TodayPlayer;
};
