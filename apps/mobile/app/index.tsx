import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, RomanticMark } from '../src/components/ui';
import { useAppStore } from '../src/store/useAppStore';
import { useTheme } from '../src/theme/ThemeProvider';

export default function Index() {
  const { booting, authenticated } = useAppStore();
  const { colors } = useTheme();
  if (!booting) return <Redirect href={authenticated ? '/(tabs)' : '/sign-in'} />;
  return <View style={[styles.root, { backgroundColor: colors.background }]}><RomanticMark /><AppText variant="title">Мы вдвоём</AppText><ActivityIndicator color={colors.primary} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 } });
