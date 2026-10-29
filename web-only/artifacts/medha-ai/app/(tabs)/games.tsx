import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { MicButton } from '@/components/MicButton';
import { useApp } from '@/context/AppContext';

type Card = { id: string; pair: string; icon: keyof typeof Feather.glyphMap; flipped: boolean; matched: boolean };

const pairIcons: Array<{ pair: string; icon: keyof typeof Feather.glyphMap }> = [
  { pair: 'home', icon: 'home' },
  { pair: 'heart', icon: 'heart' },
  { pair: 'sun', icon: 'sun' },
  { pair: 'coffee', icon: 'coffee' },
];

function createDeck(): Card[] {
  return pairIcons
    .flatMap((item) => [
      { id: `${item.pair}-a-${Math.random()}`, pair: item.pair, icon: item.icon, flipped: false, matched: false },
      { id: `${item.pair}-b-${Math.random()}`, pair: item.pair, icon: item.icon, flipped: false, matched: false },
    ])
    .sort(() => Math.random() - 0.5);
}

export default function GamesScreen() {
  const colors = useColors();
  const { gameProgress, recordGameSession } = useApp();
  const [deck, setDeck] = useState<Card[]>(createDeck);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const matchedPairs = useMemo(() => deck.filter((card) => card.matched).length / 2, [deck]);
  const score = Math.max(40, 100 - mistakes * 10);

  useEffect(() => {
    if (openIds.length !== 2) return;
    const [firstId, secondId] = openIds;
    const first = deck.find((card) => card.id === firstId);
    const second = deck.find((card) => card.id === secondId);
    if (!first || !second) return;
    if (first.pair === second.pair) {
      setDeck((current) => current.map((card) => openIds.includes(card.id) ? { ...card, matched: true } : card));
      setOpenIds([]);
    } else {
      setMistakes((current) => current + 1);
      const timeout = setTimeout(() => {
        setDeck((current) => current.map((card) => openIds.includes(card.id) ? { ...card, flipped: false } : card));
        setOpenIds([]);
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [deck, openIds]);

  useEffect(() => {
    if (deck.length > 0 && deck.every((card) => card.matched) && !isComplete) {
      setIsComplete(true);
      recordGameSession(score);
    }
  }, [deck, isComplete, recordGameSession, score]);

  const chooseCard = (card: Card) => {
    if (card.flipped || card.matched || openIds.length === 2 || isComplete) return;
    setDeck((current) => current.map((item) => item.id === card.id ? { ...item, flipped: true } : item));
    setOpenIds((current) => [...current, card.id]);
  };

  const restart = () => {
    setDeck(createDeck());
    setOpenIds([]);
    setMistakes(0);
    setIsComplete(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>COGNITIVE PLAY</Text>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Find the pairs</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A gentle memory exercise, at your pace.</Text>
          </View>
          <View style={[styles.scorePill, { backgroundColor: colors.secondary }]}><Feather name="award" size={16} color={colors.primary} /><Text style={[styles.scoreText, { color: colors.primary }]}>{gameProgress.bestScore || '--'}</Text></View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.progressCopy}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>TODAY’S PRACTICE</Text>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>{matchedPairs} of {pairIcons.length} pairs found</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressFill, { backgroundColor: colors.safe, width: `${(matchedPairs / pairIcons.length) * 100}%` }]} /></View>
        </View>

        <View style={styles.grid}>
          {deck.map((card) => {
            const visible = card.flipped || card.matched;
            return (
              <Pressable
                key={card.id}
                testID={`game-card-${card.id}`}
                accessibilityLabel={visible ? `Card ${card.pair}` : 'Hidden memory card'}
                onPress={() => chooseCard(card)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: visible ? colors.peach : colors.card, borderColor: visible ? colors.accent : colors.border },
                  card.matched && { backgroundColor: colors.secondary, borderColor: colors.safe },
                  pressed && styles.pressed,
                ]}
              >
                {visible ? <Feather name={card.icon} size={29} color={card.matched ? colors.safe : colors.accentForeground} /> : <Feather name="help-circle" size={24} color={colors.mutedForeground} />}
              </Pressable>
            );
          })}
        </View>

        {isComplete ? (
          <View style={[styles.complete, { backgroundColor: colors.navy }]}>
            <View style={[styles.completeIcon, { backgroundColor: colors.sun }]}><Feather name="check" size={22} color={colors.navy} /></View>
            <View style={styles.completeCopy}><Text style={[styles.completeTitle, { color: colors.card }]}>Beautiful work</Text><Text style={[styles.completeBody, { color: colors.sage }]}>You finished with a score of {score}.</Text></View>
            <Pressable onPress={restart} accessibilityLabel="Play memory game again" style={[styles.playAgain, { backgroundColor: colors.card }]}><Text style={[styles.playAgainText, { color: colors.navy }]}>Again</Text></Pressable>
          </View>
        ) : (
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>Tap two cards to find a pair. There is no timer.</Text>
        )}
      </Screen>
      <MicButton />
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 7 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  scorePill: { height: 36, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreText: { fontSize: 14, fontWeight: '700' },
  progressCard: { marginTop: 24, borderWidth: 1, borderRadius: 19, padding: 15 },
  progressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  progressTitle: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 7, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18, justifyContent: 'center' },
  card: { width: '22%', minWidth: 68, aspectRatio: 0.92, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.84 },
  helper: { fontSize: 13, textAlign: 'center', marginTop: 18 },
  complete: { marginTop: 22, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center' },
  completeIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  completeCopy: { flex: 1 },
  completeTitle: { fontSize: 16, fontWeight: '700' },
  completeBody: { fontSize: 12, marginTop: 3 },
  playAgain: { height: 36, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  playAgainText: { fontSize: 12, fontWeight: '700' },
});