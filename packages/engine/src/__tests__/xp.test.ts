import { describe, expect, it } from "vitest";
import {
  applyXp,
  BASE_XP,
  baseXpFor,
  rewardXp,
  scaleXp,
  xpAtLevelStart,
  xpIntoLevel,
  xpToNextLevel,
} from "../xp.js";

describe("xpToNextLevel goldens", () => {
  it("matches design §9.7 integers", () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(10)).toBe(2239);
    expect(xpToNextLevel(25)).toBe(7713);
    expect(xpToNextLevel(50)).toBe(19661);
  });
});

describe("xpAtLevelStart / applyXp / scaleXp", () => {
  it("starts level 1 at 0 XP and level 2 at xpToNextLevel(1)", () => {
    expect(xpAtLevelStart(1)).toBe(0);
    expect(xpAtLevelStart(2)).toBe(100);
    expect(xpAtLevelStart(3)).toBe(100 + xpToNextLevel(2));
  });

  it("applyXp levels up exactly at the threshold", () => {
    expect(applyXp(0, 99)).toEqual({ xp: 99, level: 1 });
    expect(applyXp(0, 100)).toEqual({ xp: 100, level: 2 });
    expect(applyXp(100, 0)).toEqual({ xp: 100, level: 2 });
  });

  it("clamps XP at 0 and never goes negative", () => {
    expect(applyXp(40, -100)).toEqual({ xp: 0, level: 1 });
  });

  it("xpIntoLevel is xp minus the start of the current level", () => {
    const { xp, level } = applyXp(0, 130);
    expect(xpIntoLevel(xp, level)).toBe(xp - xpAtLevelStart(level));
  });

  it("scaleXp matches §9.7 and caps at 1.6×", () => {
    expect(scaleXp(100, 1)).toBe(100);
    expect(scaleXp(100, 31)).toBe(160);
    expect(scaleXp(100, 50)).toBe(160);
    expect(scaleXp(55, 2)).toBe(Math.round(55 * 1.02));
  });

  it("applyXp level loop breaks at 200", () => {
    const huge = Number.MAX_SAFE_INTEGER;
    const result = applyXp(0, huge);
    expect(result.xp).toBe(huge);
    expect(result.level).toBe(201);
  });
});

describe("base XP constants", () => {
  it("matches habit/recovery 20, mobility 30, steps 30, cardio 45, strength 55, gate 90, penalty 10", () => {
    expect(BASE_XP.habit).toBe(20);
    expect(BASE_XP.recovery).toBe(20);
    expect(BASE_XP.mobility).toBe(30);
    expect(BASE_XP.steps).toBe(30);
    expect(BASE_XP.cardio).toBe(45);
    expect(BASE_XP.strength).toBe(55);
    expect(BASE_XP.gate).toBe(90);
    expect(BASE_XP.penalty).toBe(10);
    expect(baseXpFor("habit")).toBe(20);
    expect(baseXpFor("gate")).toBe(90);
  });

  it("penalty reward is a flat 10 and does not scale", () => {
    expect(rewardXp("penalty", 1)).toBe(10);
    expect(rewardXp("penalty", 50)).toBe(10);
    expect(rewardXp("strength", 1)).toBe(55);
    expect(rewardXp("strength", 31)).toBe(scaleXp(55, 31));
  });
});
