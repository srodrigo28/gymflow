import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraCapturedPicture, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { sendChallengeCheckin } from '@/src/services/challenges';
import { fonts, makeStyles, palette, radius, typography, useTheme, withAlpha } from '@/src/theme';

// Check-in com foto num desafio (22-estrategia.md, seção 3.4, como no GymRats): uma foto por dia, que
// vale o ponto do dia no placar. É a câmera da foto de evolução, sem o contorno.

const CAPTION_MAX = 140;
const PRIVACY = 'A foto fica visível só para quem está no desafio, e o grupo pode ocultar.';
const NO_PHOTOS = 'O servidor ainda não está guardando fotos. O treino do dia continua valendo ponto.';

// O servidor aceita até 5 MB e guarda a foto com no máximo 1600 px de largura: mais que isso só pesa no
// envio, e academia costuma ter sinal fraco. No Android a câmera tira a maior foto que o sensor dá (12 MP
// ou mais), então pedimos uma perto de 1920x1440; no iOS o padrão já é menor, e lá o tamanho só aceita os
// nomes do sistema. A qualidade 0,7 deixa o arquivo abaixo do limite mesmo se o tamanho não pegar.
const PICTURE_SIZE = Platform.OS === 'android' ? '1920x1440' : undefined;
const QUALITY = 0.7;
// Se ainda assim passar do limite (413), a próxima foto sai mais leve.
const LIGHT_QUALITY = 0.45;
// Erros em que tentar de novo não adianta (já fez hoje, desafio fora do período, servidor sem fotos, saiu
// do desafio em outro aparelho): o caminho é voltar ao desafio.
const FINAL_ERRORS = ['ALREADY_CHECKED_IN', 'CHALLENGE_NOT_ACTIVE', 'FOTOS_NAO_CONFIGURADAS', 'NOT_FOUND'];

// A câmera é sempre escura com controles brancos, seja qual for o tema, como na foto de evolução: o tema
// entra só nos botões de ação e no cursor da legenda.
const white = palette.day[0];
const black = palette.ink[950];
const glass = withAlpha(white, 0.16);
const shade = withAlpha(black, 0.5);
const soft = withAlpha(white, 0.85);
const dim = withAlpha(white, 0.6);

function backToChallenge(challengeId: string | undefined) {
  if (router.canGoBack()) {
    router.back();
  } else if (challengeId) {
    router.replace({ params: { id: challengeId }, pathname: '/(app)/desafios/[id]' });
  } else {
    router.replace('/(app)/desafios');
  }
}

