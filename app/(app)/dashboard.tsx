import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';

type Exercise = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle: string;
  tone: string;
};

const categories = ['Costas', 'Bíceps', 'Tríceps', 'Ombro'];

const exercises: Exercise[] = [
  {
    icon: 'arm-flex-outline',
    subtitle: '3 séries x 12 repetições',
    title: 'Puxada frontal',
    tone: '#0E7490',
  },
  {
    icon: 'rowing',
    subtitle: '3 séries x 12 repetições',
    title: 'Remada curvada',
    tone: '#7C3AED',
  },
  {
    icon: 'dumbbell',
    subtitle: '3 séries x 12 repetições',
    title: 'Remada unilateral',
    tone: '#2563EB',
  },
  {
    icon: 'weight-lifter',
    subtitle: '3 séries x 12 repetições',
    title: 'Levantamento terra',
    tone: '#B7791F',
  },
];

export default function DashboardScreen() {
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
          <MaterialCommunityIcons color={colors.textSecondary} name="logout" size={30} />
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
              <View style={[styles.exerciseImage, { backgroundColor: exercise.tone }]}>
                <MaterialCommunityIcons color={colors.text} name={exercise.icon} size={34} />
              </View>
              <View style={styles.exerciseText}>
                <Text style={styles.exerciseName}>{exercise.title}</Text>
                <Text style={styles.exerciseSubtitle}>{exercise.subtitle}</Text>
              </View>
              <MaterialCommunityIcons color={colors.placeholder} name="chevron-right" size={30} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable accessibilityLabel="Início" accessibilityRole="button" style={styles.navItem}>
          <MaterialCommunityIcons color={colors.primary} name="home" size={34} />
        </Pressable>
        <Pressable accessibilityLabel="Histórico" accessibilityRole="button" style={styles.navItem}>
          <MaterialCommunityIcons color={colors.textSecondary} name="history" size={34} />
        </Pressable>
        <Pressable
          accessibilityLabel="Abrir perfil"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.navItem}>
          <MaterialCommunityIcons color={colors.textSecondary} name="account-circle-outline" size={34} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 132,
    paddingHorizontal: spacing.xl,
  },
  avatar: {
    borderColor: colors.surfaceStrong,
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
    color: colors.textSecondary,
    fontSize: 20,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
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
    backgroundColor: colors.surface,
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    minWidth: 144,
    paddingHorizontal: spacing.lg,
  },
  categoryButtonActive: {
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  categoryTextActive: {
    color: colors.primary,
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  exerciseTitle: {
    color: colors.textSecondary,
    fontSize: 24,
    fontWeight: '900',
  },
  exerciseCount: {
    color: colors.textSecondary,
    fontSize: 22,
  },
  exerciseList: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  exerciseCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.md,
  },
  exerciseImage: {
    alignItems: 'center',
    borderRadius: 8,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  exerciseText: {
    flex: 1,
    gap: 8,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  exerciseSubtitle: {
    color: colors.textSecondary,
    fontSize: 17,
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: colors.surface,
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
});
