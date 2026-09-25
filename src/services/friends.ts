import { apiRequest } from '@/src/services/api';
import type { Friend, FriendsOverview } from '@/src/types/friends';

export async function listFriends(token: string) {
  return apiRequest<FriendsOverview>('/friends', { token });
}

// A API responde com a mesma mensagem exista a conta ou não; a tela mostra o texto como veio.
export async function sendFriendRequest(token: string, email: string) {
  const { message } = await apiRequest<{ message: string }>('/friends/requests', {
    body: { email },
    method: 'POST',
    token,
  });

  return message;
}

export async function acceptFriendRequest(token: string, id: string) {
  const { friend } = await apiRequest<{ friend: Friend }>(`/friends/requests/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    token,
  });

  return friend;
}

// Serve para recusar (quem recebeu) e para cancelar (quem enviou).
export async function declineFriendRequest(token: string, id: string) {
  await apiRequest(`/friends/requests/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}

export async function removeFriend(token: string, userId: string) {
  await apiRequest(`/friends/${encodeURIComponent(userId)}`, { method: 'DELETE', token });
}
