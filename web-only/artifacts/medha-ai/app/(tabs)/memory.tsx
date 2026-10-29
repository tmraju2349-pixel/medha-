import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { MicButton } from '@/components/MicButton';
import { TestDataBanner } from '@/components/TestDataBanner';
import { useApp } from '@/context/AppContext';

export default function MemoryAssistantScreen() {
  const colors = useColors();
  const { memoryCues, testDataActive } = useApp();
  const [selected, setSelected] = useState('people');
  const selectedType = selected === 'people' ? 'person' : selected === 'places' ? 'place' : 'routine';
  const memoryCards = memoryCues.filter((cue) => cue.type === selectedType);
  const cardColors = [colors.peach, colors.secondary, colors.sage, colors.softNavy];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>FAMILIAR MOMENTS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Memory Assistant</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A familiar space for people, places, routines, and family stories.</Text>
        {testDataActive && <TestDataBanner compact />}
        <View style={[styles.prompt, { backgroundColor: colors.navy }]}>
          <Feather name="volume-2" size={18} color={colors.sun} />
          <Text style={[styles.promptText, { color: colors.card }]}>“This is your familiar memory space. Take your time.”</Text>
        </View>
        <View style={styles.tabs}>
          {(['people', 'places', 'routines'] as const).map((tab) => (
            <Pressable key={tab} onPress={() => setSelected(tab)} style={[styles.tab, { backgroundColor: selected === tab ? colors.primary : colors.card, borderColor: selected === tab ? colors.primary : colors.border }]}>
              <Text style={[styles.tabText, { color: selected === tab ? colors.primaryForeground : colors.mutedForeground }]}>{tab[0].toUpperCase() + tab.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        {memoryCards.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="book-open" size={19} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No familiar memories saved here yet.</Text>
          </View>
        )}
        {memoryCards.map((card, index) => (
          <View key={card.id} style={[styles.memoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardIcon, { backgroundColor: cardColors[index % cardColors.length] }]}><Feather name={card.icon as keyof typeof Feather.glyphMap} size={19} color={colors.primary} /></View>
            <View style={styles.cardCopy}><Text style={[styles.cardName, { color: colors.foreground }]}>{card.title}</Text><Text style={[styles.cardDetail, { color: colors.mutedForeground }]}>{card.detail}</Text></View>
            <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
          </View>
        ))}
      </Screen>
      <MicButton />
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '700', marginTop: 7 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 7, maxWidth: 320 },
  prompt: { marginTop: 24, borderRadius: 19, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  promptText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 12 },
  tab: { borderWidth: 1, borderRadius: 14, height: 37, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  memoryCard: { borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  empty: { borderWidth: 1, borderRadius: 19, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 13, lineHeight: 18, flex: 1 },
  cardIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  cardCopy: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardDetail: { fontSize: 12, lineHeight: 18, marginTop: 3 },
});