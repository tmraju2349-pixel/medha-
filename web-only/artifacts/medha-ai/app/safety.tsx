import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Screen } from '@/components/Screen';
import { TestDataBanner } from '@/components/TestDataBanner';

const caregiver = {
  name: 'Ananya Barua',
  relationship: 'Daughter',
  phone: '+919876543210',
  address: 'House 14, Zoo Road, opposite State Zoo Gate, Guwahati',
};

function distanceInMeters(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) {
  const earthRadius = 6371000;
  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;
  const deltaLat = ((end.latitude - start.latitude) * Math.PI) / 180;
  const deltaLon = ((end.longitude - start.longitude) * Math.PI) / 180;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SafetyScreen() {
  const colors = useColors();
  const router = useRouter();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [homeLocation, setHomeLocation] = useState<Location.LocationObject | null>(null);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [showHelpCard, setShowHelpCard] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Location.getLastKnownPositionAsync().then((value) => {
      if (value) setLocation(value);
    }).catch(() => undefined);
  }, []);

  const currentDistance = useMemo(() => {
    if (!location || !homeLocation) return null;
    return Math.round(distanceInMeters(location.coords, homeLocation.coords));
  }, [homeLocation, location]);

  const enableLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Location on this device', 'Use the mobile app to enable background location monitoring.');
      return;
    }
    const result = permission?.granted ? permission : await requestPermission();
    if (!result.granted) {
      if (!result.canAskAgain) await Linking.openSettings();
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation(current);
    if (!homeLocation) setHomeLocation(current);
  };

  const enableBackgroundSafety = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Background safety', 'Background location monitoring is available on the mobile app.');
      return;
    }
    const foreground = permission?.granted ? permission : await requestPermission();
    if (!foreground.granted) return;
    const result = await Location.requestBackgroundPermissionsAsync();
    setBackgroundEnabled(result.granted);
    if (!result.granted) {
      Alert.alert('Background access not enabled', 'Medha AI can still use the home boundary while the app is open.');
    }
  };

  const activateSos = () => {
    setSosActive(true);
    setShowHelpCard(false);
    Alert.alert('SOS Mode started', 'The calming safety screen is ready. Family notification will be connected to the caregiver service.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: sosActive ? colors.navy : colors.background }}>
      <Screen contentContainerStyle={sosActive ? styles.sosContent : undefined}>
        {!sosActive ? (
          <>
            <Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>CARE & SAFETY</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Geofencing & SOS</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A calm safety layer for the patient and a clear signal for family.</Text>
            <TestDataBanner compact />

            <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.locationIcon, { backgroundColor: colors.softNavy }]}><Feather name="map-pin" size={22} color={colors.primary} /></View>
              <View style={styles.locationCopy}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Home boundary</Text>
                <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{homeLocation ? '500 m perimeter is ready' : 'Set a home location to begin'}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: homeLocation ? colors.safe : colors.warning }]} />
            </View>

            {currentDistance !== null && (
              <View style={[styles.distanceCard, { backgroundColor: currentDistance > 500 ? colors.peach : colors.secondary }]}>
                <Feather name={currentDistance > 500 ? 'alert-triangle' : 'check-circle'} size={18} color={currentDistance > 500 ? colors.accentForeground : colors.safe} />
                <Text style={[styles.distanceText, { color: currentDistance > 500 ? colors.accentForeground : colors.primary }]}>{currentDistance > 500 ? 'Outside the home boundary' : 'Patient is inside the home boundary'} · {currentDistance} m away</Text>
              </View>
            )}

            <Pressable onPress={enableLocation} accessibilityLabel="Enable location and set home boundary" style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Feather name="navigation" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{homeLocation ? 'Refresh current location' : 'Enable location'}</Text>
            </Pressable>
            <Pressable onPress={enableBackgroundSafety} accessibilityLabel="Enable background safety monitoring" style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}>
              <Feather name="radio" size={17} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{backgroundEnabled ? 'Background safety is on' : 'Enable background safety monitoring'}</Text>
              {backgroundEnabled && <Feather name="check-circle" size={17} color={colors.safe} />}
            </Pressable>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Emergency support</Text>
            <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.peach }]}><Text style={[styles.avatarText, { color: colors.accentForeground }]}>AB</Text></View>
              <View style={styles.contactCopy}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{caregiver.name}</Text><Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{caregiver.relationship} · Primary caregiver</Text></View>
              <Pressable onPress={() => Linking.openURL(`tel:${caregiver.phone}`)} accessibilityLabel="Call Ananya" style={[styles.callButton, { backgroundColor: colors.secondary }]}><Feather name="phone" size={18} color={colors.primary} /></Pressable>
            </View>
            <Text style={[styles.address, { color: colors.mutedForeground }]}>{caregiver.address}</Text>

            <Pressable testID="sos-activate" onPress={activateSos} accessibilityLabel="Start SOS Mode" style={({ pressed }) => [styles.sosButton, { backgroundColor: colors.safe }, pressed && styles.pressed]}>
              <Feather name="shield" size={19} color={colors.card} />
              <Text style={[styles.sosButtonText, { color: colors.card }]}>Where am I? Help</Text>
            </Pressable>
            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>SOS uses a calming screen. It does not replace emergency services.</Text>
          </>
        ) : (
          <View style={styles.sosView}>
            <View style={styles.safePill}><View style={[styles.safeDot, { backgroundColor: colors.sun }]} /><Text style={[styles.safePillText, { color: colors.sage }]}>YOU ARE SAFE · HELP IS ON THE WAY</Text></View>
            {!showHelpCard ? (
              <>
                <View style={[styles.homeImage, { backgroundColor: colors.primary }]}><Feather name="home" size={48} color={colors.sage} /><Text style={[styles.homeImageText, { color: colors.sage }]}>Familiar home</Text></View>
                <Text style={[styles.calmTitle, { color: colors.card }]}>Baba, please stay right where you are.</Text>
                <Text style={[styles.calmBody, { color: colors.sage }]}>{caregiver.name} knows your location and is coming to help you.</Text>
                <Pressable onPress={() => setShowHelpCard(true)} accessibilityLabel="Show help card to someone nearby" style={[styles.helpButton, { backgroundColor: colors.card }]}><Feather name="users" size={19} color={colors.navy} /><Text style={[styles.helpButtonText, { color: colors.navy }]}>Show this screen for help</Text><Feather name="arrow-right" size={18} color={colors.navy} /></Pressable>
                <Pressable onPress={() => Linking.openURL(`tel:${caregiver.phone}`)} accessibilityLabel="Call caregiver" style={[styles.callCaregiver, { borderColor: colors.sage }]}><Feather name="phone" size={18} color={colors.card} /><Text style={[styles.callCaregiverText, { color: colors.card }]}>Call {caregiver.name}</Text></Pressable>
              </>
            ) : (
              <View style={[styles.helpCard, { backgroundColor: colors.card }]}>
                <View style={styles.helpCardHeader}><Feather name="users" size={21} color={colors.navy} /><Text style={[styles.helpCardTitle, { color: colors.navy }]}>PLEASE HELP ME RETURN HOME</Text></View>
                <Text style={[styles.helpLabel, { color: colors.mutedForeground }]}>MY NAME</Text><Text style={[styles.helpValue, { color: colors.foreground }]}>Ramesh Barua · Age 72</Text>
                <Text style={[styles.helpLabel, { color: colors.mutedForeground }]}>LANGUAGES</Text><Text style={[styles.helpValue, { color: colors.foreground }]}>Assamese · Hindi · English</Text>
                <Text style={[styles.helpLabel, { color: colors.mutedForeground }]}>HOME ADDRESS</Text><Text style={[styles.helpValue, { color: colors.foreground }]}>{caregiver.address}</Text>
                <Pressable onPress={() => Linking.openURL(`tel:${caregiver.phone}`)} style={[styles.giantCall, { backgroundColor: colors.safe }]}><Feather name="phone" size={22} color={colors.card} /><Text style={[styles.giantCallText, { color: colors.card }]}>Tap to call {caregiver.name}</Text></Pressable>
              </View>
            )}
            <Pressable onPress={() => setSosActive(false)} accessibilityLabel="End SOS Mode" style={[styles.safeButton, { borderColor: colors.sage }]}><Text style={[styles.safeButtonText, { color: colors.sage }]}>I am safe now</Text></Pressable>
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 7 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 7, marginBottom: 24 },
  locationCard: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center' },
  locationIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  locationCopy: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardBody: { fontSize: 12, marginTop: 3 },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  distanceCard: { marginTop: 10, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  distanceText: { fontSize: 12, fontWeight: '600', flex: 1 },
  primaryButton: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  primaryButtonText: { fontSize: 14, fontWeight: '700' },
  secondaryButton: { minHeight: 47, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 9 },
  secondaryButtonText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  contactCard: { borderWidth: 1, borderRadius: 20, padding: 13, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { fontSize: 13, fontWeight: '700' },
  contactCopy: { flex: 1 },
  callButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  address: { fontSize: 12, lineHeight: 18, marginTop: 9, paddingHorizontal: 3 },
  sosButton: { height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 28 },
  sosButtonText: { fontSize: 15, fontWeight: '700' },
  disclaimer: { fontSize: 11, textAlign: 'center', marginTop: 9 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  sosContent: { flexGrow: 1 },
  sosView: { flex: 1, alignItems: 'center', minHeight: 650, paddingTop: 18 },
  safePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.08)' },
  safeDot: { width: 9, height: 9, borderRadius: 5 },
  safePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  homeImage: { width: 180, height: 150, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 62, gap: 11 },
  homeImageText: { fontSize: 13, fontWeight: '600' },
  calmTitle: { fontSize: 23, lineHeight: 30, fontWeight: '700', textAlign: 'center', marginTop: 26, maxWidth: 320 },
  calmBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 9, maxWidth: 320 },
  helpButton: { minHeight: 54, borderRadius: 17, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 34, width: '100%' },
  helpButtonText: { fontSize: 14, fontWeight: '700', flex: 1 },
  callCaregiver: { minHeight: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, width: '100%' },
  callCaregiverText: { fontSize: 14, fontWeight: '700' },
  helpCard: { width: '100%', borderRadius: 22, padding: 18, marginTop: 26 },
  helpCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#DCE5DD' },
  helpCardTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  helpLabel: { fontSize: 10, letterSpacing: 1, fontWeight: '700', marginTop: 15 },
  helpValue: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 3 },
  giantCall: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  giantCallText: { fontSize: 14, fontWeight: '700' },
  safeButton: { height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 16 },
  safeButtonText: { fontSize: 14, fontWeight: '700' },
});