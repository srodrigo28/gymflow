const muscleLabels: Record<string, string> = {
  bracos: 'Braços',
  core: 'Core',
  'corpo-todo': 'Corpo todo',
  costas: 'Costas',
  ombros: 'Ombros',
  peito: 'Peito',
  pernas: 'Pernas',
};

export function muscleLabel(muscle: string) {
  return muscleLabels[muscle] ?? muscle;
}

// 75 → "1:15"; 3725 → "1:02:05"
export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(Math.floor(totalSeconds), 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

// 12500 → "12,5 t" (tonelagem fica mais legível que 12500 kg)
export function formatVolume(volumeKg: number) {
  if (volumeKg >= 1000) {
    return `${(volumeKg / 1000).toFixed(1).replace('.', ',')} t`;
  }

  return `${Math.round(volumeKg)} kg`;
}

export function formatNumber(value: number, digits = 1) {
  return value.toFixed(digits).replace('.', ',');
}

const weekdays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatSessionDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (isToday) return `Hoje, ${time}`;
  if (isYesterday) return `Ontem, ${time}`;

  return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

// Início da semana (segunda-feira) e do mês, para os resumos.
export function startOfWeek(reference = new Date()) {
  const date = new Date(reference);
  const weekday = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - weekday);

  return date.getTime();
}

export function startOfMonth(reference = new Date()) {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);

  return date.getTime();
}
