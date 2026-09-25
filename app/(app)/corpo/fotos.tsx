import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { deletePhoto, listPhotos, savePhoto } from '@/src/services/body';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { ProgressPhoto, Pose } from '@/src/types/body';
import { monthKey, monthLabel, monthShortLabel } from '@/src/utils/format';

const poses: { hint: string; label: string; value: Pose }[] = [
  { hint: 'De frente, braços ao lado do corpo.', label: 'Frente', value: 'frente' },
  { hint: 'De perfil, o mesmo lado todo mês.', label: 'Lado', value: 'lado' },
  { hint: 'De costas, ombros relaxados.', label: 'Costas', value: 'costas' },
];

// O guia de contorno usa a câmera nativa; no web fica só o fluxo antigo.
const hasGuide = Platform.OS !== 'web';

/** Últimos seis meses, do atual para trás: quase toda foto atrasada cai aqui. */
function recentMonths() {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => monthKey(new Date(now.getFullYear(), now.getMonth() - index, 1)));
}

export default function FotosScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [month, setMonth] = useState(monthKey());
  const [pose, setPose] = useState<Pose>('frente');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhotos(await listPhotos());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const months = useMemo(() => recentMonths(), []);
  const byMonth = useMemo(() => {
    const groups = new Map<string, ProgressPhoto[]>();

    for (const photo of photos) {
      groups.set(photo.month, [...(groups.get(photo.month) ?? []), photo]);
    }

    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [photos]);

  // A última foto da mesma pose serve de referência para repetir o enquadramento.
  const reference = photos.find((photo) => photo.pose === pose);

  async function add(source: 'camera' | 'galeria') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage(
        source === 'camera'
          ? 'Para tirar a foto, autorize a câmera nas configurações do aparelho.'
          : 'Para escolher da galeria, autorize o acesso às fotos nas configurações do aparelho.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    await savePhoto({ month, pose, uri: result.assets[0].uri });
    setMessage(null);
    await load();
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/corpo'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Fotos
          </Text>
        </View>

        <Text style={styles.label}>Mês de referência</Text>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {months.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item === month }}
              key={item}
              onPress={() => setMonth(item)}
              style={({ pressed }) => [
                styles.chip,
                item === month ? styles.chipActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.chipText, item === month ? styles.chipTextActive : null]}>
                {monthShortLabel(item)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Pose</Text>
        <View style={styles.poseRow}>
          {poses.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.value === pose }}
              key={item.value}
              onPress={() => setPose(item.value)}
              style={({ pressed }) => [
                styles.chip,
                styles.poseChip,
                item.value === pose ? styles.chipActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.chipText, item.value === pose ? styles.chipTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{poses.find((item) => item.value === pose)?.hint}</Text>

        <View style={styles.addRow}>
          {reference ? (
            <View style={styles.referenceWrapper}>
              <Image contentFit="cover" source={{ uri: reference.uri }} style={styles.reference} transition={150} />
              {/* Palavras curtas: a legenda tem a largura da miniatura e não pode quebrar no meio. */}
              <Text style={styles.referenceLabel}>enquadre igual</Text>
            </View>
          ) : null}

          <View style={styles.addButtons}>
            {hasGuide ? (
              <Pressable
                accessibilityLabel="Tirar foto com guia de contorno"
                accessibilityRole="button"
                onPress={() => {
                  // A rota é nova e os tipos gerados pelo expo-router ainda não a listam: o objeto
                  // `{ pathname, params }` não passa nem com `as Href`, então o href vai como string.
                  // Com os tipos regenerados, dá para voltar ao objeto e tirar o cast.
                  const href = `/(app)/corpo/camera?month=${month}&pose=${pose}`;
                  router.push(href as Href);
                }}
                style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}>
                <Ionicons color={theme.accent.onPrimary} name="body-outline" size={20} />
                <Text style={styles.addButtonText}>Tirar com guia</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Tirar foto agora"
              accessibilityRole="button"
              onPress={() => add('camera')}
              style={({ pressed }) => [
                styles.addButton,
                hasGuide ? styles.addButtonGhost : null,
                pressed ? styles.pressed : null,
              ]}>
              <Ionicons color={hasGuide ? theme.accent.primary : theme.accent.onPrimary} name="camera" size={20} />
              <Text style={[styles.addButtonText, hasGuide ? styles.addButtonGhostText : null]}>Tirar foto</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Escolher foto da galeria"
              accessibilityRole="button"
              onPress={() => add('galeria')}
              style={({ pressed }) => [styles.addButton, styles.addButtonGhost, pressed ? styles.pressed : null]}>
              <Ionicons color={theme.accent.primary} name="images-outline" size={20} />
              <Text style={[styles.addButtonText, styles.addButtonGhostText]}>Da galeria</Text>
            </Pressable>
          </View>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {byMonth.length ? (
          byMonth.map(([key, items]) => (
            <View key={key} style={styles.monthBlock}>
              <Text style={styles.monthTitle}>{monthLabel(key)}</Text>
              <ScrollView contentContainerStyle={styles.strip} horizontal showsHorizontalScrollIndicator={false}>
                {items.map((photo) => (
                  <View key={photo.id} style={styles.photoWrapper}>
                    <Image contentFit="cover" source={{ uri: photo.uri }} style={styles.photo} transition={150} />
                    <View style={styles.photoFooter}>
                      <Text style={styles.photoPose}>{poses.find((item) => item.value === photo.pose)?.label}</Text>
                      <Pressable
                        accessibilityLabel={`Apagar foto de ${monthLabel(photo.month)}, pose ${photo.pose}`}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={async () => {
                          await deletePhoto(photo.id);
                          await load();
                        }}
                        style={({ pressed }) => [pressed ? styles.pressed : null]}>
                        <Ionicons color={theme.text.muted} name="trash-outline" size={15} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            Nenhuma foto ainda. Tire a primeira hoje: daqui a três meses ela vale mais que qualquer número.
          </Text>
        )}

        <Text style={styles.privacy}>
          As fotos são copiadas para a área privada do app e ficam só neste aparelho. Nada é enviado nem
          aparece para outra pessoa enquanto você não pedir.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 10,
    maxWidth: 560,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    ...typography.h1,
    color: theme.text.primary,
  },
  label: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: 4,
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  chipText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  chipTextActive: {
    color: theme.accent.onPrimary,
  },
  poseRow: {
    flexDirection: 'row',
    gap: 8,
  },
  poseChip: {
    alignItems: 'center',
    flex: 1,
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  referenceWrapper: {
    alignItems: 'center',
    gap: 4,
    width: 78,
  },
  reference: {
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 104,
    opacity: 0.6,
    width: 78,
  },
  referenceLabel: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 10,
    textAlign: 'center',
  },
  addButtons: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: theme.accent.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  addButtonGhost: {
    backgroundColor: 'transparent',
    borderColor: withAlpha(theme.accent.primary, 0.5),
    borderWidth: 1,
  },
  addButtonText: {
    color: theme.accent.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  addButtonGhostText: {
    color: theme.accent.primary,
  },
  message: {
    color: theme.status.warning,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  monthBlock: {
    gap: 6,
    marginTop: 8,
  },
  monthTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 15,
    textTransform: 'capitalize',
  },
  strip: {
    gap: 10,
  },
  photoWrapper: {
    gap: 4,
    width: 112,
  },
  photo: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.md,
    height: 150,
    width: 112,
  },
  photoFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoPose: {
    ...typography.caption,
    color: theme.text.muted,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  privacy: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  pressed: {
    opacity: 0.75,
  },
}));
