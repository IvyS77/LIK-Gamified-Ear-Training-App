import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getDefaultProgress, type UserProgress } from './progression';

const DOC_PATH = (uid: string) => doc(db, 'users', uid, 'progress', 'current');

async function ensureDoc(uid: string): Promise<UserProgress> {
  const ref = DOC_PATH(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { ...getDefaultProgress(), ...(snap.data() as UserProgress) };

  const initial = getDefaultProgress();
  await setDoc(ref, { ...initial, updatedAt: serverTimestamp() }, { merge: true });
  return initial;
}

export async function loadProgressFirestore(uid: string): Promise<UserProgress> {
  return ensureDoc(uid);
}

export async function saveProgressFirestore(uid: string, p: UserProgress): Promise<void> {
  const ref = DOC_PATH(uid);
  await setDoc(ref, { ...p, updatedAt: serverTimestamp() }, { merge: true });
}

export async function addXPFirestore(uid: string, amount: number): Promise<UserProgress> {
  const p = await ensureDoc(uid);

  // --- keep your exact rules ---
  const XP_PER_LEVEL = 100;

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

  await saveProgressFirestore(uid, p);
  return p;
}

export async function recordAnswerFirestore(uid: string, correct: boolean): Promise<UserProgress> {
  const p = await ensureDoc(uid);
  p.totalAnswers++;
  if (correct) p.correctAnswers++;
  await saveProgressFirestore(uid, p);
  return p;
}

export async function completeExerciseFirestore(uid: string): Promise<UserProgress> {
  const p = await ensureDoc(uid);
  p.exercisesCompleted++;
  await saveProgressFirestore(uid, p);
  return p;
}