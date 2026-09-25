// O que um amigo deixa ver: só o nome e os dias com treino da semana. Nada de medidas,
// cargas ou treinos.
export type Friend = {
  // Dias distintos com treino concluído desde a segunda-feira desta semana.
  daysThisWeek: number;
  name: string;
  // Quando a amizade foi aceita (ISO 8601).
  since: string;
  trainedToday: boolean;
  userId: string;
};

// Pedido que alguém mandou para mim.
export type IncomingFriendRequest = {
  createdAt: string;
  from: { name: string; userId: string };
  id: string;
};

// Convite que eu mandei e ainda espera resposta. Só o e-mail que eu digitei: o nome de quem
// não aceitou nunca aparece.
export type OutgoingFriendRequest = {
  createdAt: string;
  id: string;
  to: { email: string };
};

export type FriendsOverview = {
  friends: Friend[];
  incoming: IncomingFriendRequest[];
  outgoing: OutgoingFriendRequest[];
};
