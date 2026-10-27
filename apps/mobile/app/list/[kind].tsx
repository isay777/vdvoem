import { Ionicons } from '@expo/vector-icons';
import type { EntityKind } from '@my-vdvoem/shared';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, EmptyState, IconBadge, Screen } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { useTheme } from '../../src/theme/ThemeProvider';

const meta: Record<EntityKind, { title: string; empty: string; icon: keyof typeof Ionicons.glyphMap; add: string }> = {
  wishlist: { title: 'Желания', empty: 'Добавьте первую мечту — большую или совсем маленькую', icon: 'gift-outline', add: 'Добавить желание' },
  date_idea: { title: 'Идеи свиданий', empty: 'Сохраните идею уютного вечера или большого приключения', icon: 'heart-circle-outline', add: 'Новая идея' },
  media: { title: 'Кино и сериалы', empty: 'Соберите ваш общий список для просмотра', icon: 'film-outline', add: 'Добавить фильм' },
  task: { title: 'Общие дела', empty: 'Создайте первую задачу на двоих', icon: 'checkmark-done-outline', add: 'Добавить дело' },
  shopping: { title: 'Покупки', empty: 'Добавляйте покупки — изменения сразу увидит партнёр', icon: 'basket-outline', add: 'Добавить покупку' },
  place: { title: 'Места', empty: 'Сохраните кафе или ресторан, куда хочется сходить', icon: 'restaurant-outline', add: 'Добавить место' },
  event: { title: 'События', empty: 'Запланируйте ваше следующее событие', icon: 'calendar-outline', add: 'Добавить событие' },
};
const statusLabels: Record<string, string> = { wanted: 'Хочу', fulfilled: 'Исполнено', idea: 'Идея', want: 'Хотим', visited: 'Уже были', watching: 'Смотрим', watched: 'Посмотрели' };

export default function ListScreen() {
  const { kind: rawKind } = useLocalSearchParams<{ kind: string }>(); const kind = (rawKind || 'wishlist') as EntityKind; const config = meta[kind]; const router = useRouter(); const { colors } = useTheme();
  const { records, toggleRecord } = useAppStore(); const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const items = useMemo(() => records.filter((r) => r.kind === kind).filter((r) => filter === 'all' || (filter === 'done' ? r.completed || ['fulfilled', 'visited', 'watched'].includes(r.status ?? '') : !r.completed && !['fulfilled', 'visited', 'watched'].includes(r.status ?? ''))), [records, kind, filter]);
  const random = () => { if (!items.length) return; const item = items[Math.floor(Math.random() * items.length)]!; void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.setParams({ picked: item.id }); };
  return <Screen><View style={styles.nav}><Pressable hitSlop={12} onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={colors.text} /></Pressable><AppText variant="title">{config.title}</AppText><Pressable onPress={() => router.push({ pathname: '/editor/[kind]', params: { kind } })} style={[styles.add, { backgroundColor: colors.primary }]}><Ionicons name="add" size={25} color="white" /></Pressable></View>
    <View style={styles.filters}>{(['all', 'active', 'done'] as const).map((value) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? colors.primary : colors.surface, borderColor: colors.border }]}><AppText variant="caption" color={filter === value ? 'white' : colors.text}>{value === 'all' ? 'Все' : value === 'active' ? 'В планах' : 'Готово'}</AppText></Pressable>)}{kind === 'media' && <Pressable onPress={random} style={[styles.filter, { backgroundColor: colors.elevated, borderColor: colors.border }]}><Ionicons name="shuffle" size={15} color={colors.secondary} /><AppText variant="caption">Случайный</AppText></Pressable>}</View>
    {items.length ? <View style={styles.items}>{items.map((item) => <Card key={item.id} style={styles.item}><View style={styles.itemRow}><IconBadge name={config.icon} /><View style={styles.itemText}><AppText variant="label" numberOfLines={2}>{item.title}</AppText>{item.subtitle ? <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>{item.subtitle}</AppText> : null}<View style={styles.meta}>{item.status && <View style={[styles.status, { backgroundColor: colors.elevated }]}><AppText variant="caption" color={colors.primary}>{statusLabels[item.status] ?? item.status}</AppText></View>}<AppText variant="caption" color={colors.textMuted}>обновлено недавно</AppText></View></View>{(kind === 'date_idea' || kind === 'place') && <Pressable accessibilityLabel="Запланировать в календаре" onPress={() => router.push({ pathname: '/editor/[kind]', params: { kind: 'event', prefillTitle: item.title, prefillDescription: item.subtitle } })} hitSlop={8}><Ionicons name="calendar-outline" size={25} color={colors.secondary} /></Pressable>}<Pressable accessibilityLabel="Изменить статус" onPress={() => void toggleRecord(item)} hitSlop={8}><Ionicons name={item.completed || item.favorite ? 'heart' : 'heart-outline'} size={27} color={colors.primary} /></Pressable></View></Card>)}</View> : <EmptyState icon={config.icon} title="Пока здесь пусто" description={config.empty} />}
    <Pressable onPress={() => router.push({ pathname: '/editor/[kind]', params: { kind } })} style={[styles.fab, { backgroundColor: colors.primary }]}><Ionicons name="add" size={22} color="white" /><AppText variant="label" color="white">{config.add}</AppText></Pressable>
  </Screen>;
}
const styles = StyleSheet.create({ nav: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, add: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginVertical: 10 }, filter: { minHeight: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 5 }, items: { gap: 10, marginTop: 8 }, item: { padding: 14 }, itemRow: { flexDirection: 'row', gap: 12, alignItems: 'center' }, itemText: { flex: 1, gap: 3 }, meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }, status: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }, fab: { marginTop: 22, minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 } });
