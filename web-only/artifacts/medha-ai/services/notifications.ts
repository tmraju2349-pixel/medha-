import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { DailyTask } from '@/context/AppContext';

export async function requestNotificationAccess() {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function scheduleTaskAlarm(task: DailyTask, delaySeconds = 10) {
  if (Platform.OS === 'web') return null;
  const granted = await requestNotificationAccess();
  if (!granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: task.title,
      body: `It is time for your ${task.category === 'medicine' ? 'medicine' : 'care routine'}.`,
      sound: 'default',
      data: { taskId: task.id, category: task.category },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, delaySeconds),
      repeats: false,
    },
  });
}

export function configureNotificationHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}