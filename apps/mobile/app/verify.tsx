import { otpCodeSchema } from '@my-vdvoem/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText, PrimaryButton, RomanticMark, Screen } from '../src/components/ui';
import { useAppStore } from '../src/store/useAppStore';
import { useTheme } from '../src/theme/ThemeProvider';

export default function VerifyScreen() {
  const { email = '', invite } = useLocalSearchParams<{ email: string; invite?: string }>(); const router = useRouter(); const { colors } = useTheme(); const { verifyOtp, acceptInvite } = useAppStore();
  const [token, setToken] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => { const parsed = otpCodeSchema.safeParse(token); if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Проверьте код'); setLoading(true); try { await verifyOtp(email, parsed.data); if (invite) await acceptInvite(invite); router.replace('/(tabs)'); } catch (e) { setError(e instanceof Error ? e.message : 'Неверный код'); } finally { setLoading(false); } };
  return <Screen scroll={false}><View style={styles.root}><RomanticMark /><AppText variant="hero">Проверьте почту</AppText><AppText color={colors.textMuted}>Мы отправили шестизначный код на {email}</AppText><TextInput autoFocus keyboardType="number-pad" maxLength={6} value={token} onChangeText={(v) => setToken(v.replace(/\D/g, ''))} style={[styles.code, { color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border }]} placeholder="000000" placeholderTextColor={colors.textMuted} />{error && <AppText color={colors.danger}>{error}</AppText>}<PrimaryButton label="Войти" icon="heart-outline" loading={loading} onPress={() => void submit()} /></View></Screen>;
}
const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', gap: 15 }, code: { minHeight: 64, borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, textAlign: 'center', fontSize: 26, letterSpacing: 14, fontFamily: 'Manrope_700Bold' } });
