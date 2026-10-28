import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import NetInfo from '@react-native-community/netinfo';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ConflictSheet } from '../src/components/ConflictSheet';
import { useAppStore } from '../src/store/useAppStore';
import { supabase } from '../src/lib/supabase';
import { tableForKind } from '../src/lib/repository';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

function Navigation() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { bootstrap, setOnline, authenticated, demo, reload } = useAppStore();
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });

  useEffect(() => { void bootstrap(); return NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))); }, [bootstrap, setOnline]);
  useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
  useEffect(() => { if (!authenticated) return; const timer = setTimeout(() => router.replace('/(tabs)'), 20); return () => clearTimeout(timer); }, [authenticated, router]);
  useEffect(() => {
    const client = supabase;
    if (!authenticated || demo || !client) return;
    const channel = Object.values(tableForKind).reduce((current, table) => current.on('postgres_changes', { event: '*', schema: 'public', table }, () => void reload()), client.channel('pair-records'));
    void channel.subscribe();
    return () => { void client.removeChannel(channel); };
  }, [authenticated, demo, reload]);
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && authenticated) router.push(route as never);
    });
    return () => subscription.remove();
  }, [authenticated, router]);
  if (!fontsLoaded) return null;

  return <>
    <StatusBar style={isDark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="list/[kind]" options={{ presentation: 'card' }} />
      <Stack.Screen name="editor/[kind]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="invite/[token]" />
    </Stack>
    <ConflictSheet />
  </>;
}

export default function RootLayout() { return <ThemeProvider><Navigation /></ThemeProvider>; }
