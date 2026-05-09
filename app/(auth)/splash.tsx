import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { colors } from '@/src/constants/colors';

export default function SplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 1200);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <AuthBackground contentStyle={styles.container}>
      <View style={styles.brand}>
        <MaterialCommunityIcons name="dumbbell" size={58} color={colors.primary} />
        <Text style={styles.title}>Ignite Gym</Text>
        <Text style={styles.subtitle}>Treine sua mente e o seu corpo</Text>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 18,
  },
});
