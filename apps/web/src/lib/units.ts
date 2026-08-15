import type { Units } from "@arise/domain";

/**
 * Display conversions. Canonical stored values are always metric (kg, cm).
 *
 * Factors (exact international):
 * - 1 lb = 0.45359237 kg
 * - 1 in = 2.54 cm
 */
export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;
export const LB_PER_KG = 1 / KG_PER_LB;
export const INCH_PER_CM = 1 / CM_PER_INCH;

export const UNITS_STORAGE_KEY = "arise.displayUnits";
export const DEFAULT_UNITS: Units = "metric";

export type DisplayUnits = Units;

function isUnits(value: string | null): value is Units {
  return value === "metric" || value === "imperial";
}

export function readDisplayUnits(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): Units {
  const raw = storage?.getItem(UNITS_STORAGE_KEY) ?? null;
  return isUnits(raw) ? raw : DEFAULT_UNITS;
}

export function writeDisplayUnits(
  units: Units,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  storage?.setItem(UNITS_STORAGE_KEY, units);
}

/** Convert a displayed mass into stored kilograms. */
export function storeMassKg(value: number, from: Units): number {
  return from === "imperial" ? lbToKg(value) : value;
}

/** Convert a displayed length into stored centimetres. */
export function storeLengthCm(value: number, from: Units): number {
  return from === "imperial" ? inToCm(value) : value;
}

export function displayMass(kg: number, units: Units): number {
  return units === "imperial" ? kgToLb(kg) : kg;
}

export function displayLength(cm: number, units: Units): number {
  return units === "imperial" ? cmToIn(cm) : cm;
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToIn(cm: number): number {
  return cm * INCH_PER_CM;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function roundDisplay(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatMass(kg: number, units: Units): string {
  if (units === "imperial") {
    return `${roundDisplay(kgToLb(kg))} lb`;
  }
  return `${roundDisplay(kg)} kg`;
}

export function formatLength(cm: number, units: Units): string {
  if (units === "imperial") {
    return `${roundDisplay(cmToIn(cm))} in`;
  }
  return `${roundDisplay(cm)} cm`;
}

function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
