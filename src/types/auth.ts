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
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
