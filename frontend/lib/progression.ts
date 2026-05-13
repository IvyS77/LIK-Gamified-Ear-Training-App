import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  lastPlayedDate: string;
  exercisesCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
  dailyChallengeCompleted: boolean;
  dailyChallengeDate: string;
  weeklyWeekNumber?: number;
  weeklyCompletedDays?: number[];
}

const STORAGE_KEY = "earquest-progress";
const XP_PER_LEVEL = 100;

export function getDefaultProgress(): UserProgress {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastPlayedDate: "",
    exercisesCompleted: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    dailyChallengeCompleted: false,
    dailyChallengeDate: "",
    weeklyWeekNumber: 0,
    weeklyCompletedDays: [],
  };
}

// --- Async versions (use these everywhere) ---

export async function loadProgressAsync(): Promise<UserProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return { ...getDefaultProgress(), ...JSON.parse(raw) };
  } catch {}
  return getDefaultProgress();
}

export async function saveProgressAsync(p: UserProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export async function addXP(amount: number): Promise<UserProgress> {
  const p = await loadProgressAsync();
  p.xp += amount;
  while (p.xp >= p.level * XP_PER_LEVEL) {
    p.xp -= p.level * XP_PER_LEVEL;
    p.level++;
  }
  const today = new Date().toDateString();
  if (p.lastPlayedDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    p.streak = p.lastPlayedDate === yesterday ? p.streak + 1 : 1;
  }
  p.lastPlayedDate = today;
  await saveProgressAsync(p);
  return p;
}

export function xpForCurrentLevel(p: UserProgress): number {
  return p.level * XP_PER_LEVEL;
}

export async function recordAnswer(correct: boolean): Promise<UserProgress> {
  const p = await loadProgressAsync();
  p.totalAnswers++;
  if (correct) p.correctAnswers++;
  await saveProgressAsync(p);
  return p;
}

export async function completeExercise(): Promise<UserProgress> {
  const p = await loadProgressAsync();
  p.exercisesCompleted++;
  await saveProgressAsync(p);
  return p;
}