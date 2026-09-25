/** Ponto no mapa em graus decimais, como o GPS entrega. */
export type GeoPoint = {
  latitude: number;
  longitude: number;
};

// A academia que a pessoa marcou, guardada neste aparelho (AsyncStorage) por conta. Desde a Fase 4 ela
// também vai para a conta (src/services/league.ts): o servidor confere o check-in e decide se é verificado.
export type Gym = GeoPoint & {
  name: string;
  // Até esta distância (em metros) do ponto marcado, o check-in conta como "no local".
  radiusM: number;
  savedAt: number;
};

// O que a tela envia ao marcar a academia: o serviço carimba o savedAt e aplica o raio padrão.
export type GymInput = Omit<Gym, 'radiusM' | 'savedAt'> & { radiusM?: number };

// Uma visita registrada. `atGym` diz se a distância estava dentro do raio na hora do registro.
export type GymCheckin = {
  id: string;
  at: number;
  distanceM: number;
  atGym: boolean;
};

// O que a tela envia ao registrar: o serviço gera o id e carimba a hora.
export type GymCheckinInput = Pick<GymCheckin, 'atGym' | 'distanceM'>;
