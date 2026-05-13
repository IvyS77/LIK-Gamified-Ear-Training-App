import { loadProgressAsync, saveProgressAsync, type UserProgress } from "./progression";

export interface WeeklyChallenge {
  day: string;
  dayShort: string;
  index: number;
  completed: boolean;
  isToday: boolean;
  locked: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function getTodayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export async function getWeeklyChallenges(): Promise<WeeklyChallenge[]> {
  const progress = await loadProgressAsync();
  const currentWeek = getWeekNumber();

  let completedDays: number[] = [];
  if (progress.weeklyWeekNumber === currentWeek) {
    completedDays = progress.weeklyCompletedDays || [];
  } else {
    progress.weeklyWeekNumber = currentWeek;
    progress.weeklyCompletedDays = [];
    await saveProgressAsync(progress);
  }

  const todayIdx = getTodayIndex();

  return DAYS.map((day, i) => ({
    day,
    dayShort: DAYS_SHORT[i],
    index: i,
    completed: completedDays.includes(i),
    isToday: i === todayIdx,
    locked: i > todayIdx,
  }));
}

export async function completeDailyChallenge(): Promise<UserProgress> {
  const progress = await loadProgressAsync();
  const currentWeek = getWeekNumber();
  const todayIdx = getTodayIndex();

  if (progress.weeklyWeekNumber !== currentWeek) {
    progress.weeklyWeekNumber = currentWeek;
    progress.weeklyCompletedDays = [];
  }

  if (!progress.weeklyCompletedDays) progress.weeklyCompletedDays = [];
  if (!progress.weeklyCompletedDays.includes(todayIdx)) {
    progress.weeklyCompletedDays.push(todayIdx);
  }

  await saveProgressAsync(progress);
  return progress;
}