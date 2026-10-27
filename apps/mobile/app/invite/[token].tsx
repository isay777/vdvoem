import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, PrimaryButton, RomanticMark, Screen } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function InviteScreen() {
  const { token = '' } = useLocalSearchParams<{ token: string }>(); const router = useRouter(); const { colors } = useTheme(); const { authenticated, acceptInvite } = useAppStore(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const accept = async () => { if (!authenticated) return router.push({ pathname: '/sign-in', params: { invite: token } }); setLoading(true); try { await acceptInvite(token); router.replace('/(tabs)'); } catch (e) { setError(e instanceof Error ? e.message : 'Приглашение недействительно'); } finally { setLoading(false); } };
  return <Screen scroll={false}><View style={styles.root}><View style={[styles.icon, { backgroundColor: colors.elevated }]}><RomanticMark /></View><AppText variant="hero" style={styles.center}>Вас приглашают быть ближе</AppText><AppText color={colors.textMuted} style={styles.center}>После подтверждения вы оба увидите общие планы, списки и календарь. В паре может быть только два человека.</AppText>{error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={20} color={colors.danger} /><AppText color={colors.danger}>{error}</AppText></View>}<PrimaryButton label={authenticated ? 'Принять приглашение' : 'Войти и продолжить'} icon="heart" loading={loading} onPress={() => void accept()} /><AppText variant="caption" color={colors.textMuted} style={styles.center}>Присоединение можно отменить позднее. Перед выходом приложение объяснит, что произойдёт с общими данными.</AppText></View></Screen>;
}
const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', gap: 16 }, icon: { width: 92, height: 92, borderRadius: 32, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, center: { textAlign: 'center' }, error: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' } });
