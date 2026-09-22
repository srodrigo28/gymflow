import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { spacing } from '@/src/constants/spacing';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';

type Exercise = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle: string;
};

const categories = ['Costas', 'Bíceps', 'Tríceps', 'Ombro'];

const exercises: Exercise[] = [
  {
    icon: 'arm-flex-outline',
    subtitle: '3 séries x 12 repetições',
    title: 'Puxada frontal',
  },
  {
    icon: 'rowing',
    subtitle: '3 séries x 12 repetições',
    title: 'Remada curvada',
  },
  {
    icon: 'dumbbell',
    subtitle: '3 séries x 12 repetições',
    title: 'Remada unilateral',
  },
  {
    icon: 'weight-lifter',
    subtitle: '3 séries x 12 repetições',
    title: 'Levantamento terra',
  },
];

export default function DashboardScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  // Todos os exercícios são do domínio treino: mesma cor, um único significado.
  const exerciseColor = theme.domain.treino;

  return (
    <Screen edges={['top', 'right', 'left']} style={styles.screen}>
      <View style={styles.header}>
        <Image source={require('../../assets/images/icon.png')} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Olá,</Text>
          <Text style={styles.name}>Rodrigo Gonçalves</Text>
        </View>
        <Pressable
          accessibilityLabel="Voltar para o perfil"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}>
          <MaterialCommunityIcons color={theme.text.secondary} name="logout" size={30} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          contentContainerStyle={styles.categoryList}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {categories.map((category, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: index === 0 }}
              key={category}
              style={[styles.categoryButton, index === 0 ? styles.categoryButtonActive : null]}>
              <Text style={[styles.categoryText, index === 0 ? styles.categoryTextActive : null]}>
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseTitle}>Exercícios</Text>
          <Text style={styles.exerciseCount}>{exercises.length}</Text>
        </View>

        <View style={styles.exerciseList}>
          {exercises.map((exercise) => (
            <Pressable
              accessibilityLabel={`Abrir exercício ${exercise.title}. ${exercise.subtitle}.`}
              accessibilityRole="button"
              key={exercise.title}
              style={({ pressed }) => [styles.exerciseCard, pressed ? styles.pressed : null]}>
              <View style={[styles.exerciseImage, { backgroundColor: withAlpha(exerciseColor, 0.16) }]}>
                <MaterialCommunityIcons color={exerciseColor} name={exercise.icon} size={32} />
              </View>
              <View style={styles.exerciseText}>
                <Text style={styles.exerciseName}>{exercise.title}</Text>
                <Text style={styles.exerciseSubtitle}>{exercise.subtitle}</Text>
              </View>
              <MaterialCommunityIcons color={theme.text.muted} name="chevron-right" size={30} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable accessibilityLabel="Início" accessibilityRole="button" style={styles.navItem}>
          <MaterialCommunityIcons color={theme.accent.primary} name="home" size={34} />
        </Pressable>
        <Pressable accessibilityLabel="Histórico" accessibilityRole="button" style={styles.navItem}>
          <MaterialCommunityIcons color={theme.text.secondary} name="history" size={34} />
        </Pressable>
        <Pressable
          accessibilityLabel="Abrir perfil"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.navItem}>
          <MaterialCommunityIcons color={theme.text.secondary} name="account-circle-outline" size={34} />
        </Pressable>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: {
    backgroundColor: theme.bg.base,
  },
  header: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 132,
    paddingHorizontal: spacing.xl,
  },
  avatar: {
    borderColor: theme.bg.raised,
    borderRadius: 999,
    borderWidth: 2,
    height: 78,
    width: 78,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 20,
  },
  name: {
    color: theme.text.primary,
    fontSize: 24,
    fontFamily: fonts.extrabold,
  },
  headerAction: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xl,
  },
  categoryList: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  categoryButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: 'transparent',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    minWidth: 144,
    paddingHorizontal: spacing.lg,
  },
  categoryButtonActive: {
    borderColor: theme.accent.primary,
  },
  categoryText: {
    color: theme.text.secondary,
    fontSize: 17,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  categoryTextActive: {
    color: theme.accent.primary,
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  exerciseTitle: {
    color: theme.text.secondary,
    fontSize: 24,
    fontFamily: fonts.extrabold,
  },
  exerciseCount: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 22,
  },
  exerciseList: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  exerciseCard: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.md,
  },
  exerciseImage: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  exerciseText: {
    flex: 1,
    gap: 8,
  },
  exerciseName: {
    color: theme.text.primary,
    fontSize: 22,
    fontFamily: fonts.extrabold,
  },
  exerciseSubtitle: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 17,
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    flexDirection: 'row',
    height: 86,
    justifyContent: 'space-around',
    paddingBottom: spacing.sm,
  },
  navItem: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    width: 72,
  },
  pressed: {
    opacity: 0.78,
  },
}));
