import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';

const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['home-outline', 'home'], lists: ['albums-outline', 'albums'], calendar: ['calendar-outline', 'calendar'], us: ['heart-outline', 'heart'],
};

export default function TabsLayout() {
  const { colors } = useTheme();
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 76, paddingTop: 7, paddingBottom: 12 }, tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 }, tabBarIcon: ({ focused, color, size }) => <Ionicons name={icons[route.name]?.[focused ? 1 : 0] ?? 'ellipse'} color={String(color)} size={size} /> })}>
    <Tabs.Screen name="index" options={{ title: 'Главная' }} /><Tabs.Screen name="lists" options={{ title: 'Списки' }} /><Tabs.Screen name="calendar" options={{ title: 'Календарь' }} /><Tabs.Screen name="us" options={{ title: 'Мы' }} />
  </Tabs>;
}
