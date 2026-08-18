import { describe, expect, it } from "vitest";
import {
  ACTIVITY_STATUS_PATH,
  STATUS_SICK_BANNER,
  STATUS_SICK_HINT,
  STATUS_TRAVEL_BANNER,
  STATUS_TRAVEL_HINT,
  formatStatusBanner,
} from "./activity-status.js";

describe("activity status copy", () => {
  it("never mentions calories or push", () => {
    const blob = [STATUS_TRAVEL_HINT, STATUS_SICK_HINT, STATUS_TRAVEL_BANNER, STATUS_SICK_BANNER].join(" ");
    expect(blob).not.toMatch(/calori|push|badge/i);
    expect(ACTIVITY_STATUS_PATH).toBe("/api/v1/me/activity-status");
  });

  it("formats travel and sick banners; training is silent", () => {
    expect(formatStatusBanner({ status: "training", startsOn: null, endsOn: null, days: null })).toBeNull();
    expect(
      formatStatusBanner({ status: "travel", startsOn: "2026-08-17", endsOn: "2026-08-19", days: 3 }),
    ).toBe("STATUS: TRAVEL. Living-room work only until 2026-08-19.");
    expect(
      formatStatusBanner({ status: "sick", startsOn: "2026-08-17", endsOn: "2026-08-18", days: 2 }),
    ).toBe("STATUS: SICK. Streak is held. Easy rest work until 2026-08-18.");
  });
});
