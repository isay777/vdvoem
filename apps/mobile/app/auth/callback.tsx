import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, RomanticMark, Screen } from '../../src/components/ui';
import { requireSupabase } from '../../src/lib/supabase';
import { useAppStore } from '../../src/store/useAppStore';
import { useTheme } from '../../src/theme/ThemeProvider';

function authParameters(url: string) {
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const fragment = url.includes('#') ? url.split('#')[1] ?? '' : '';
  return new URLSearchParams(fragment || query);
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bootstrap = useAppStore((state) => state.bootstrap);
  const incomingUrl = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const finishSignIn = async () => {
      try {
        const url = incomingUrl ?? await Linking.getInitialURL();
        if (!url) throw new Error('В ссылке входа отсутствуют данные');
        const parameters = authParameters(url);
        const errorDescription = parameters.get('error_description');
        if (errorDescription) throw new Error(errorDescription);
        const client = await requireSupabase();
        const code = parameters.get('code');
        const accessToken = parameters.get('access_token');
        const refreshToken = parameters.get('refresh_token');
        if (code) {
          const result = await client.auth.exchangeCodeForSession(code);
          if (result.error) throw result.error;
        } else if (accessToken && refreshToken) {
          const result = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (result.error) throw result.error;
        } else {
          throw new Error('Ссылка входа неполная или уже устарела');
        }
        await bootstrap();
        if (active) router.replace('/(tabs)');
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Не удалось выполнить вход');
      }
    };
    void finishSignIn();
    return () => { active = false; };
  }, [bootstrap, incomingUrl, router]);

  return <Screen scroll={false}><View style={styles.root}><RomanticMark /><AppText variant="title">Входим в «Мы вдвоём»</AppText>{error ? <AppText color={colors.danger}>{error}</AppText> : <><ActivityIndicator color={colors.primary} /><AppText color={colors.textMuted}>Проверяем безопасную ссылку…</AppText></>}</View></Screen>;
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 } });
