import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Alert, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Screen } from '@/src/components/ui/Screen';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

type ProfileMenuItem = {
  accessibilityLabel: string;
  description: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  tone: 'green' | 'gold' | 'blue' | 'lightBlue' | 'pink' | 'mint' | 'purple' | 'red';
};

const menuItems: ProfileMenuItem[] = [
  {
    accessibilityLabel:
      'Abrir Sincronizar dispositivos. Conecte relógios e dispositivos para acompanhar dados de saúde e atividade.',
    description: 'Conecte relógios e dispositivos para acompanhar atividade e saúde.',
    icon: 'watch-variant',
    title: 'Sincronizar dispositivos',
    tone: 'gold',
  },
  {
    accessibilityLabel:
      'Abrir Alimentações diárias. Informe os tipos de refeições que costuma fazer no dia.',
    description: 'Cadastre refeições comuns, horários e hábitos do dia a dia.',
    icon: 'food-apple-outline',
    title: 'Alimentações diárias',
    tone: 'mint',
  },
  {
    accessibilityLabel:
      'Abrir Alimentação ideal para escolher. Veja opções alinhadas ao seu objetivo e preferências.',
    description: 'Escolha ideias de alimentação alinhadas ao seu objetivo atual.',
    icon: 'silverware-fork-knife',
    title: 'Alimentação ideal para escolher',
    tone: 'pink',
  },
  {
    accessibilityLabel:
      'Abrir Escolhas de treinos. Ajuste tipos de treino favoritos, disponibilidade e foco principal.',
    description: 'Escolha estilos, foco e disponibilidade para seus treinos.',
    icon: 'dumbbell',
    title: 'Escolhas de treinos',
    tone: 'blue',
  },
  {
    accessibilityLabel:
      'Abrir Recomendações. Receba sugestões personalizadas com base no seu perfil e rotina.',
    description: 'Sugestões para treino, descanso e rotina a partir do seu perfil.',
    icon: 'lightbulb-on-outline',
    title: 'Recomendações',
    tone: 'green',
  },
  {
    accessibilityLabel:
      'Abrir Conquistas. Veja marcos importantes da sua jornada, como constância e treinos concluídos.',
    description: 'Marcos, badges e sinais de constância na sua jornada.',
    icon: 'trophy-outline',
    title: 'Conquistas',
    tone: 'lightBlue',
  },
  {
    accessibilityLabel: 'Abrir Frase do dia. Publique ou salve uma frase para marcar seu momento.',
    description: 'Registre uma frase curta para manter sua motivação visível.',
    icon: 'format-quote-close',
    title: 'Frase do dia',
    tone: 'purple',
  },
];

