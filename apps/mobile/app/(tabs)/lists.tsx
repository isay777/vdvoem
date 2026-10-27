import { Ionicons } from '@expo/vector-icons';
import type { EntityKind } from '@my-vdvoem/shared';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, IconBadge, Screen } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { useTheme } from '../../src/theme/ThemeProvider';

const categories: { kind: EntityKind; title: string; description: string; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
  { kind: 'wishlist', title: 'Желания', description: 'Подарки и мечты', icon: 'gift-outline', tint: '#E7688D' },
  { kind: 'date_idea', title: 'Свидания', description: 'Идеи для двоих', icon: 'heart-circle-outline', tint: '#8A6BC8' },
  { kind: 'media', title: 'Кино и сериалы', description: 'Что посмотреть', icon: 'film-outline', tint: '#D67E55' },
  { kind: 'task', title: 'Общие дела', description: 'Планы и задачи', icon: 'checkmark-done-outline', tint: '#4F9975' },
  { kind: 'shopping', title: 'Покупки', description: 'Ничего не забыть', icon: 'basket-outline', tint: '#C18B3F' },
  { kind: 'place', title: 'Места', description: 'Кафе и рестораны', icon: 'restaurant-outline', tint: '#CD627E' },
];

export default function ListsScreen() {
  const router = useRouter(); const { colors } = useTheme(); const records = useAppStore((s) => s.records);
  return <Screen><View style={styles.header}><View><AppText variant="hero">Наши списки</AppText><AppText color={colors.textMuted}>Маленькие планы складываются в общую историю</AppText></View><Ionicons name="heart-half-outline" size={30} color={colors.primary} /></View>
    <View style={styles.grid}>{categories.map((category) => { const count = records.filter((r) => r.kind === category.kind).length; return <Pressable key={category.kind} onPress={() => router.push({ pathname: '/list/[kind]', params: { kind: category.kind } })} style={({ pressed }) => [styles.cell, { opacity: pressed ? .76 : 1 }]}><Card style={styles.card}><IconBadge name={category.icon} color={category.tint} background={`${category.tint}18`} /><View style={styles.cardText}><AppText variant="subtitle">{category.title}</AppText><AppText variant="caption" color={colors.textMuted}>{category.description}</AppText></View><View style={[styles.count, { backgroundColor: `${category.tint}18` }]}><AppText variant="caption" color={category.tint}>{count}</AppText></View></Card></Pressable>; })}</View>
    <Card style={[styles.prompt, { backgroundColor: colors.elevated }]}><View style={styles.promptHeart}><Ionicons name="heart" size={24} color={colors.primary} /></View><View style={styles.promptText}><AppText variant="label">Есть новая идея?</AppText><AppText variant="caption" color={colors.textMuted}>Добавьте её, пока вдохновение рядом</AppText></View><Ionicons name="arrow-forward" size={20} color={colors.primary} /></Card>
  </Screen>;
}
const styles = StyleSheet.create({ header: { paddingTop: 8, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }, cell: { width: '50%', padding: 5 }, card: { minHeight: 178, justifyContent: 'space-between' }, cardText: { gap: 3 }, count: { position: 'absolute', right: 14, top: 14, minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, prompt: { marginTop: 17, flexDirection: 'row', alignItems: 'center', gap: 12 }, promptHeart: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#E7688D18', alignItems: 'center', justifyContent: 'center' }, promptText: { flex: 1 } });
