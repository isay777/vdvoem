import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, PrimaryButton } from './ui';

export function ConflictSheet() {
  const { conflict, resolveConflict } = useAppStore();
  const { colors } = useTheme();
  return <Modal visible={Boolean(conflict)} transparent animationType="slide" onRequestClose={() => undefined}>
    <Pressable style={styles.scrim}><View style={[styles.sheet, { backgroundColor: colors.surface }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <AppText variant="title">Изменения пересеклись</AppText>
      <AppText color={colors.textMuted}>Партнёр изменил эту запись, пока вы были не в сети. Выберите версию — ничего не будет перезаписано молча.</AppText>
      <View style={styles.preview}><AppText variant="label">На сервере</AppText><AppText numberOfLines={3}>{JSON.stringify(conflict?.server ?? {}, null, 2)}</AppText></View>
      <PrimaryButton label="Оставить мои изменения" icon="cloud-upload-outline" onPress={() => void resolveConflict('local')} />
      <Pressable style={styles.secondary} onPress={() => void resolveConflict('server')}><AppText variant="label" color={colors.primary}>Принять изменения партнёра</AppText></Pressable>
    </View></Pressable>
  </Modal>;
}

const styles = StyleSheet.create({ scrim: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36, gap: 14 }, handle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 }, preview: { padding: 12, borderRadius: 14, backgroundColor: '#8A6BC812', gap: 4 }, secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' } });
