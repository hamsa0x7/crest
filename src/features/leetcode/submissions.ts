import {
  shade as greenShade,
  streaks,
  todayCount,
  total,
  weekColumns,
  type Day,
} from "../github/contributions.ts";

export type { Day };
export { streaks, todayCount, total, weekColumns };

export interface DifficultyCounts {
  all: number;
  easy: number;
  medium: number;
  hard: number;
}

/** Shade 0..4 as LeetCode's orange steps (CSS colour); 0 is the empty cell. */
export const shade = (level: number) => greenShade(level, "--color-orange");
