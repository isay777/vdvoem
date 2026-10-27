import { Ionicons } from '@expo/vector-icons';
import type { EntityKind } from '@my-vdvoem/shared';
import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, IconBadge, OfflineBanner, RomanticMark, Screen, SectionTitle } from '../../src/components/ui';
import { useAppStore, type RecordView } from '../../src/store/useAppStore';
import { useTheme } from '../../src/theme/ThemeProvider';

const quick: { kind: EntityKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'wishlist', label: 'Желание', icon: 'gift-outline' }, { kind: 'event', label: 'Событие', icon: 'calendar-outline' }, { kind: 'shopping', label: 'Покупка', icon: 'basket-outline' },
];
function dueLabel(record?: RecordView) { const raw = record?.raw; const value = String(raw?.starts_at ?? ''); const date = parseISO(value); return value && isValid(date) ? format(date, 'd MMMM, HH:mm', { locale: ru }) : 'Скоро'; }

export default function HomeScreen() {
  const router = useRouter(); const { colors } = useTheme(); const { records, online, pending, identity, toggleRecord } = useAppStore();
  const event = records.find((r) => r.kind === 'event'); const tasks = records.filter((r) => r.kind === 'task' && !r.completed).slice(0, 2); const shopping = records.filter((r) => r.kind === 'shopping' && !r.completed).slice(0, 2);
  return <Screen>{!online && <OfflineBanner pending={pending} />}
    <View style={styles.header}><View><AppText variant="caption" color={colors.textMuted}>ДОБРОЕ УТРО</AppText><AppText variant="title">{identity?.displayName ?? 'Вы'} <Ionicons name="heart" size={18} color={colors.primary} /></AppText></View><RomanticMark compact /></View>
    <Card style={[styles.hero, { backgroundColor: colors.elevated }]} onPress={() => router.push('/(tabs)/calendar')}><View style={styles.heroTop}><View><AppText variant="caption" color={colors.secondary}>БЛИЖАЙШЕЕ СОБЫТИЕ</AppText><AppText variant="subtitle" style={styles.heroTitle}>{event?.title ?? 'Запланируйте ваше свидание'}</AppText></View><IconBadge name="sparkles" /></View><View style={styles.heroBottom}><Ionicons name="time-outline" size={18} color={colors.primary} /><AppText variant="label" color={colors.primary}>{dueLabel(event)}</AppText></View><View style={styles.floatingHeart}><Ionicons name="heart" size={74} color={`${colors.primary}15`} /></View></Card>
    <SectionTitle title="Добавить быстро" /><View style={styles.quickRow}>{quick.map((item) => <Pressable key={item.kind} onPress={() => router.push({ pathname: '/editor/[kind]', params: { kind: item.kind } })} style={({ pressed }) => [styles.quick, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? .7 : 1 }]}><IconBadge name={item.icon} /><AppText variant="caption" style={styles.quickLabel}>{item.label}</AppText></Pressable>)}</View>
    <SectionTitle title="Дела на двоих" action="Все" onAction={() => router.push({ pathname: '/list/[kind]', params: { kind: 'task' } })} />
    <Card>{tasks.length ? tasks.map((task, index) => <Pressable key={task.id} onPress={() => void toggleRecord(task)} style={[styles.line, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}><Ionicons name={task.completed ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={task.completed ? colors.success : colors.primary} /><View style={styles.lineText}><AppText variant="label">{task.title}</AppText><AppText variant="caption" color={colors.textMuted}>{task.subtitle || 'Для вас двоих'}</AppText></View></Pressable>) : <AppText color={colors.textMuted}>На сегодня всё спокойно ✨</AppText>}</Card>
    <SectionTitle title="Покупки" action="Список" onAction={() => router.push({ pathname: '/list/[kind]', params: { kind: 'shopping' } })} /><View style={styles.tags}>{shopping.map((item) => <Pressable key={item.id} onPress={() => void toggleRecord(item)} style={[styles.tag, { backgroundColor: colors.elevated }]}><Ionicons name="basket-outline" size={16} color={colors.primary} /><AppText variant="caption">{item.title}</AppText></Pressable>)}</View>
  </Screen>;
}
const styles = StyleSheet.create({ header: { paddingTop: 8, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, hero: { minHeight: 180, padding: 20, overflow: 'hidden', justifyContent: 'space-between' }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, heroTitle: { maxWidth: 240, marginTop: 8 }, heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 7 }, floatingHeart: { position: 'absolute', right: -13, bottom: -23, transform: [{ rotate: '-12deg' }] }, quickRow: { flexDirection: 'row', gap: 10 }, quick: { flex: 1, minHeight: 105, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }, quickLabel: { textAlign: 'center' }, line: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 58 }, lineText: { flex: 1, paddingVertical: 8 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tag: { minHeight: 38, borderRadius: 20, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 } });
