import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function AppEntryRoute() {
  const colors = useColors();
  const router = useRouter();
  const { isHydrated, isDemo, session } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;
    router.replace(isDemo || session ? '/home' : '/auth');
  }, [isDemo, isHydrated, router, session]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
