import { describe, expect, it } from "vitest";
import {
  INSTALL_ANDROID,
  INSTALL_IOS,
  INSTALL_LEDE,
  INSTALL_SETTINGS_ONELINER,
  INSTALL_TITLE,
  shouldShowInstallEducation,
} from "./install-education.js";

describe("P2 install education", () => {
  it("uses exact Add to Home Screen copy and never mentions push", () => {
    expect(INSTALL_TITLE).toBe("Add to Home Screen");
    expect(INSTALL_LEDE).toBe(
      "Install Arise on this phone so the SYSTEM window is one tap away.",
    );
    expect(INSTALL_IOS).toBe("iPhone or iPad — tap Share, then Add to Home Screen.");
    expect(INSTALL_ANDROID).toBe("Android — open the browser menu, then Add to Home Screen.");
    expect(INSTALL_SETTINGS_ONELINER).toBe(
      "Add to Home Screen: Share on iPhone, or the browser menu on Android.",
    );
    const blob = [
      INSTALL_TITLE,
      INSTALL_LEDE,
      INSTALL_IOS,
      INSTALL_ANDROID,
      INSTALL_SETTINGS_ONELINER,
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).not.toMatch(/push/);
    expect(blob).not.toMatch(/badge/);
    expect(blob).not.toMatch(/remind/);
  });

  it("hides the panel on desktop and after the first System visit", () => {
    expect(
      shouldShowInstallEducation({ mobile: false, standalone: false, seen: false }),
    ).toBe(false);
    expect(
      shouldShowInstallEducation({ mobile: true, standalone: true, seen: false }),
    ).toBe(false);
    expect(
      shouldShowInstallEducation({
        mobile: true,
        standalone: false,
        seen: true,
        firstVisitOnly: true,
      }),
    ).toBe(false);
    expect(
      shouldShowInstallEducation({
        mobile: true,
        standalone: false,
        seen: false,
        firstVisitOnly: true,
      }),
    ).toBe(true);
    expect(
      shouldShowInstallEducation({
        mobile: true,
        standalone: false,
        seen: true,
        firstVisitOnly: false,
      }),
    ).toBe(true);
  });
});
