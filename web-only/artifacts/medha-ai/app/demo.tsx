import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function DemoEntryRoute() {
  const colors = useColors();
  const router = useRouter();
  const { enterDemo } = useAuth();

  const openDemo = () => {
    enterDemo();
    router.replace('/home');
  };

  return (
    <Screen>
      <Pressable
        accessibilityLabel="Back to real account sign-in"
        onPress={() => router.replace('/auth')}
        style={styles.back}
      >
        <Feather name="arrow-left" size={19} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Real account sign-in</Text>
      </Pressable>

      <View style={[styles.icon, { backgroundColor: colors.peach }]}>
        <Feather name="database" size={23} color={colors.accentForeground} />
      </View>
      <Text style={[styles.eyebrow, { color: colors.accentForeground }]}>TEST DATA — DELETE ME</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Local demo</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        Explore Medha with a built-in test patient. This demo stays on this device and is never
        connected to an account or synced.
      </Text>

      <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="info" size={18} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.foreground }]}>
          Demo records are sample information, not real patient data.
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Open local test-data demo"
        testID="open-local-demo"
        onPress={openDemo}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.primaryButtonText, { color: colors.card }]}>Open local demo</Text>
        <Feather name="arrow-right" size={18} color={colors.card} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 38 },
  backText: { fontSize: 13, fontWeight: '700' },
  icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, marginTop: 20 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '700', marginTop: 7 },
  body: { fontSize: 15, lineHeight: 23, marginTop: 9, marginBottom: 24, maxWidth: 350 },
  notice: { borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  primaryButton: { minHeight: 54, borderRadius: 17, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonText: { fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.84 },
});
