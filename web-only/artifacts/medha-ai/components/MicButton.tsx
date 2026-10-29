import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

export function MicButton() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { micPosition } = useApp();
  const bottom = Math.max(insets.bottom, 14) + 78;
  const top = Math.max(insets.top, 14) + 68;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        micPosition.includes('bottom') ? { bottom } : { top },
        micPosition.includes('right') ? { right: 20 } : { left: 20 },
      ]}
    >
      <Pressable
        accessibilityLabel="Open Voice Diary"
        testID="persistent-microphone"
        onPress={() => router.navigate('/voice')}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, borderColor: colors.card },
          pressed && styles.pressed,
        ]}
      >
        <Feather name="mic" size={24} color={colors.primaryForeground} />
        <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', zIndex: 20 },
  button: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: '#163B35',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  liveDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    top: 9,
    right: 9,
  },
});