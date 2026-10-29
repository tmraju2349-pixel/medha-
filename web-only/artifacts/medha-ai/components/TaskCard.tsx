import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp, type DailyTask } from '@/context/AppContext';

const iconMap: Record<DailyTask['icon'], keyof typeof Feather.glyphMap> = {
  heart: 'heart',
  droplet: 'droplet',
  sun: 'sun',
  calendar: 'calendar',
};

export function TaskCard({ task }: { task: DailyTask }) {
  const colors = useColors();
  const { completeTask, snoozeTask } = useApp();
  const complete = task.status === 'done';
  const snoozed = task.status === 'snoozed';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: complete ? colors.secondary : colors.peach }]}>
        <Feather name={iconMap[task.icon]} size={19} color={complete ? colors.primary : colors.accentForeground} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{task.time}</Text>
        <Text style={[styles.title, { color: colors.cardForeground }, complete && styles.completed]}>
          {task.title}
        </Text>
        {snoozed && <Text style={[styles.status, { color: colors.warning }]}>Snoozed for later</Text>}
        {complete && <Text style={[styles.status, { color: colors.safe }]}>Completed</Text>}
      </View>
      <View style={styles.actions}>
        {!complete && (
          <>
            <Pressable
              accessibilityLabel={`Snooze ${task.title}`}
              testID={`snooze-${task.id}`}
              onPress={() => snoozeTask(task.id)}
              style={({ pressed }) => [styles.smallButton, { backgroundColor: colors.muted }, pressed && styles.pressed]}
            >
              <Feather name="clock" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              accessibilityLabel={`Complete ${task.title}`}
              testID={`complete-${task.id}`}
              onPress={() => completeTask(task.id)}
              style={({ pressed }) => [styles.smallButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
            >
              <Feather name="check" size={17} color={colors.primaryForeground} />
            </Pressable>
          </>
        )}
        {complete && <Feather name="check-circle" size={22} color={colors.safe} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 12, gap: 2 },
  time: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  title: { fontSize: 15, fontWeight: '600' },
  completed: { textDecorationLine: 'line-through', opacity: 0.65 },
  status: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  smallButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.92 }], opacity: 0.82 },
});