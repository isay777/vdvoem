import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, useTheme } from '../theme/ThemeProvider';

export function Screen({ children, scroll = true, padded = true }: PropsWithChildren<{ scroll?: boolean; padded?: boolean }>) {
  const { colors } = useTheme();
  const content = scroll
    ? <ScrollView contentContainerStyle={[styles.content, padded && styles.padded]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    : <View style={[styles.flex, padded && styles.padded]}>{children}</View>;
  return <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>{content}</SafeAreaView>;
}

export function AppText({ children, variant = 'body', color, numberOfLines, style }: PropsWithChildren<{ variant?: 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'label'; color?: string; numberOfLines?: number; style?: object }>) {
  const { colors } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[styles.text, styles[variant], { color: color ?? colors.text }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  const { colors } = useTheme();
  const content = <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? .78 : 1 })}>{content}</Pressable> : content;
}

export function IconBadge({ name, color, background }: { name: keyof typeof Ionicons.glyphMap; color?: string; background?: string }) {
  const { colors } = useTheme();
  return <View style={[styles.iconBadge, { backgroundColor: background ?? colors.elevated }]}><Ionicons name={name} size={22} color={color ?? colors.primary} /></View>;
}

export function PrimaryButton({ label, icon, onPress, disabled, loading }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: disabled ? .45 : pressed ? .82 : 1 }]}>
    {loading ? <ActivityIndicator color="white" /> : <>{icon && <Ionicons name={icon} size={20} color="white" />}<AppText variant="label" color="white">{label}</AppText></>}
  </Pressable>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return <View style={styles.sectionTitle}><AppText variant="subtitle">{title}</AppText>{action && <Pressable onPress={onAction} hitSlop={8}><AppText variant="label" color={colors.primary}>{action}</AppText></Pressable>}</View>;
}

export function EmptyState({ icon = 'heart-outline', title, description, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; description: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.elevated }]}><Ionicons name={icon} size={34} color={colors.primary} /></View><AppText variant="subtitle">{title}</AppText><AppText color={colors.textMuted} style={styles.center}>{description}</AppText>{action}</View>;
}

export function RomanticMark({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  return <View accessibilityLabel="Мы вдвоём" style={[styles.mark, compact && { width: 42, height: 36 }]}><Ionicons name="heart" size={compact ? 26 : 36} color={colors.primary} /><Ionicons name="heart" size={compact ? 22 : 30} color={colors.secondary} style={styles.markSecond} /></View>;
}

export function OfflineBanner({ pending = 0 }: { pending?: number }) {
  const { colors } = useTheme();
  return <View style={[styles.offline, { backgroundColor: colors.elevated }]}><Ionicons name="cloud-offline-outline" size={17} color={colors.primary} /><AppText variant="caption">Нет сети{pending ? ` · ждут отправки: ${pending}` : ''}</AppText></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { paddingBottom: 120 }, padded: { paddingHorizontal: 18 },
  text: { fontFamily: 'Manrope_400Regular' }, hero: { fontFamily: 'Manrope_800ExtraBold', fontSize: 32, lineHeight: 38, letterSpacing: -.7 }, title: { fontFamily: 'Manrope_700Bold', fontSize: 24, lineHeight: 30 }, subtitle: { fontFamily: 'Manrope_700Bold', fontSize: 18, lineHeight: 24 }, body: { fontSize: 15, lineHeight: 22 }, caption: { fontSize: 12, lineHeight: 16 }, label: { fontFamily: 'Manrope_700Bold', fontSize: 14, lineHeight: 20 },
  card: { borderRadius: layout.radii.lg, borderWidth: 1, padding: 16, shadowColor: '#4D3147', shadowOpacity: .06, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  iconBadge: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: 52, borderRadius: 17, paddingHorizontal: 20, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: 26, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { alignItems: 'center', paddingVertical: 38, gap: 9 }, emptyIcon: { width: 68, height: 68, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 5 }, center: { textAlign: 'center', maxWidth: 290 },
  mark: { width: 58, height: 50, alignItems: 'flex-start', justifyContent: 'center' }, markSecond: { position: 'absolute', left: 21, top: 13 },
  offline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 18, marginBottom: 8, paddingVertical: 8, borderRadius: 12 },
});