export default function HomeScreen() {
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const coverImageSource = previewImageUri || profileImageUri
    ? { uri: previewImageUri ?? profileImageUri ?? undefined }
    : require('../../assets/images/icon.png');

  function openImageUpload() {
    if (Platform.OS !== 'web') {
      Alert.alert('Upload de imagem', 'A seleção de imagem será conectada para Android e iOS em uma próxima etapa.');
      return;
    }

    const input = document.createElement('input');
    input.accept = 'image/*';
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewImageUri(reader.result);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function acceptPreviewImage() {
    setProfileImageUri(previewImageUri);
    setPreviewImageUri(null);
  }

  return (
    <Screen edges={['top', 'right', 'left']} style={styles.screen}>
      <ImageBackground
        accessibilityIgnoresInvertColors
        imageStyle={styles.profileCoverImage}
        source={coverImageSource}
        style={styles.profileCover}>
        <View style={styles.profileCoverOverlay} />
        <View style={styles.coverActions}>
          <Pressable
            accessibilityLabel="Ir para a tela inicial de treinos"
            accessibilityRole="button"
            onPress={() => router.push('/(app)/dashboard')}
            style={({ pressed }) => [styles.coverActionBadge, pressed ? styles.pressed : null]}>
            <MaterialCommunityIcons color={colors.primary} name="home-outline" size={25} />
          </Pressable>
          <Pressable
            accessibilityLabel="Alterar perfil. Atualize foto, nome, objetivo, peso, altura e preferências."
            accessibilityRole="button"
            onPress={openImageUpload}
            style={({ pressed }) => [styles.coverActionBadge, pressed ? styles.pressed : null]}>
            <MaterialCommunityIcons color={colors.primary} name="account-edit-outline" size={25} />
          </Pressable>
          <Pressable
            accessibilityLabel="Carregar imagem do perfil"
            accessibilityRole="button"
            onPress={openImageUpload}
            style={({ pressed }) => [styles.coverActionBadge, pressed ? styles.pressed : null]}>
            <MaterialCommunityIcons color={colors.primary} name="camera-outline" size={25} />
          </Pressable>
        </View>
        <View style={styles.profileHeader}>
          <Text style={styles.name}>Rodrigo Gonçalves</Text>
          <Text style={styles.subtitle}>Acompanhe suas escolhas, rotina e evolução.</Text>

          {previewImageUri ? (
            <View style={styles.uploadActions}>
              <Pressable
                accessibilityLabel="Aceitar imagem selecionada para o perfil"
                accessibilityRole="button"
                onPress={acceptPreviewImage}
                style={({ pressed }) => [styles.acceptImageButton, pressed ? styles.pressed : null]}>
                <MaterialCommunityIcons color={colors.text} name="check" size={18} />
                <Text style={styles.acceptImageText}>Aceitar imagem</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Cancelar imagem selecionada"
                accessibilityRole="button"
                onPress={() => setPreviewImageUri(null)}
                style={({ pressed }) => [styles.cancelImageButton, pressed ? styles.pressed : null]}>
                <Text style={styles.cancelImageText}>Cancelar</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ImageBackground>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}>
        <View
          accessibilityLabel="Resumo rápido do perfil: objetivo ganho de massa, nível iniciante e quatro treinos por semana."
          style={styles.quickSummary}>
          <SummaryPill icon="target" label="Objetivo" value="Ganho de massa" />
          <SummaryPill icon="chart-line" label="Nível" value="Iniciante" />
          <SummaryPill icon="calendar-check-outline" label="Rotina" value="4x semana" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Menu do perfil</Text>
          <Text style={styles.sectionDescription}>Escolha uma área para ajustar sua experiência.</Text>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <ProfileMenuCard item={item} key={item.title} />
          ))}
        </View>

        <Pressable
          accessibilityLabel="Abrir Evolução corporal. Acompanhe peso, medidas, fotos e consistência ao longo do tempo."
          accessibilityRole="button"
          style={({ pressed }) => [styles.evolutionCard, pressed ? styles.pressed : null]}>
          <View style={styles.evolutionIcon}>
            <MaterialCommunityIcons color={colors.primary} name="human-male-height-variant" size={34} />
          </View>
          <View style={styles.evolutionTextGroup}>
            <Text style={styles.evolutionKicker}>Em breve</Text>
            <Text style={styles.evolutionTitle}>Evolução corporal</Text>
            <Text style={styles.evolutionDescription}>
              Peso, medidas, fotos e progresso em uma linha do tempo visual.
            </Text>
          </View>
          <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={26} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryPill}>
      <MaterialCommunityIcons color={colors.primary} name={icon} size={20} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function ProfileMenuCard({ item }: { item: ProfileMenuItem }) {
  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [styles.menuCard, pressed ? styles.pressed : null]}>
      <View style={[styles.menuImage, toneStyles[item.tone]]}>
        <MaterialCommunityIcons color={colors.text} name={item.icon} size={34} />
      </View>
      <View style={styles.menuCardText}>
        <Text style={styles.menuCardTitle}>{item.title}</Text>
        <Text style={styles.menuCardDescription}>{item.description}</Text>
      </View>
      <MaterialCommunityIcons color={colors.textSecondary} name="arrow-right" size={20} />
    </Pressable>
  );
}

const toneStyles = StyleSheet.create({
  blue: {
    backgroundColor: '#2563EB',
  },
  gold: {
    backgroundColor: '#D97706',
  },
  green: {
    backgroundColor: colors.primaryDark,
  },
  lightBlue: {
    backgroundColor: '#38BDF8',
  },
  mint: {
    backgroundColor: '#0F766E',
  },
  pink: {
    backgroundColor: '#BE185D',
  },
  purple: {
    backgroundColor: '#7C3AED',
  },
  red: {
    backgroundColor: '#B91C1C',
  },
});

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  scrollArea: {
    flex: 1,
  },
  profileCover: {
    height: 274,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  profileCoverImage: {
    height: '100%',
    opacity: 0.9,
    resizeMode: 'cover',
    width: '100%',
  },
  profileCoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 20, 0.28)',
  },
  coverActions: {
    gap: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  coverActionBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.58)',
    borderColor: 'rgba(0, 179, 126, 0.78)',
    borderRadius: 10,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  profileHeader: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    maxWidth: 420,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  name: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 300,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  acceptImageButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  acceptImageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  cancelImageButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.7)',
    borderColor: colors.surfaceStrong,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  cancelImageText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  quickSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  summaryPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexGrow: 1,
    gap: 4,
    minHeight: 92,
    minWidth: 104,
    padding: spacing.sm,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  evolutionCard: {
    alignItems: 'center',
    backgroundColor: '#13231E',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  evolutionIcon: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  evolutionTextGroup: {
    flex: 1,
    gap: 3,
  },
  evolutionKicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  evolutionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  evolutionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  sectionDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  menuGrid: {
    gap: spacing.sm,
  },
  menuCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 112,
    padding: spacing.md,
  },
  menuImage: {
    alignItems: 'center',
    borderRadius: 8,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  menuCardText: {
    flex: 1,
    gap: 4,
  },
  menuCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  menuCardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.78,
  },
});
