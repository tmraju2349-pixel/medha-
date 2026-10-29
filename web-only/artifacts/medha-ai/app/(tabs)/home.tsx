import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { MicButton } from '@/components/MicButton';
import { TaskCard } from '@/components/TaskCard';
import { TestDataBanner } from '@/components/TestDataBanner';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isDemo } = useAuth();
  const { tasks, notifications, diaryEntries, markNotificationRead, testDataActive, patient } = useApp();
  const pendingCount = useMemo(() => tasks.filter((task) => task.status !== 'done').length, [tasks]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>THURSDAY · SEPTEMBER 3</Text>
            <Text style={[styles.greeting, { color: colors.foreground }]}>{patient ? `Good morning, ${patient.name.split(' ')[0]}` : 'Welcome to Medha AI'}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Let’s take today one gentle step at a time.</Text>
          </View>
          <Pressable
            accessibilityLabel="Open notifications"
            testID="notifications-button"
            onPress={() => {
              const unread = notifications.find((notification) => !notification.read);
              if (unread) markNotificationRead(unread.id);
            }}
            style={({ pressed }) => [styles.bell, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Feather name="bell" size={20} color={colors.foreground} />
            {unreadCount > 0 && <View style={[styles.badge, { backgroundColor: colors.accent }]}><Text style={[styles.badgeText, { color: colors.accentForeground }]}>{unreadCount}</Text></View>}
          </Pressable>
        </View>
        {testDataActive && <TestDataBanner />}
        {!patient && (
          <View style={[styles.noPatient, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user-x" size={18} color={colors.mutedForeground} />
            <Text style={[styles.noPatientText, { color: colors.mutedForeground }]}>
              {isDemo
                ? 'No test patient is loaded. Use More → Test patient database to reload the clearly labeled test profile.'
                : 'No patient data is loaded for this account yet.'}
            </Text>
          </View>
        )}

        <LinearGradient
          colors={[colors.navy, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.streak}
        >
          <View style={styles.streakIcon}><Feather name="sunrise" size={24} color={colors.sun} /></View>
          <View style={styles.streakCopy}>
            <Text style={[styles.streakLabel, { color: colors.sage }]}>YOUR DAILY RHYTHM</Text>
            <Text style={[styles.streakTitle, { color: colors.card }]}>3 day streak</Text>
            <Text style={[styles.streakBody, { color: colors.card }]}>Small moments of care add up.</Text>
          </View>
          <View style={styles.streakDays}>
            {['M', 'T', 'W', 'T', 'F'].map((day, index) => (
              <View key={`${day}-${index}`} style={[styles.day, index < 3 ? { backgroundColor: colors.sun } : { borderColor: colors.sage, borderWidth: 1 }]}>
                {index < 3 && <Feather name="check" size={12} color={colors.navy} />}
                {index >= 3 && <Text style={[styles.dayText, { color: colors.sage }]}>{day}</Text>}
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today’s care plan</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{pendingCount} moments still ahead</Text>
          </View>
          <Pressable onPress={() => router.navigate('/more')} accessibilityLabel="Open all settings">
            <Text style={[styles.link, { color: colors.primary }]}>Manage</Text>
          </Pressable>
        </View>
        {tasks.map((task) => <TaskCard key={task.id} task={task} />)}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>A gentle note</Text>
          <Feather name="volume-2" size={18} color={colors.mutedForeground} />
        </View>
        <View style={styles.noteContainer}>
          <View style={[styles.note, { backgroundColor: colors.peach, borderColor: colors.accent }]}>
            <View style={[styles.noteIcon, { backgroundColor: colors.card }]}><Feather name="message-circle" size={18} color={colors.accentForeground} /></View>
            <Text style={[styles.noteText, { color: colors.accentForeground }]}>
              {diaryEntries[0]?.transcript ?? 'You are doing well. Take your time, breathe slowly, and stay close to your routine.'}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Open SOS safety help"
          testID="sos-entry"
          onPress={() => router.navigate('/more')}
          style={({ pressed }) => [styles.sos, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
        >
          <View style={[styles.sosIcon, { backgroundColor: colors.softNavy }]}><Feather name="shield" size={19} color={colors.navy} /></View>
          <View style={styles.sosCopy}>
            <Text style={[styles.sosTitle, { color: colors.foreground }]}>Where am I? Help</Text>
            <Text style={[styles.sosBody, { color: colors.mutedForeground }]}>Your family can help find you.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      </Screen>
      <MicButton />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 7 },
  greeting: { fontSize: 26, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, marginTop: 5, lineHeight: 20, maxWidth: 290 },
  bell: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -3, top: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  streak: { borderRadius: 24, padding: 17, flexDirection: 'row', alignItems: 'center', minHeight: 132, overflow: 'hidden' },
  streakIcon: { width: 46, height: 46, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  streakCopy: { flex: 1 },
  streakLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  streakTitle: { fontSize: 23, fontWeight: '700', marginTop: 3 },
  streakBody: { fontSize: 12, opacity: 0.82, marginTop: 2 },
  streakDays: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  day: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 9, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 3 },
  link: { fontSize: 13, fontWeight: '700' },
  noteContainer: { flexDirection: 'row' },
  note: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center' },
  noteIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  noPatient: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 18 },
  noPatientText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  sos: { marginTop: 16, borderRadius: 20, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center' },
  sosIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  sosCopy: { flex: 1 },
  sosTitle: { fontSize: 15, fontWeight: '700' },
  sosBody: { fontSize: 12, marginTop: 3 },
});
