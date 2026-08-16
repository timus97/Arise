import {
  SKIP_BUSY_THIRD,
  SKIP_CANCEL,
  SKIP_CONFIRM,
  SKIP_CONSEQUENCES,
  SKIP_LEDE,
  SKIP_TITLE,
} from "./copy.js";
import type { SkipReason } from "./types.js";

export const SKIP_REASONS: readonly SkipReason[] = [
  "rest_planned",
  "illness",
  "pain",
  "busy",
];

export function skipConsequence(reason: SkipReason, busySkipsWeek: number | null): string {
  if (reason === "busy" && busySkipsWeek !== null && busySkipsWeek >= 2) {
    return SKIP_BUSY_THIRD;
  }
  return SKIP_CONSEQUENCES[reason];
}

export type SkipSheetModel = {
  title: string;
  lede: string;
  confirm: string;
  cancel: string;
  consequence: string | null;
  confirmEnabled: boolean;
};

/** Consequence is on the model as soon as a reason is selected — before confirm. */
export function skipSheetModel(
  reason: SkipReason | null,
  busySkipsWeek: number | null,
): SkipSheetModel {
  return {
    title: SKIP_TITLE,
    lede: SKIP_LEDE,
    confirm: SKIP_CONFIRM,
    cancel: SKIP_CANCEL,
    consequence: reason ? skipConsequence(reason, busySkipsWeek) : null,
    confirmEnabled: reason !== null,
  };
}

export function busySkipsFromPayload(payload: { busySkipsWeek?: number }): number | null {
  return typeof payload.busySkipsWeek === "number" ? payload.busySkipsWeek : null;
}