export default function DesafioCheckinScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const challengeId = typeof params.id === 'string' && params.id ? params.id : undefined;
  const challengeName = typeof params.name === 'string' && params.name ? params.name : undefined;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [caption, setCaption] = useState('');
  const [quality, setQuality] = useState(QUALITY);
  const [message, setMessage] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const canCapture = isReady && !isCapturing;
  const close = () => backToChallenge(challengeId);

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
      setPhoto(await cameraRef.current.takePictureAsync({ quality }));
    } catch {
      setMessage('Não deu para tirar a foto. Tente de novo.');
    } finally {
      setIsCapturing(false);
    }
  }

  function retake() {
    Keyboard.dismiss();
    setPhoto(null);
    setMessage(null);
  }

  async function send() {
    if (!photo || !session || !challengeId || isSending) {
      return;
    }

    Keyboard.dismiss();
    setIsSending(true);
    setMessage(null);

    try {
      await sendChallengeCheckin(session.token, challengeId, { caption, uri: photo.uri });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // O desafio recarrega o placar e o mural ao ganhar foco: basta voltar.
      close();
    } catch (reason) {
      setIsSending(false);

      if (!(reason instanceof ApiError)) {
        setMessage('Não foi possível enviar o check-in. Tente de novo.');
        return;
      }

      if (reason.status === 413) {
        setQuality(LIGHT_QUALITY);
      }

      setIsFinal(FINAL_ERRORS.includes(reason.code));
      // A mensagem do servidor para o 503 fala das fotos de evolução; aqui vale a do check-in.
      setMessage(reason.code === 'FOTOS_NAO_CONFIGURADAS' ? NO_PHOTOS : reason.message);
    }
  }

  if (Platform.OS === 'web') {
    return (
      <Shell onBack={close}>
        <Text style={styles.paragraph}>
          O check-in com foto funciona no app do celular. Aqui, o treino concluído continua valendo o ponto do
          dia.
        </Text>
        <Button icon="arrow-back" onPress={close} title="Voltar ao desafio" variant="outline" />
      </Shell>
    );
  }

  if (!challengeId) {
    return (
      <Shell onBack={close}>
        <Text style={styles.paragraph}>Não encontramos o desafio deste check-in. Volte e tente de novo.</Text>
        <Button icon="arrow-back" onPress={close} title="Voltar" variant="outline" />
      </Shell>
    );
  }

  if (!permission) {
    return (
      <Shell onBack={close}>
        <ActivityIndicator color={theme.accent.primary} />
      </Shell>
    );
  }

  if (!permission.granted) {
    return (
      <Shell onBack={close}>
        {permission.canAskAgain ? (
          <>
            <Text style={styles.paragraph}>
              Para o check-in com foto, o Gyn Flow precisa usar a câmera. A foto vai só para quem está no desafio.
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
        <Text style={styles.hint}>Sem a foto, o treino concluído continua valendo o ponto do dia.</Text>
      </Shell>
    );
  }

  return (
    <View style={styles.root}>
      {/* A tela é sempre escura, seja qual for o tema; os ícones da barra de status precisam ser claros. */}
      <StatusBar style="light" />
      {/* Sem espelhar na frontal: a foto sai como o grupo vê você, igual à câmera do celular, e um nome
          na camiseta ou na parede da academia fica legível. */}
      <CameraView
        facing={facing}
        onCameraReady={() => setIsReady(true)}
        onMountError={() => setMessage('Não foi possível abrir a câmera. Feche e tente de novo.')}
        pictureSize={PICTURE_SIZE}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />
      {photo ? <Image contentFit="cover" source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} /> : null}

      {/* Com o teclado aberto para a legenda, as barras sobem e a foto continua atrás. */}
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityLabel="Fechar e voltar ao desafio"
            accessibilityRole="button"
            hitSlop={8}
            onPress={close}
            style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}>
            <Ionicons color={white} name="close" size={22} />
          </Pressable>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.headingTitle}>
              Check-in do dia
            </Text>
            {challengeName ? (
              <Text numberOfLines={1} style={styles.headingName}>
                {challengeName}
              </Text>
            ) : null}
          </View>
          {/* Mesma largura do botão de fechar, para o título ficar centralizado. */}
          <View style={styles.roundSpacer} />
        </View>

        {/* Tocar na foto fecha o teclado da legenda. */}
        <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.stage} />

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          {message ? (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
          ) : null}
          {photo ? (
            <>
              {isFinal ? null : (
                <View style={styles.captionBox}>
                  <TextInput
                    accessibilityLabel="Legenda do check-in, opcional, até 140 caracteres"
                    cursorColor={theme.accent.primary}
                    editable={!isSending}
                    maxLength={CAPTION_MAX}
                    multiline
                    onChangeText={setCaption}
                    placeholder="Escreva uma legenda (opcional)"
                    placeholderTextColor={dim}
                    returnKeyType="done"
                    selectionColor={theme.accent.primary}
                    style={styles.captionInput}
                    submitBehavior="blurAndSubmit"
                    value={caption}
                  />
                  <Text
                    accessibilityLabel={`${caption.length} de ${CAPTION_MAX} caracteres`}
                    style={[styles.counter, caption.length >= CAPTION_MAX ? styles.counterFull : null]}>
                    {caption.length}/{CAPTION_MAX}
                  </Text>
                </View>
              )}
              <Text style={styles.legend}>{PRIVACY}</Text>
              {isFinal ? (
                <Button icon="arrow-back" onPress={close} title="Voltar ao desafio" />
              ) : (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityLabel="Tirar outra foto"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSending }}
                    disabled={isSending}
                    onPress={retake}
                    style={({ pressed }) => [
                      styles.retake,
                      pressed ? styles.pressed : null,
                      isSending ? styles.disabled : null,
                    ]}>
                    <Ionicons color={white} name="camera-outline" size={20} />
                    <Text style={styles.retakeText}>Tirar outra</Text>
                  </Pressable>
                  <View style={styles.sendSlot}>
                    <Button
                      accessibilityLabel="Enviar check-in"
                      haptic
                      icon="send"
                      loading={isSending}
                      onPress={send}
                      title="Enviar"
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.legend}>{PRIVACY}</Text>
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
                    canCapture ? null : styles.disabled,
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
      </KeyboardAvoidingView>
    </View>
  );
}

/** Estados sem câmera (permissão, web): seguem o padrão das outras telas do desafio. */
function Shell({ children, onBack }: PropsWithChildren<{ onBack: () => void }>) {
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
            onPress={onBack}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Check-in com foto
          </Text>
        </View>
        {children}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: black,
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: shade,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  heading: {
    alignItems: 'center',
    flex: 1,
  },
  headingTitle: {
    color: white,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  headingName: {
    color: soft,
    fontFamily: fonts.regular,
    fontSize: 13,
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
  stage: {
    flex: 1,
  },
  bottomBar: {
    backgroundColor: shade,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  legend: {
    color: soft,
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
  captionBox: {
    backgroundColor: glass,
    borderRadius: radius.md,
    gap: 4,
    paddingBottom: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  captionInput: {
    color: white,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 88,
    minHeight: 24,
    padding: 0,
  },
  counter: {
    alignSelf: 'flex-end',
    color: dim,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  counterFull: {
    color: palette.amber[400],
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  retake: {
    alignItems: 'center',
    backgroundColor: glass,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
  },
  retakeText: {
    color: white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  sendSlot: {
    flex: 1,
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
  disabled: {
    opacity: 0.4,
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
    flex: 1,
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
