import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

/**
 * Background hook that checks every 30 seconds for upcoming todo reminders
 * and fires native OS notifications when it's time.
 */
export function useReminders() {
  const hasPermissionRef = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const result = await requestPermission();
          granted = result === 'granted';
        }
        hasPermissionRef.current = granted;
      } catch {
        // Not in Tauri environment
        hasPermissionRef.current = false;
      }
    };
    checkPermission();
  }, []);

  // Background timer - checks every 30 seconds
  useEffect(() => {
    const checkReminders = () => {
      if (!hasPermissionRef.current) return;

      const state = useStore.getState();
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Find todos with reminders that haven't fired today
      const todosWithReminders = state.todos.filter(t => {
        if (!t.startTime) return false;
        if (t.reminderMinutes === undefined || t.reminderMinutes === null) return false;
        if (t.date !== todayStr) return false;
        if (t.completed) return false;
        if (t.reminderFired === todayStr) return false; // already fired today
        if (t.parentId) return false; // skip subtasks
        return true;
      });

      for (const todo of todosWithReminders) {
        const [h, m] = todo.startTime!.split(':').map(Number);
        const startMinutes = h * 60 + m;
        const reminderTriggerMinutes = startMinutes - (todo.reminderMinutes ?? 0);

        // Fire if current time is at or past the reminder trigger point
        // but not more than 2 minutes past (to avoid firing old ones on app open)
        if (currentMinutes >= reminderTriggerMinutes && currentMinutes <= reminderTriggerMinutes + 2) {
          // Fire notification
          const timeLabel = todo.reminderMinutes === 0
            ? 'starting now'
            : `in ${todo.reminderMinutes} min`;

          try {
            sendNotification({
              title: `${todo.text.replace('!!', '').trim()}`,
              body: `${timeLabel} (${todo.startTime}${todo.endTime ? ' - ' + todo.endTime : ''})`,
            });
          } catch (e) {
            console.error('[Reminders] Failed to send notification:', e);
          }

          // Mark as fired for today
          state.markReminderFired(todo.id, todayStr);
        }
      }
    };

    // Check immediately on mount
    checkReminders();

    // Then check every 30 seconds
    const interval = setInterval(checkReminders, 30_000);
    return () => clearInterval(interval);
  }, []);
}
