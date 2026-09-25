import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MeasurementsBackupCard } from '@/src/components/body/MeasurementsBackupCard';
import { WeightChart } from '@/src/components/body/WeightChart';
import { Screen } from '@/src/components/ui/Screen';
import { getBodyTrend, getWeightSeries, listPhotos } from '@/src/services/body';
import { onMeasurementsSynced } from '@/src/services/body-sync';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { BodyTrend, ProgressPhoto } from '@/src/types/body';
import { formatDelta, formatShortDate, monthLabel } from '@/src/utils/format';

type WeightPoint = { takenAt: number; weightKg: number };

export default function CorpoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [trend, setTrend] = useState<BodyTrend | null>(null);
  const [series, setSeries] = useState<WeightPoint[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);

  const load = useCallback(async () => {
    const [bodyTrend, weightSeries, recentPhotos] = await Promise.all([
      getBodyTrend(),
      getWeightSeries(),
      listPhotos(),
    ]);

    setTrend(bodyTrend);
    setSeries(weightSeries);
    setPhotos(recentPhotos);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Medidas que chegam da conta (num aparelho novo, ou logo depois do consentimento) entram no
  // gráfico na hora.
  useEffect(() => onMeasurementsSynced(() => void load()), [load]);

  const latest = trend?.latest;
  const months = [...new Set(photos.map((photo) => photo.month))];

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/home'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Evolução
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Peso</Text>
            {trend?.deltaKg !== undefined ? (
              <View
                style={[
                  styles.deltaBadge,
                  { backgroundColor: withAlpha(theme.domain.conquista, 0.16) },
                ]}>
                <Text style={[styles.deltaText, { color: theme.domain.conquista }]}>
                  {formatDelta(trend.deltaKg, 'kg')} desde o início
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.currentRow}>
            <Text style={styles.currentValue}>
              {latest?.weightKg ? latest.weightKg.toFixed(1).replace('.', ',') : '—'}
            </Text>
            <Text style={styles.currentUnit}>kg</Text>
            {latest ? <Text style={styles.currentDate}>em {formatShortDate(latest.takenAt)}</Text> : null}
          </View>

          <WeightChart points={series} />
        </View>

        <View style={styles.actions}>
          <ActionCard
            icon="tape-measure"
            label="Registrar medidas"
            onPress={() => router.push('/(app)/corpo/medidas')}
          />
          <ActionCard icon="camera-outline" label="Foto do mês" onPress={() => router.push('/(app)/corpo/fotos')} />
        </View>

        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Fotos</Text>
          {months.length >= 2 ? (
            <Pressable
              accessibilityLabel="Comparar fotos de dois meses"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push('/(app)/corpo/comparar')}
              style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}>
              <Text style={styles.linkText}>Comparar</Text>
              <Ionicons color={theme.accent.primary} name="git-compare-outline" size={16} />
            </Pressable>
          ) : null}
        </View>

        {photos.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {photos.slice(0, 12).map((photo) => (
              <Pressable
                accessibilityLabel={`Foto de ${monthLabel(photo.month)}, pose ${photo.pose}`}
                accessibilityRole="imagebutton"
                key={photo.id}
                onPress={() => router.push('/(app)/corpo/fotos')}
                style={({ pressed }) => [styles.thumbWrapper, pressed ? styles.pressed : null]}>
                <Image contentFit="cover" source={{ uri: photo.uri }} style={styles.thumb} transition={150} />
                <Text style={styles.thumbLabel}>{monthLabel(photo.month)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.empty}>
            Nenhuma foto ainda. Uma por mês, sempre na mesma pose, já mostra o que a balança esconde.
          </Text>
        )}

        <MeasurementsBackupCard />

        <Text style={styles.privacy}>
          Fotos ficam só neste aparelho. Nada é publicado nem enviado enquanto você não pedir.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function ActionCard({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed ? styles.pressed : null]}>
      <MaterialCommunityIcons color={theme.accent.primary} name={icon} size={24} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 14,
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
    flex: 1,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  deltaBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deltaText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  currentRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
  },
  currentValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
  },
  currentUnit: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  currentDate: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginLeft: 'auto',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderColor: withAlpha(theme.accent.primary, 0.45),
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  actionLabel: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'center',
  },
  linkButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  linkText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  strip: {
    gap: 10,
    paddingVertical: 2,
  },
  thumbWrapper: {
    gap: 4,
    width: 104,
  },
  thumb: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.md,
    height: 140,
    width: 104,
  },
  thumbLabel: {
    ...typography.caption,
    color: theme.text.muted,
    textAlign: 'center',
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  privacy: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.75,
  },
}));
