import { Ionicons } from '@expo/vector-icons';
import { eachDayOfInterval, endOfMonth, format, getDay, isSameDay, parseISO, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, EmptyState, IconBadge, Screen, SectionTitle } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { useTheme } from '../../src/theme/ThemeProvider';

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export default function CalendarScreen() {
  const { colors } = useTheme(); const router = useRouter(); const events = useAppStore((s) => s.records.filter((r) => r.kind === 'event')); const [selected, setSelected] = useState(new Date());
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(selected), end: endOfMonth(selected) }), [selected]);
  const offset = (getDay(startOfMonth(selected)) + 6) % 7;
  const selectedEvents = events.filter((event) => { const value = String(event.raw.starts_at ?? event.raw.local_start_date ?? ''); try { return isSameDay(parseISO(value), selected); } catch { return false; } });
  return <Screen><View style={styles.header}><View><AppText variant="hero">Календарь</AppText><AppText color={colors.textMuted}>Ваше время вместе</AppText></View><Pressable onPress={() => router.push({ pathname: '/editor/[kind]', params: { kind: 'event' } })} style={[styles.add, { backgroundColor: colors.primary }]}><Ionicons name="add" size={25} color="white" /></Pressable></View>
    <Card><View style={styles.monthNav}><Pressable hitSlop={10} onPress={() => setSelected(new Date(selected.getFullYear(), selected.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><AppText variant="subtitle" style={styles.capitalize}>{format(selected, 'LLLL yyyy', { locale: ru })}</AppText><Pressable hitSlop={10} onPress={() => setSelected(new Date(selected.getFullYear(), selected.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={22} color={colors.text} /></Pressable></View>
      <View style={styles.week}>{weekdays.map((day) => <AppText key={day} variant="caption" color={colors.textMuted} style={styles.dayCell}>{day}</AppText>)}</View>
      <View style={styles.grid}>{Array.from({ length: offset }).map((_, i) => <View key={`blank-${i}`} style={styles.dayCell} />)}{days.map((day) => { const active = isSameDay(day, selected); const hasEvent = events.some((event) => { try { return isSameDay(parseISO(String(event.raw.starts_at ?? '')), day); } catch { return false; } }); return <Pressable key={day.toISOString()} onPress={() => setSelected(day)} style={[styles.dayCell, styles.day, active && { backgroundColor: colors.primary }]}><AppText variant="label" color={active ? 'white' : colors.text}>{format(day, 'd')}</AppText>{hasEvent && <View style={[styles.dot, { backgroundColor: active ? 'white' : colors.secondary }]} />}</Pressable>; })}</View>
    </Card>
    <SectionTitle title={format(selected, 'd MMMM', { locale: ru })} action="Сегодня" onAction={() => setSelected(new Date())} />
    {selectedEvents.length ? selectedEvents.map((event) => <Card key={event.id} style={styles.event}><View style={[styles.timeBar, { backgroundColor: colors.primary }]} /><IconBadge name="heart-outline" /><View style={styles.eventText}><AppText variant="label">{event.title}</AppText><AppText variant="caption" color={colors.textMuted}>{event.subtitle || 'Совместное событие'}</AppText></View></Card>) : <EmptyState icon="calendar-outline" title="Свободный день" description="Можно придумать что-нибудь приятное только для вас двоих" />}
  </Screen>;
}
const styles = StyleSheet.create({ header: { paddingTop: 8, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, add: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, capitalize: { textTransform: 'capitalize' }, week: { flexDirection: 'row' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, dayCell: { width: `${100 / 7}%`, textAlign: 'center', alignItems: 'center' }, day: { height: 44, borderRadius: 14, justifyContent: 'center', marginVertical: 2 }, dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2 }, event: { flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', marginBottom: 9 }, timeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 }, eventText: { flex: 1 }, });
