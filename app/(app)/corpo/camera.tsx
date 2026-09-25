import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraCapturedPicture, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POSE_GUIDE_RATIO, PoseGuide } from '@/src/components/body/PoseGuide';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { savePhoto } from '@/src/services/body';
import { fonts, makeStyles, palette, radius, typography, useTheme } from '@/src/theme';
import type { Pose } from '@/src/types/body';
import { monthKey, monthLabel } from '@/src/utils/format';

const poses: { label: string; value: Pose }[] = [
  { label: 'Frente', value: 'frente' },
  { label: 'Lado', value: 'lado' },
  { label: 'Costas', value: 'costas' },
];

const LEGEND = 'Encaixe o corpo no contorno. Mesma pose, mesma luz, mesma distância.';
// Folga entre o contorno e as barras de controle, para a cabeça e os pés não encostarem nelas.
const GUIDE_MARGIN = 24;

// A câmera é sempre preta com controles brancos, seja qual for o tema: o tema entra só nos chips
// e nos botões de ação.
const white = palette.day[0];
const glass = 'rgba(255, 255, 255, 0.16)';
const shade = 'rgba(0, 0, 0, 0.45)';

function isPose(value: unknown): value is Pose {
  return poses.some((item) => item.value === value);
}

/** Só aceita `AAAA-MM`: qualquer outra coisa entraria no banco como um mês que não agrupa. */
function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function close() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(app)/corpo/fotos');
  }
}

