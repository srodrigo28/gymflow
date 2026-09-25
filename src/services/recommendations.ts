import type { Href } from 'expo-router';

import { getBodyTrend, listPhotoMonths } from '@/src/services/body';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { getDaysSinceMuscle, getPeriodSummary, listFinishedSessionStarts } from '@/src/services/training';
import type { DomainName } from '@/src/theme';
import { monthKey, muscleLabel, startOfWeek } from '@/src/utils/format';

const DAY = 86_400_000;

export type Recommendation = {
  action?: { href: Href; label: string };
  body: string;
  id: string;
  // Menor aparece antes: até 3 é o que pede ação hoje; 4 a 6, nesta semana; 7 em diante, hábito.
  priority: number;
  title: string;
  tone: DomainName;
};

type Inputs = { consentAt: string | null; userId: string };

// Rotas que ainda não estão nos tipos gerados do expo-router (novas nesta rodada).
const route = (path: string) => path as unknown as Href;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function distinctDays(timestamps: number[]) {
  return new Set(timestamps.map((timestamp) => new Date(timestamp).toDateString())).size;
}

// Estágio 1 das recomendações (22-estrategia.md, seção 2.5): regras sobre o que a pessoa registrou
// aqui e o que respondeu no questionário. Sem IA e sem rede: tudo é calculado no aparelho, e nada
// sai dele. Cada regra só fala quando tem dado para isso; sem dado, não há sugestão inventada.
export async function getRecommendations({ consentAt, userId }: Inputs): Promise<Recommendation[]> {
  const now = Date.now();
  const weekStart = startOfWeek();
  const [profile, week, lastWeek, gaps, starts, trend, photoMonths] = await Promise.all([
    getOnboardingProfile(userId),
    getPeriodSummary(weekStart, now),
    getPeriodSummary(weekStart - 7 * DAY, weekStart - 1),
    getDaysSinceMuscle(),
    listFinishedSessionStarts(),
    getBodyTrend(),
    listPhotoMonths(),
  ]);
  const list: Recommendation[] = [];
  const lastStart = starts[0];
  const daysThisWeek = distinctDays(starts.filter((timestamp) => timestamp >= weekStart));

  // --- Treino: o que pede ação hoje ---------------------------------------------------------
  if (!lastStart) {
    list.push({
      action: { href: '/(app)/treino', label: 'Começar um treino' },
      body: 'O primeiro treino leva menos de um minuto para começar. Uma série já vira histórico, recorde e ponto de partida.',
      id: 'primeiro-treino',
      priority: 1,
      title: 'Comece pelo primeiro treino',
      tone: 'treino',
    });
  } else {
    const daysSince = Math.floor((now - lastStart) / DAY);

    if (daysSince >= 3) {
      list.push({
        action: { href: '/(app)/treino', label: 'Treinar hoje' },
        body: `Faz ${plural(daysSince, 'dia', 'dias')} desde o último treino. Um treino curto hoje já mantém o ritmo; não precisa compensar o que passou.`,
        id: 'volta',
        priority: 2,
        title: 'Hora de voltar',
        tone: 'treino',
      });
    }
  }

  const target = profile?.trainingDaysPerWeek;

  if (target && lastStart) {
    const remaining = target - daysThisWeek;

    if (remaining > 0 && daysThisWeek > 0) {
      list.push({
        action: { href: '/(app)/treino', label: 'Ver o que está faltando' },
        body: `Você treinou em ${plural(daysThisWeek, 'dia', 'dias')} nesta semana e a sua rotina é de ${target}. ${remaining === 1 ? 'Falta um treino' : `Faltam ${remaining} treinos`} para fechar a semana.`,
        id: 'rotina-semana',
        priority: 3,
        title: `${remaining === 1 ? 'Falta 1 treino' : `Faltam ${remaining} treinos`} na semana`,
        tone: 'treino',
      });
    } else if (remaining <= 0) {
      list.push({
        body: `Rotina de ${target}x fechada nesta semana. Descanso também é treino: a força vem quando o corpo recupera.`,
        id: 'rotina-completa',
        priority: 6,
        title: 'Semana completa',
        tone: 'conquista',
      });
    }
  }

  // Grupos parados há mais de dez dias, os dois mais atrasados.
  const stale = gaps.filter((gap) => gap.days >= 10).sort((a, b) => b.days - a.days).slice(0, 2);

  for (const gap of stale) {
    list.push({
      action: { href: '/(app)/treino', label: 'Encaixar no próximo treino' },
      body: `${muscleLabel(gap.muscle)} está há ${gap.days} dias sem série concluída. Mais de dez dias sem estímulo, o grupo perde o ritmo que você já tinha.`,
      id: `grupo-${gap.muscle}`,
      priority: 4,
      title: `${muscleLabel(gap.muscle)} há ${gap.days} dias`,
      tone: 'treino',
    });
  }

  if (lastWeek.volumeKg > 0 && week.volumeKg > lastWeek.volumeKg * 1.4 && week.sessionCount >= lastWeek.sessionCount) {
    list.push({
      body: 'O volume desta semana já passou o da anterior em mais de 40%. Saltos grandes cansam antes de fortalecer: se aparecer dor fora do normal, tire um dia.',
      id: 'salto-volume',
      priority: 5,
      title: 'Volume subiu rápido',
      tone: 'treino',
    });
  }

  // --- Sono e recuperação --------------------------------------------------------------------
  if (profile?.sleepHours === 'less_than_5' || profile?.sleepHours === '5_to_6') {
    list.push({
      body: 'Você contou que dorme menos de 7 horas. Força e recorde acontecem na recuperação: nas noites antes de um treino pesado, tente deitar meia hora mais cedo.',
      id: 'sono-curto',
      priority: 4,
      title: 'Sono curto, recuperação curta',
      tone: 'sono',
    });
  }

  if (profile?.wakesUpRested === 'no') {
    list.push({
      body: 'Acordar cansado por semanas seguidas é sinal para trocar um treino intenso por um leve e ver como o corpo responde. Constância vale mais que intensidade.',
      id: 'acorda-cansado',
      priority: 7,
      title: 'Acordando cansado',
      tone: 'sono',
    });
  }

  // --- Alimentação e água --------------------------------------------------------------------
  if (profile?.sodaFrequency === 'daily' || profile?.sodaFrequency === 'weekly_3_5') {
    list.push({
      action: { href: route('/(app)/alimentacao/ideal'), label: 'Ver trocas simples' },
      body: 'Trocar um copo por água com gás e limão já tira bastante açúcar do dia, sem sacrifício. Comece por um dos copos, não por todos.',
      id: 'refrigerante',
      priority: 5,
      title: 'Refrigerante quase todo dia',
      tone: 'agua',
    });
  }

  if (profile?.monitorsFood === 'no' && profile?.wantsNutritionTips !== 'no') {
    list.push({
      action: { href: route('/(app)/alimentacao'), label: 'Abrir o diário' },
      body: 'Anotar só o tipo da refeição, sem contar nada, já mostra padrões em uma semana: o que falta, o que repete e a que horas a fome aperta.',
      id: 'diario-alimentar',
      priority: 8,
      title: 'Um diário simples de refeições',
      tone: 'alimentacao',
    });
  }

  // --- Mente ---------------------------------------------------------------------------------
  if (profile?.moodPattern === 'anxious' || profile?.moodPattern === 'irritated' || profile?.moodPattern === 'discouraged') {
    list.push({
      action: { href: '/(app)/treino', label: 'Registrar um treino leve' },
      body: 'Em dias difíceis, vinte minutos de caminhada ou mobilidade valem mais que pular. Registre como treino: conta para a rotina e para o desafio.',
      id: 'treino-leve',
      priority: 6,
      title: 'Treino leve também conta',
      tone: 'mente',
    });
  }

  if (profile?.smokes === 'yes') {
    list.push({
      body: 'Sem sermão: o fôlego no cardio melhora em poucas semanas quando o cigarro diminui. Se quiser apoio para parar, o SUS tem programa gratuito pelo telefone 136.',
      id: 'fumo',
      priority: 9,
      title: 'Fumo e fôlego',
      tone: 'mente',
    });
  }

  // --- Evolução do corpo ---------------------------------------------------------------------
  if (trend.latest) {
    const daysSinceWeigh = Math.floor((now - trend.latest.takenAt) / DAY);

    if (daysSinceWeigh >= 14) {
      list.push({
        action: { href: '/(app)/corpo/medidas', label: 'Registrar peso' },
        body: `A última pesagem foi há ${daysSinceWeigh} dias. Uma a cada uma ou duas semanas, de manhã, mostra a tendência sem o sobe e desce do dia a dia.`,
        id: 'pesagem',
        priority: 6,
        title: 'Peso sem registro',
        tone: 'conquista',
      });
    }
  } else if (lastStart) {
    list.push({
      action: { href: '/(app)/corpo/medidas', label: 'Registrar medidas' },
      body: 'Peso e uma ou duas circunferências hoje viram o ponto zero da sua evolução. Sem o começo, não dá para ver o quanto mudou.',
      id: 'ponto-zero',
      priority: 5,
      title: 'Registre o ponto de partida',
      tone: 'conquista',
    });
  }

  if (!consentAt && trend.measurementCount > 0) {
    list.push({
      action: { href: '/(app)/corpo', label: 'Guardar na conta' },
      body: 'Suas medidas ficam só neste aparelho. Com o seu consentimento, elas ficam na conta e voltam num celular novo; dá para retirar quando quiser.',
      id: 'consentimento-medidas',
      priority: 8,
      title: 'Medidas só neste aparelho',
      tone: 'conquista',
    });
  }

  if (lastStart && photoMonths[0]?.month !== monthKey()) {
    list.push({
      action: { href: '/(app)/corpo/fotos', label: 'Tirar a foto do mês' },
      body: photoMonths.length
        ? 'Ainda não há foto deste mês. Mesma pose, mesma luz, uma vez por mês: é o que mostra o que a balança esconde.'
        : 'Uma foto por mês, sempre na mesma pose, é a comparação mais honesta que existe. Ela fica só no seu aparelho.',
      id: 'foto-mes',
      priority: 9,
      title: photoMonths.length ? 'Foto do mês' : 'Primeira foto de evolução',
      tone: 'conquista',
    });
  }

  // Com tudo em dia, ainda há um próximo passo natural: o grupo que está há mais tempo sem treino.
  if (list.length === 0 && lastStart && gaps.length > 0) {
    const next = [...gaps].sort((a, b) => b.days - a.days)[0]!;

    list.push({
      action: { href: '/(app)/treino', label: 'Começar por ele' },
      body:
        next.days > 0
          ? `Nenhum grupo está atrasado. O que faz mais tempo é ${muscleLabel(next.muscle).toLowerCase()}, há ${plural(next.days, 'dia', 'dias')}: um bom começo para o próximo treino.`
          : 'Tudo treinado recentemente. No próximo treino, alterne o grupo em relação ao de hoje e mantenha o ritmo.',
      id: 'proximo-grupo',
      priority: 10,
      title: `Próximo treino: ${muscleLabel(next.muscle)}`,
      tone: 'treino',
    });
  }

  return list.sort((a, b) => a.priority - b.priority);
}
