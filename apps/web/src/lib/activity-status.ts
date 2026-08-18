import { api } from "./api.js";

export const ACTIVITY_STATUS_PATH = "/api/v1/me/activity-status";
export const activityStatusQueryKey = ["activity-status"] as const;

export type ActivityStatus = "training" | "travel" | "sick";

export type ActivityStatusView = {
  status: ActivityStatus;
  startsOn: string | null;
  endsOn: string | null;
  days: number | null;
};

export const STATUS_TITLE = "Activity status";
export const STATUS_LEDE = "Tell SYSTEM if you are traveling or sick. Training is the default.";
export const STATUS_TRAVEL_HINT = "Travel issues living-room work only. Gym templates stay off.";
export const STATUS_SICK_HINT = "Sick holds the streak and keeps the day easy. No hard work.";
export const STATUS_TRAVEL_BANNER = "STATUS: TRAVEL. Living-room work only until {endsOn}.";
export const STATUS_SICK_BANNER = "STATUS: SICK. Streak is held. Easy rest work until {endsOn}.";
export const STATUS_CLEAR = "Clear";
export const STATUS_DAYS_LABEL = "Days (1–14)";

export function formatStatusBanner(view: ActivityStatusView): string | null {
  if (view.status === "training") return null;
  const ends = view.endsOn ?? "the window ends";
  if (view.status === "travel") return STATUS_TRAVEL_BANNER.replace("{endsOn}", ends);
  return STATUS_SICK_BANNER.replace("{endsOn}", ends);
}

export function getActivityStatus(): Promise<ActivityStatusView> {
  return api<ActivityStatusView>(ACTIVITY_STATUS_PATH);
}

export function putActivityStatus(
  status: ActivityStatus,
  days?: number,
): Promise<ActivityStatusView> {
  return api<ActivityStatusView>(ACTIVITY_STATUS_PATH, {
    method: "PUT",
    body: JSON.stringify(status === "training" ? { status } : { status, days }),
  });
}