export default function CameraScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ month?: string; pose?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [pose, setPose] = useState<Pose>(isPose(params.pose) ? params.pose : 'frente');
  const [facing, setFacing] = useState<CameraType>('back');
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stage, setStage] = useState({ height: 0, width: 0 });
  const month = isMonthKey(params.month) ? params.month : monthKey();
  const poseLabel = poses.find((item) => item.value === pose)?.label ?? pose;
  // O contorno ocupa a altura livre entre as barras; em tela estreita, a largura é que limita.
  const guideHeight = Math.min(
    stage.height - GUIDE_MARGIN * 2,
    (stage.width - GUIDE_MARGIN * 2) / POSE_GUIDE_RATIO,
  );
  const canCapture = isReady && !isCapturing;

  async function askPermission() {
    setIsRequesting(true);

    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  }

  async function capture() {
    if (!cameraRef.current || !canCapture) {
      return;
    }

    setIsCapturing(true);
    setMessage(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setPhoto(await cameraRef.current.takePictureAsync({ quality: 0.9 }));
    } catch {
      setMessage('Não deu para tirar a foto. Tente de novo.');
    } finally {
      setIsCapturing(false);
    }
  }

  async function confirm() {
    if (!photo || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await savePhoto({ month, pose, uri: photo.uri });
      // A tela de fotos recarrega ao ganhar foco, então basta voltar.
      close();
    } catch {
      setMessage('Não foi possível salvar a foto. Tente de novo.');
      setIsSaving(false);
    }
  }

  if (Platform.OS === 'web') {
    return (
      <Shell>
        <Text style={styles.paragraph}>
          A câmera com guia funciona no app do celular. Aqui, escolha uma foto da galeria na tela anterior.
        </Text>
        <Button icon="arrow-back" onPress={close} title="Voltar" variant="outline" />
      </Shell>
    );
  }

  if (!permission) {
    return (
      <Shell>
        <ActivityIndicator color={theme.accent.primary} />
      </Shell>
    );
  }

  if (!permission.granted) {
    return (
      <Shell>
        {permission.canAskAgain ? (
          <>
            <Text style={styles.paragraph}>
              Para mostrar o contorno sobre a imagem, o Gyn Flow precisa usar a câmera. A foto fica só neste
              aparelho.
            </Text>
            <Button icon="camera-outline" loading={isRequesting} onPress={askPermission} title="Permitir câmera" />
          </>
        ) : (
          <>
            <Text style={styles.paragraph}>
              O acesso à câmera está bloqueado. Para liberar, abra os ajustes do aparelho e ative a câmera
              para o Gyn Flow.
            </Text>
            <Button
              icon="settings-outline"
              onPress={() => void Linking.openSettings().catch(() => undefined)}
              title="Abrir ajustes"
              variant="outline"
            />
          </>
        )}
        <Text style={styles.hint}>Se preferir, volte e escolha uma foto da galeria.</Text>
      </Shell>
    );
  }

  return (
    <View style={styles.root}>
      {/* A tela é sempre escura, seja qual for o tema; os ícones da barra de status precisam ser claros. */}
      <StatusBar style="light" />
      <CameraView
        facing={facing}
        // Na câmera frontal a prévia é espelhada. Salvamos a foto como a pessoa a viu ao encaixar o
        // corpo no contorno; sem isso a pose de lado sairia virada para o outro lado.
        mirror={facing === 'front'}
        onCameraReady={() => setIsReady(true)}
        onMountError={() =>
          setMessage('Não foi possível abrir a câmera. Feche e tente de novo, ou escolha uma foto da galeria.')
        }
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />
      {photo ? <Image contentFit="cover" source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} /> : null}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityLabel="Fechar câmera"
            accessibilityRole="button"
            hitSlop={8}
            onPress={close}
            style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}>
            <Ionicons color={white} name="close" size={22} />
          </Pressable>
          <Text style={styles.month}>{monthLabel(month)}</Text>
          {/* Mesma largura do botão de fechar, para o mês ficar centralizado. */}
          <View style={styles.roundSpacer} />
        </View>
        <View style={styles.chips}>
          {poses.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.value === pose }}
              key={item.value}
              onPress={() => setPose(item.value)}
              style={({ pressed }) => [
                styles.chip,
                item.value === pose ? styles.chipActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.chipText, item.value === pose ? styles.chipTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View onLayout={(event) => setStage(event.nativeEvent.layout)} style={styles.stage}>
        {!photo && guideHeight > 0 ? (
          <View accessibilityLabel={`Contorno de referência para a pose ${poseLabel}`} accessibilityRole="image">
            <PoseGuide height={guideHeight} pose={pose} />
          </View>
        ) : null}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {photo ? (
          <>
            <Button haptic icon="checkmark" loading={isSaving} onPress={confirm} title="Usar esta foto" />
            <Pressable
              accessibilityLabel="Tirar outra foto"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving }}
              disabled={isSaving}
              onPress={() => {
                setPhoto(null);
                setMessage(null);
              }}
              style={({ pressed }) => [styles.retake, pressed ? styles.pressed : null]}>
              <Ionicons color={white} name="camera-outline" size={20} />
              <Text style={styles.retakeText}>Tirar outra</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.legend}>{LEGEND}</Text>
            <View style={styles.controls}>
              <View style={styles.roundSpacer} />
              <Pressable
                accessibilityLabel="Tirar foto"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canCapture }}
                disabled={!canCapture}
                onPress={capture}
                style={({ pressed }) => [
                  styles.shutter,
                  pressed ? styles.shutterPressed : null,
                  canCapture ? null : styles.shutterDisabled,
                ]}>
                <View style={styles.shutterInner} />
              </Pressable>
              <Pressable
                accessibilityLabel={facing === 'back' ? 'Usar câmera frontal' : 'Usar câmera traseira'}
                accessibilityRole="button"
                onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
                style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}>
                <Ionicons color={white} name="camera-reverse-outline" size={22} />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

/** Estados sem câmera (permissão, web): seguem o padrão das outras telas da área. */
function Shell({ children }: PropsWithChildren) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Screen edges={['top', 'right', 'left']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={close}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Foto com guia
          </Text>
        </View>
        {children}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: '#000000',
    flex: 1,
  },
  topBar: {
    backgroundColor: shade,
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  month: {
    color: white,
    fontFamily: fonts.bold,
    fontSize: 16,
    textTransform: 'capitalize',
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: glass,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  roundSpacer: {
    height: 44,
    width: 44,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: glass,
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: theme.accent.primary,
  },
  chipText: {
    color: white,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  chipTextActive: {
    color: theme.accent.onPrimary,
  },
  stage: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    // Nada aqui recebe toque: o contorno é só desenho.
    pointerEvents: 'none',
  },
  bottomBar: {
    backgroundColor: shade,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  legend: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  message: {
    color: palette.amber[400],
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shutter: {
    alignItems: 'center',
    borderColor: white,
    borderRadius: radius.pill,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  shutterInner: {
    backgroundColor: white,
    borderRadius: radius.pill,
    height: 58,
    width: 58,
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  retake: {
    alignItems: 'center',
    backgroundColor: glass,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
  },
  retakeText: {
    color: white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  content: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: 560,
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
  paragraph: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.75,
  },
}));
