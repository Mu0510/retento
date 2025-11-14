import fs from "fs";
import path from "path";

export type DifficultyThreshold = {
  label: string;
  range: [number, number];
  scaled_range: [number, number];
};

const THRESHOLD_PATH = path.join(process.cwd(), "data", "difficulty-thresholds.json");

let cache: DifficultyThreshold[] | null = null;

export function getDifficultyThresholds(): DifficultyThreshold[] {
  if (cache) {
    return cache;
  }
  if (!fs.existsSync(THRESHOLD_PATH)) {
    throw new Error("difficulty threshold file missing (data/difficulty-thresholds.json)");
  }
  const contents = fs.readFileSync(THRESHOLD_PATH, "utf-8");
  cache = JSON.parse(contents) as DifficultyThreshold[];
  return cache;
}
