import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { TestDataBanner } from '@/components/TestDataBanner';

const reports = [
  { title: 'Care plan summary', date: 'Updated 28 Aug 2026', detail: 'Daily routines, hydration, medicine, and appointment notes.', icon: 'clipboard' as const },
  { title: 'Cognitive practice overview', date: 'Updated 01 Sep 2026', detail: 'Recent game sessions and gentle progress markers.', icon: 'activity' as const },
];

export default function ReportsScreen() {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>PRIVATE CARE RECORD</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Medical reports</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A calm, read-only view for the patient. Your caregiver controls sharing.</Text>
        <TestDataBanner compact />
        <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
          <Feather name="lock" size={18} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.primary }]}>These reports are stored locally in this prototype and are not shared without caregiver setup.</Text>
        </View>
        {reports.map((report) => (
          <Pressable key={report.title} onPress={() => undefined} style={[styles.report, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.reportIcon, { backgroundColor: colors.softNavy }]}><Feather name={report.icon} size={20} color={colors.primary} /></View>
            <View style={styles.reportCopy}><Text style={[styles.reportTitle, { color: colors.foreground }]}>{report.title}</Text><Text style={[styles.reportDate, { color: colors.primary }]}>{report.date}</Text><Text style={[styles.reportDetail, { color: colors.mutedForeground }]}>{report.detail}</Text></View>
            <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
          </Pressable>
        ))}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>For urgent medical concerns, contact your care team or local emergency services.</Text>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 7 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 22 },
  notice: { borderRadius: 18, padding: 14, flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  report: { borderWidth: 1, borderRadius: 20, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reportIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  reportCopy: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: '700' },
  reportDate: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  reportDetail: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  footer: { textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 24, paddingHorizontal: 15 },
});