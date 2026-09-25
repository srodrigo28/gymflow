import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';

import { useSession } from '@/src/contexts/session-context';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import type { CoachingPermissions } from '@/src/types/coaching';

// Ao aceitar um convite, os treinos já vêm ligados: é com eles que o personal acompanha a prescrição.
// Medidas e fotos são dados sensíveis (LGPD) e só ligam com um toque da pessoa.
export const DEFAULT_PERMISSIONS: CoachingPermissions = {
  shareMeasurements: false,
  sharePhotos: false,
  shareWorkouts: true,
};

type PermissionKey = keyof CoachingPermissions;

const items: { description: string; key: PermissionKey; label: string; noun: string }[] = [
  {
    description: 'Os treinos que você conclui, com as séries e as cargas. É com eles que o personal acompanha a prescrição.',
    key: 'shareWorkouts',
    label: 'Treinos',
    noun: 'os treinos',
  },
  {
    description: 'Peso e medidas do corpo. Só chegam se você também guarda as medidas na conta, na Evolução.',
    key: 'shareMeasurements',
    label: 'Medidas',
    noun: 'as medidas',
  },
  {
    description: 'As fotos de evolução. Só chegam se você também guarda as fotos na conta, na Evolução.',
    key: 'sharePhotos',
    label: 'Fotos',
    noun: 'as fotos',
  },
];

type PermissionSwitchesProps = {
  // Nome de quem vai ver, para o leitor de tela ("Compartilhar os treinos com Bruno").
  coachName?: string;
  disabled?: boolean;
  // Mostra o atalho para a Evolução quando medidas ou fotos estão ligadas mas ficam só no aparelho.
  linkToEvolution?: boolean;
  onChange: (key: PermissionKey, value: boolean) => void;
  value: CoachingPermissions;
};

// As três chaves do vínculo (treinos, medidas, fotos), separadas como a LGPD pede. Cada uma vale na hora.
export function PermissionSwitches({ coachName, disabled, linkToEvolution, onChange, value }: PermissionSwitchesProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  // Sem o consentimento de guardar na conta, medidas e fotos ficam só no aparelho: a chave sozinha não
  // leva nada ao personal, e a pessoa precisa saber disso.
  const localOnly: Partial<Record<PermissionKey, string>> = {
    shareMeasurements: session?.user.bodyDataConsentAt
      ? undefined
      : 'Por enquanto suas medidas ficam só neste aparelho, então o personal não as vê. Para mudar, guarde-as na conta na Evolução.',
    sharePhotos: session?.user.bodyPhotoConsentAt
      ? undefined
      : 'Por enquanto suas fotos ficam só neste aparelho, então o personal não as vê. Para mudar, guarde-as na conta na Evolução.',
  };

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const isOn = value[item.key];
        const hint = isOn ? localOnly[item.key] : undefined;

        return (
          <View key={item.key} style={styles.item}>
            <View style={styles.row}>
              <View style={styles.text}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
              <Switch
                accessibilityHint={item.description}
                accessibilityLabel={`Compartilhar ${item.noun}${coachName ? ` com ${coachName}` : ''}`}
                disabled={disabled}
                ios_backgroundColor={theme.bg.high}
                onValueChange={(next) => onChange(item.key, next)}
                thumbColor={isOn ? theme.accent.primary : theme.text.muted}
                trackColor={{ false: theme.bg.high, true: withAlpha(theme.accent.primary, 0.45) }}
                value={isOn}
              />
            </View>
            {hint ? (
              <View accessibilityLiveRegion="polite" style={styles.hintBox}>
                <Text style={styles.hint}>{hint}</Text>
                {linkToEvolution ? (
                  <Pressable
                    accessibilityLabel="Abrir a Evolução para guardar na conta"
                    accessibilityRole="link"
                    hitSlop={8}
                    onPress={() => router.push('/(app)/corpo')}
                    style={({ pressed }) => [pressed ? styles.pressed : null]}>
                    <Text style={styles.hintLink}>Abrir a Evolução</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  list: {
    gap: 14,
  },
  item: {
    gap: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  description: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  hintBox: {
    backgroundColor: withAlpha(theme.status.warning, 0.1),
    borderRadius: radius.sm,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hint: {
    color: theme.text.primary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  hintLink: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
}));
