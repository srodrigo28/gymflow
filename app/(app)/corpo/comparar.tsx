import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { listPhotos } from '@/src/services/body';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { ProgressPhoto, Pose } from '@/src/types/body';
import { monthLabel, monthShortLabel } from '@/src/utils/format';

const poses: { label: string; value: Pose }[] = [
  { label: 'Frente', value: 'frente' },
  { label: 'Lado', value: 'lado' },
  { label: 'Costas', value: 'costas' },
];

export default function CompararScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [pose, setPose] = useState<Pose>('frente');
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);

  useEffect(() => {
    void listPhotos().then(setPhotos);
  }, []);

  const months = useMemo(
    () => [...new Set(photos.filter((photo) => photo.pose === pose).map((photo) => photo.month))].sort(),
    [photos, pose],
  );

  // Ao trocar de pose, a escolha anterior pode não existir: cai no mais antigo
  // contra o mais novo, que é a comparação que a pessoa quer ver primeiro.
  useEffect(() => {
    setLeft((current) => (current && months.includes(current) ? current : (months[0] ?? null)));
    setRight((current) => (current && months.includes(current) ? current : (months.at(-1) ?? null)));
  }, [months]);

  const leftPhoto = photos.find((photo) => photo.pose === pose && photo.month === left);
  const rightPhoto = photos.find((photo) => photo.pose === pose && photo.month === right);

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
            Comparar
          </Text>
        </View>

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

        {months.length >= 2 ? (
          <>
            <View style={styles.pair}>
              <Side month={left} months={months} onSelect={setLeft} photo={leftPhoto} side="Antes" />
              <Side month={right} months={months} onSelect={setRight} photo={rightPhoto} side="Depois" />
            </View>

            {left && right && left !== right ? (
              <>
                <Text style={styles.caption}>
                  {monthLabel(left)} · {monthLabel(right)}
                </Text>
                {leftPhoto && rightPhoto ? (
                  <Button
                    icon="share-social-outline"
                    onPress={() =>
                      router.push({
                        params: { ids: `${leftPhoto.id},${rightPhoto.id}` },
                        pathname: '/(app)/corpo/compartilhar-foto',
                      })
                    }
                    title="Compartilhar com tarja"
                    variant="outline"
                  />
                ) : null}
              </>
            ) : (
              <Text style={styles.caption}>Escolha dois meses diferentes para ver a diferença.</Text>
            )}
          </>
        ) : (
          <Text style={styles.empty}>
            Ainda não há fotos de dois meses diferentes nesta pose. Assim que houver, a comparação aparece
            aqui.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function Side({
  month,
  months,
  onSelect,
  photo,
  side,
}: {
  month: string | null;
  months: string[];
  onSelect: (month: string) => void;
  photo?: ProgressPhoto;
  side: string;
}) {
  const styles = useStyles();

  return (
    <View style={styles.side}>
      <Text style={styles.sideTitle}>{side}</Text>
      {photo ? (
        <Image contentFit="cover" source={{ uri: photo.uri }} style={styles.sidePhoto} transition={150} />
      ) : (
        <View style={[styles.sidePhoto, styles.sidePhotoEmpty]} />
      )}
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
        {months.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: item === month }}
            key={item}
            onPress={() => onSelect(item)}
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
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 12,
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
  poseRow: {
    flexDirection: 'row',
    gap: 8,
  },
  poseChip: {
    alignItems: 'center',
    flex: 1,
  },
  chips: {
    gap: 6,
  },
  chip: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  chipText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  chipTextActive: {
    color: theme.accent.onPrimary,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
  },
  side: {
    flex: 1,
    gap: 6,
  },
  sideTitle: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  sidePhoto: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.md,
    height: 300,
    width: '100%',
  },
  sidePhotoEmpty: {
    borderColor: theme.border.subtle,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  caption: {
    ...typography.caption,
    color: theme.text.muted,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
}));
