import { describe, expect, it } from "vitest";
import {
  CM_PER_INCH,
  DEFAULT_UNITS,
  KG_PER_LB,
  UNITS_STORAGE_KEY,
  cmToIn,
  displayLength,
  displayMass,
  formatLength,
  formatMass,
  inToCm,
  kgToLb,
  lbToKg,
  readDisplayUnits,
  storeLengthCm,
  storeMassKg,
  writeDisplayUnits,
} from "./units.js";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("units", () => {
  it("stores metric and converts imperial display with documented factors", () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(CM_PER_INCH).toBe(2.54);
    expect(DEFAULT_UNITS).toBe("metric");

    expect(storeMassKg(72.4, "metric")).toBe(72.4);
    expect(storeLengthCm(178, "metric")).toBe(178);
    expect(displayMass(72.4, "metric")).toBe(72.4);
    expect(displayLength(178, "metric")).toBe(178);

    expect(storeMassKg(180, "imperial")).toBeCloseTo(180 * KG_PER_LB);
    expect(storeLengthCm(70, "imperial")).toBeCloseTo(70 * CM_PER_INCH);
    expect(kgToLb(72.4)).toBeCloseTo(72.4 / KG_PER_LB);
    expect(lbToKg(kgToLb(72.4))).toBeCloseTo(72.4);
    expect(cmToIn(178)).toBeCloseTo(178 / CM_PER_INCH);
    expect(inToCm(cmToIn(178))).toBeCloseTo(178);
    expect(displayMass(72.4, "imperial")).toBeCloseTo(72.4 / KG_PER_LB);
    expect(displayLength(178, "imperial")).toBeCloseTo(178 / CM_PER_INCH);

    expect(formatMass(72.4, "metric")).toBe("72.4 kg");
    expect(formatLength(178, "metric")).toBe("178 cm");
    expect(formatMass(72.4, "imperial")).toMatch(/ lb$/);
    expect(formatLength(178, "imperial")).toMatch(/ in$/);
  });

  it("defaults the display preference to metric and persists the toggle", () => {
    const storage = memoryStorage();
    expect(readDisplayUnits(storage)).toBe("metric");
    writeDisplayUnits("imperial", storage);
    expect(storage.getItem(UNITS_STORAGE_KEY)).toBe("imperial");
    expect(readDisplayUnits(storage)).toBe("imperial");
    writeDisplayUnits("metric", storage);
    expect(readDisplayUnits(storage)).toBe("metric");
    expect(readDisplayUnits(memoryStorage({ [UNITS_STORAGE_KEY]: "nope" }))).toBe(
      "metric",
    );
  });
});
