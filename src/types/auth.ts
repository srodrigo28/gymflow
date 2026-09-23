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
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
