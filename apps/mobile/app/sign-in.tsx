import { Ionicons } from '@expo/vector-icons';
import { otpEmailSchema } from '@my-vdvoem/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, PrimaryButton, RomanticMark, Screen } from '../src/components/ui';
import { isBackendConfigured } from '../src/lib/supabase';
import { useAppStore } from '../src/store/useAppStore';
import { useTheme } from '../src/theme/ThemeProvider';

export default function SignInScreen() {
  const router = useRouter(); const { colors } = useTheme(); const { sendOtp, enterDemo } = useAppStore();
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => { const parsed = otpEmailSchema.safeParse({ email }); if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Проверьте email'); setLoading(true); setError(null); try { await sendOtp(parsed.data.email); router.push({ pathname: '/verify', params: { email: parsed.data.email, ...(invite ? { invite } : {}) } }); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось отправить код'); } finally { setLoading(false); } };
  return <Screen scroll={false}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
    <View style={styles.hearts}><Ionicons name="heart-outline" size={28} color={colors.primary} /><Ionicons name="heart" size={17} color={colors.secondary} /></View>
    <RomanticMark /><AppText variant="hero">Ваше место{`\n`}только для двоих</AppText><AppText color={colors.textMuted}>Планы, подарки, свидания и повседневные дела — спокойно и приватно.</AppText>
    <View style={styles.form}><AppText variant="label">Email</AppText><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} style={[styles.input, { color: colors.text, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surface }]} />{error && <AppText variant="caption" color={colors.danger}>{error}</AppText>}<PrimaryButton label="Получить код" icon="mail-outline" loading={loading} disabled={!isBackendConfigured} onPress={() => void submit()} /></View>
    {!isBackendConfigured && <View style={[styles.notice, { backgroundColor: colors.elevated }]}><Ionicons name="information-circle-outline" size={20} color={colors.primary} /><AppText variant="caption" style={styles.noticeText}>Supabase ещё не подключён. Можно открыть безопасный демонстрационный режим интерфейса.</AppText></View>}
    <Pressable onPress={() => { enterDemo(); router.replace('/(tabs)'); }} style={styles.demo}><AppText variant="label" color={colors.primary}>Посмотреть демонстрацию</AppText></Pressable>
    <AppText variant="caption" color={colors.textMuted} style={styles.privacy}>Продолжая, вы соглашаетесь с политикой конфиденциальности. Мы не показываем содержимое пары посторонним.</AppText>
  </KeyboardAvoidingView></Screen>;
}
const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', paddingHorizontal: 8, gap: 14 }, hearts: { position: 'absolute', right: 16, top: 36, flexDirection: 'row', gap: 5, alignItems: 'center' }, form: { gap: 9, marginTop: 20 }, input: { minHeight: 54, borderWidth: 1, borderRadius: 17, paddingHorizontal: 16, fontFamily: 'Manrope_400Regular', fontSize: 16 }, notice: { flexDirection: 'row', gap: 8, borderRadius: 14, padding: 12 }, noticeText: { flex: 1 }, demo: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, privacy: { textAlign: 'center', marginTop: 8 } });
