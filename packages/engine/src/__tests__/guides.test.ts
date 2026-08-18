import { describe, expect, it } from "vitest";
import { CATALOG, CORE_TEMPLATE_IDS, TEMPLATE_IDS } from "../templates/catalog.js";
import { EXPANSION_IDS } from "../templates/catalog-expansion.js";
import { allGuides, guideFor } from "../templates/guides.js";

describe("exercise guides", () => {
  it("covers every catalog template id", () => {
    const ids = allGuides().map((g) => g.templateId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of TEMPLATE_IDS) {
      expect(guideFor(id), id).toBeDefined();
    }
    expect(CATALOG).toHaveLength(TEMPLATE_IDS.length);
    expect(CORE_TEMPLATE_IDS).toHaveLength(16);
    expect(EXPANSION_IDS).toHaveLength(28);
    expect(TEMPLATE_IDS).not.toContain("yoga_box_hold");
  });

  it("puts English titles and Sanskrit subtitles on yoga guides", () => {
    const yoga = CATALOG.filter((t) => t.kind === "yoga");
    expect(yoga).toHaveLength(11);
    for (const t of yoga) {
      const guide = guideFor(t.id);
      expect(guide?.title, t.id).toBe(t.title);
      expect(guide?.subtitle, t.id).toMatch(/[A-Za-z]/);
    }
    expect(guideFor("yoga_cat_cow")?.subtitle).toBe("Marjaryasana–Bitilasana");
    expect(guideFor("yoga_thread_needle")?.subtitle).toBe("Parsva Balasana");
  });

  it("does not mention calories or push", () => {
    const blob = allGuides()
      .map((g) => [g.setup, g.action, g.stopIf, g.doNot, g.breath].join(" "))
      .join(" ");
    expect(blob).not.toMatch(/calori|kcal|push notification/i);
  });
});
