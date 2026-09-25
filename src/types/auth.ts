export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  // Administrador vê o painel com o total de cadastros (o gatilho dos 200).
  role: 'user' | 'admin';
  // Quando a pessoa aceitou guardar as medidas do corpo na conta (ISO 8601). null: não aceitou.
  bodyDataConsentAt: string | null;
  // Quando confirmou o e-mail com o código (ISO 8601). null: ainda não confirmou.
  emailVerifiedAt: string | null;
  // Quando aceitou guardar as respostas do questionário na conta (ISO 8601). null: não aceitou.
  questionnaireConsentAt: string | null;
  // Quando aceitou guardar o diário do dia (sono, água e humor) na conta (ISO 8601). null: não aceitou.
  dailyLogConsentAt: string | null;
  // Quando aceitou guardar as fotos de evolução na conta (ISO 8601). null: não aceitou.
  bodyPhotoConsentAt: string | null;
  // Não aparece no ranking da academia (o mural continua aberto).
  gymRankingOptOut: boolean;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
