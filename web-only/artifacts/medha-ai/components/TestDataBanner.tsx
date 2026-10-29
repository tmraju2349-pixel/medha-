import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { TEST_DATA_LABEL } from '@/data/testPatientData';

export function TestDataBanner({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.peach, borderColor: colors.accent }, compact && styles.compact]}>
      <Feather name="alert-triangle" size={compact ? 14 : 16} color={colors.accentForeground} />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.accentForeground }]}>{TEST_DATA_LABEL}</Text>
        {!compact && <Text style={[styles.body, { color: colors.accentForeground }]}>This patient profile is for testing only. Delete it from More → Test patient database.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 18 },
  compact: { paddingVertical: 8, marginBottom: 10, alignItems: 'center' },
  copy: { flex: 1 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.45 },
  body: { fontSize: 11, lineHeight: 16, marginTop: 3, fontWeight: '600' },
});