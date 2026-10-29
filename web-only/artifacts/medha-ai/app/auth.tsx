import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function AuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    user,
    isLoading,
    error,
    signIn,
    signInWithGoogle,
    signUp,
    clearError,
  } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');

  const submit = async () => {
    clearError();
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        router.replace('/home');
        return;
      }

      const result = await signUp(email, password, displayName, role);
      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Check your email',
          'Your account was created. Confirm your email, then return here to sign in.',
        );
        setMode('signin');
        return;
      }
      router.replace('/home');
    } catch {
      // The provider exposes the friendly server error below the form.
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Screen>
          <Pressable
            accessibilityLabel="Open the local test demo"
            onPress={() => router.push('/demo')}
            style={styles.back}
          >
            <Feather name="database" size={17} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Explore local test demo</Text>
          </Pressable>

          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="heart" size={24} color={colors.card} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>MEDHA AI</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {mode === 'signin' ? 'Welcome back' : 'Create a care account'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {mode === 'signin'
              ? 'Sign in to keep your care plan synced securely.'
              : 'Your account keeps your care plan available when you change devices.'}
          </Text>

          {user && (
            <View style={[styles.connected, { backgroundColor: colors.secondary }]}>
              <Feather name="check-circle" size={17} color={colors.safe} />
              <Text style={[styles.connectedText, { color: colors.foreground }]}>
                Connected as {user.email || 'your Medha account'}
              </Text>
            </View>
          )}

          {mode === 'signup' && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Your name</Text>
              <TextInput
                accessibilityLabel="Your name"
                autoCapitalize="words"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How should Medha greet you?"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
              />
              <Text style={[styles.label, { color: colors.foreground }]}>I am joining as</Text>
              <View style={styles.roleRow}>
                {([
                  ['patient', 'Patient'],
                  ['caregiver', 'Caregiver'],
                ] as const).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setRole(value)}
                    style={[
                      styles.roleChoice,
                      {
                        backgroundColor: role === value ? colors.secondary : colors.card,
                        borderColor: role === value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={value === 'patient' ? 'user' : 'users'}
                      size={16}
                      color={role === value ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[styles.roleText, { color: role === value ? colors.primary : colors.foreground }]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          />
          <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          />

          {error && (
            <View style={[styles.error, { backgroundColor: colors.peach }]}>
              <Feather name="alert-circle" size={17} color={colors.accentForeground} />
              <Text style={[styles.errorText, { color: colors.accentForeground }]}>{error}</Text>
            </View>
          )}

          <Pressable
            accessibilityLabel={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={() => void submit()}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
              isLoading && styles.disabled,
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.card }]}>
              {isLoading ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Create account'}
            </Text>
            {!isLoading && <Feather name="arrow-right" size={18} color={colors.card} />}
          </Pressable>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>
          <Pressable
            accessibilityLabel="Continue with Google"
            onPress={() => {
              void signInWithGoogle()
                .then((signedIn) => {
                  if (signedIn) router.replace('/home');
                })
                .catch(() => {
                  // The provider exposes the friendly OAuth setup error below the form.
                });
            }}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.googleButton,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && styles.pressed,
              isLoading && styles.disabled,
            ]}
          >
            <Feather name="globe" size={17} color={colors.primary} />
            <Text style={[styles.googleButtonText, { color: colors.foreground }]}>
              {isLoading ? 'Please wait…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              clearError();
              setMode(mode === 'signin' ? 'signup' : 'signin');
            }}
            style={styles.modeButton}
          >
            <Text style={[styles.modeText, { color: colors.primary }]}>
              {mode === 'signin'
                ? 'New to Medha? Create a free account'
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>

          <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
            Your password stays with Supabase Auth. Medha never stores it in the mobile app.
          </Text>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 35 },
  backText: { fontSize: 13, fontWeight: '700' },
  logo: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 20 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '700', marginTop: 7 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 24, maxWidth: 340 },
  connected: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginBottom: 16 },
  connectedText: { flex: 1, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 13 },
  input: { minHeight: 51, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 9 },
  roleChoice: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  roleText: { fontSize: 13, fontWeight: '700' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginTop: 16 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  primaryButton: { minHeight: 54, borderRadius: 17, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonText: { fontSize: 15, fontWeight: '800' },
  modeButton: { alignItems: 'center', paddingVertical: 18 },
  modeText: { fontSize: 13, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  orLine: { height: 1, flex: 1 },
  orText: { fontSize: 12, fontWeight: '600' },
  googleButton: { minHeight: 51, borderWidth: 1, borderRadius: 15, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  googleButtonText: { fontSize: 14, fontWeight: '700' },
  privacy: { textAlign: 'center', fontSize: 11, lineHeight: 16, paddingHorizontal: 20, marginTop: 14 },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.6 },
});