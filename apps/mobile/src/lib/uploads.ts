import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { requireSupabase } from './supabase';

export async function chooseAndUploadImage(userId: string) {
  const choice = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .82, allowsEditing: true, aspect: [4, 3] });
  if (choice.canceled) return null;
  const asset = choice.assets[0];
  if (!asset) return null;
  const client = await requireSupabase();
  const extension = asset.mimeType?.split('/')[1] ?? 'jpg';
  const path = `${userId}/${randomUUID()}.${extension}`;
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const upload = await client.storage.from('pair-assets').upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
  if (upload.error) throw upload.error;
  const registered = await client.rpc('register_asset', { p_storage_path: path, p_mime_type: asset.mimeType ?? 'image/jpeg', p_size_bytes: blob.size });
  if (registered.error) { await client.storage.from('pair-assets').remove([path]); throw registered.error; }
  return { path, localUri: asset.uri };
}
