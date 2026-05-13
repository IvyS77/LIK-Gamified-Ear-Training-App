import { useCallback, useEffect, useMemo, useState } from 'react';
import { addXP as addXPLocal, getDefaultProgress, loadProgressAsync, type UserProgress } from '../lib/progression';
import {
  addXPFirestore,
  loadProgressFirestore,
} from '../lib/progression.firestore';
import { useAuth } from './use-auth';

export function useUserProgress() {
  const { user } = useAuth(); // adjust if your hook returns different shape
  const uid = user?.uid ?? null;

  const [progress, setProgress] = useState<UserProgress>(getDefaultProgress());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const p = uid ? await loadProgressFirestore(uid) : await loadProgressAsync();
        if (!cancelled) setProgress(p);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const addXP = useCallback(
    async (amount: number) => {
      const next = uid ? await addXPFirestore(uid, amount) : await addXPLocal(amount);
      setProgress(next);
      return next;
    },
    [uid]
  );

  return useMemo(
    () => ({
      user,
      uid,
      isGuest: !uid,
      progress,
      loading,
      addXP,
    }),
    [user, uid, progress, loading, addXP]
  );
}