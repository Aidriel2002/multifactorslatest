import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useStaleTaskChecker = (currentUser, enabled = true, intervalMinutes = 60) => {
  const checkStaleTasks = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      return;
    }

    try {
      const { error } = await supabase.rpc('notify_stale_tasks');
      
      if (error) {
        console.error('Error checking stale tasks:', error);
      }
    } catch (err) {
      console.error('Error in stale task checker:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!enabled || !currentUser || currentUser.role !== 'admin') {
      return;
    }

    checkStaleTasks();

    const interval = setInterval(() => {
      checkStaleTasks();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, currentUser, intervalMinutes, checkStaleTasks]);

  return { checkStaleTasks };
};