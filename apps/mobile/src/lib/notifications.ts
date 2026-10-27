import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { requireSupabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function registerPushDevice() {
  if (!Device.isDevice) return { ok: false, reason: 'Для проверки push нужно физическое устройство' };
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('updates', { name: 'Обновления пары', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180], lightColor: '#E7688D' });
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return { ok: false, reason: 'Уведомления отключены' };
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const client = await requireSupabase();
  const result = await client.rpc('register_push_device', { p_expo_token: token, p_platform: Platform.OS, p_device_name: Device.modelName });
  if (result.error) throw result.error;
  return { ok: true };
}
