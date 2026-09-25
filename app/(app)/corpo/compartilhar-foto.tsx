import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { SHARE_HEIGHT, SHARE_WIDTH } from '@/src/components/share/ShareCard';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { listPhotos } from '@/src/services/body';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { ProgressPhoto } from '@/src/types/body';
import { monthLabel } from '@/src/utils/format';
import { shareCardImage } from '@/src/utils/share-image';

const MAX_WIDTH = 560;
const GUTTER = 20;
const CARD_PADDING = 16;
const PHOTO_HEIGHT = 320;
// A tarja cobre o rosto: ~14% da altura da foto, começando na região onde ele costuma ficar.
const BAR_RATIO = 0.14;
const DEFAULT_BAR_Y = 0.16;
const STEP = 12;

type Bar = { enabled: boolean; y: number };

const poseLabels = { costas: 'costas', frente: 'frente', lado: 'lado' } as const;

// Compartilhar uma ou duas fotos de evolução com uma tarja preta gravada na imagem: privacidade
// por padrão (22-estrategia.md, seção 4). A foto original não muda e continua só no aparelho.
export default function CompartilharFotoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ ids?: string }>();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [bars, setBars] = useState<Record<string, Bar>>({});
  const [loaded, setLoaded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cardRef = useRef<View>(null);
  const scale = Math.min(1, (Math.min(width, MAX_WIDTH) - GUTTER * 2) / SHARE_WIDTH);
  const ids = params.ids;

  useEffect(() => {
    const wanted = (ids ?? '').split(',').filter(Boolean).slice(0, 2);

    void listPhotos().then((all) => {
      const chosen = wanted.map((id) => all.find((photo) => photo.id === id)).filter((photo): photo is ProgressPhoto => Boolean(photo));
      setPhotos(chosen);
      setBars(Object.fromEntries(chosen.map((photo) => [photo.id, { enabled: true, y: DEFAULT_BAR_Y * PHOTO_HEIGHT }])));
      setLoaded(true);
    });
  }, [ids]);

  const barHeight = BAR_RATIO * PHOTO_HEIGHT;

  function moveBar(id: string, y: number) {
    setBars((current) => ({
      ...current,
      [id]: { enabled: true, y: Math.min(PHOTO_HEIGHT - barHeight / 2, Math.max(barHeight / 2, y)) },
    }));
  }

  function toggleBar(id: string) {
    setBars((current) => ({ ...current, [id]: { ...current[id]!, enabled: !current[id]?.enabled } }));
  }

  async function share() {
    if (!cardRef.current) {
      return;
    }

    setMessage(null);
    setIsSharing(true);

    try {
      // A tarja é desenhada por cima da foto e vai junto na captura: não dá para tirá-la depois.
      const result = await shareCardImage(cardRef, 'gynflow-evolucao.png');

      if (result === 'unavailable') {
        setMessage('Este aparelho não oferece a opção de compartilhar.');
      } else if (result === 'downloaded') {
        setMessage('A imagem foi baixada: é só mandar pelo app que quiser.');
      }
    } catch {
      setMessage('Não foi possível gerar a imagem. Tente de novo.');
    } finally {
      setIsSharing(false);
    }
  }

  const photoWidth = photos.length === 2 ? (SHARE_WIDTH - CARD_PADDING * 2 - 8) / 2 : SHARE_WIDTH - CARD_PADDING * 2;

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
            Compartilhar foto
          </Text>
        </View>

        {photos.length ? (
          <>
            <Text style={styles.intro}>
              Toque na foto onde está o rosto para posicionar a tarja. Ela é gravada na imagem: quem receber não
              consegue tirar.
            </Text>

            <View style={[styles.preview, { height: SHARE_HEIGHT * scale, width: SHARE_WIDTH * scale }]}>
              <View style={{ transform: [{ scale }] }}>
                <View collapsable={false} ref={cardRef} style={styles.card}>
                  <View style={styles.cardTop}>
                    <MaterialCommunityIcons color={theme.accent.primary} name="dumbbell" size={18} />
                    <Text style={styles.brand}>Gyn Flow</Text>
                    <Text style={styles.cardKicker}>{photos.length === 2 ? 'antes e depois' : 'evolução'}</Text>
                  </View>

                  <View style={styles.photos}>
                    {photos.map((photo) => {
                      const bar = bars[photo.id];

                      return (
                        <View key={photo.id} style={{ width: photoWidth }}>
                          <Pressable
                            accessibilityHint="Toque onde está o rosto para mover a tarja"
                            accessibilityLabel={`Foto de ${monthLabel(photo.month)}, pose ${poseLabels[photo.pose]}`}
                            accessibilityRole="imagebutton"
                            onPress={(event) => moveBar(photo.id, event.nativeEvent.locationY)}
                            style={styles.photoFrame}>
                            <Image contentFit="cover" source={{ uri: photo.uri }} style={styles.photo} />
                            {bar?.enabled ? (
                              <View
                                accessibilityElementsHidden
                                importantForAccessibility="no"
                                style={[styles.bar, { height: barHeight, top: bar.y - barHeight / 2 }]}
                              />
                            ) : null}
                          </Pressable>
                          <Text numberOfLines={1} style={styles.photoLabel}>
                            {monthLabel(photo.month)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.cardBottom}>
                    <Text numberOfLines={1} style={styles.name}>
                      {session?.user.name ?? 'Em evolução'}
                    </Text>
                    <Text style={styles.tagline}>disciplina hoje, resultados sempre</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.controls}>
              {photos.map((photo, index) => {
                const bar = bars[photo.id];
                const label = photos.length === 2 ? (index === 0 ? 'Antes' : 'Depois') : 'Foto';

                return (
                  <View key={photo.id} style={styles.controlRow}>
                    <Text style={styles.controlLabel}>{label}</Text>
                    <Pressable
                      accessibilityLabel={`${bar?.enabled ? 'Tirar' : 'Pôr'} a tarja da foto ${label.toLowerCase()}`}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: Boolean(bar?.enabled) }}
                      onPress={() => toggleBar(photo.id)}
                      style={({ pressed }) => [styles.chip, bar?.enabled ? styles.chipActive : null, pressed ? styles.pressed : null]}>
                      <Text style={[styles.chipText, bar?.enabled ? styles.chipTextActive : null]}>
                        {bar?.enabled ? 'Tarja ligada' : 'Tarja desligada'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Subir a tarja da foto ${label.toLowerCase()}`}
                      accessibilityRole="button"
                      disabled={!bar?.enabled}
                      onPress={() => moveBar(photo.id, (bar?.y ?? 0) - STEP)}
                      style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null]}>
                      <Ionicons color={theme.text.primary} name="chevron-up" size={18} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Descer a tarja da foto ${label.toLowerCase()}`}
                      accessibilityRole="button"
                      disabled={!bar?.enabled}
                      onPress={() => moveBar(photo.id, (bar?.y ?? 0) + STEP)}
                      style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null]}>
                      <Ionicons color={theme.text.primary} name="chevron-down" size={18} />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Button
              accessibilityLabel="Compartilhar esta imagem"
              haptic
              icon="share-social"
              loading={isSharing}
              onPress={share}
              title="Compartilhar"
            />
          </>
        ) : loaded ? (
          <Text style={styles.empty}>Escolha uma foto na Evolução para compartilhar.</Text>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Text style={styles.privacy}>
          A imagem é montada no seu aparelho e só sai daqui quando você escolhe para onde enviar. A foto original
          não muda.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 14,
    maxWidth: MAX_WIDTH,
    paddingBottom: 40,
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    alignSelf: 'stretch',
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
  intro: {
    alignSelf: 'stretch',
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  preview: {
    alignItems: 'center',
    borderRadius: radius.lg,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: theme.bg.base,
    height: SHARE_HEIGHT,
    justifyContent: 'space-between',
    padding: CARD_PADDING,
    width: SHARE_WIDTH,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  brand: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 15,
  },
  cardKicker: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
    marginLeft: 'auto',
    textTransform: 'uppercase',
  },
  photos: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  photoFrame: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    height: PHOTO_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
  photo: {
    height: '100%',
    width: '100%',
  },
  bar: {
    backgroundColor: '#000000',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  photoLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  cardBottom: {
    gap: 2,
  },
  name: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  tagline: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  controls: {
    alignSelf: 'stretch',
    gap: 8,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  controlLabel: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
    width: 56,
  },
  chip: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
  },
  chipText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  chipTextActive: {
    color: theme.accent.primary,
  },
  arrow: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  message: {
    color: theme.status.warning,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  privacy: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
}));
