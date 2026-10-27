import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isBackendConfigured = Boolean(url && publishableKey && !url.includes('YOUR_PROJECT'));

export const supabase = isBackendConfigured ? createClient(url!, publishableKey!, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: globalThis.localStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh());
}

export async function requireSupabase() {
  if (!supabase) throw new Error('Backend не настроен. Заполните EXPO_PUBLIC_SUPABASE_URL и publishable key.');
  return supabase;
}
