import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { createId } from '@/src/db/client';
import { storage, storageKeys } from '@/src/services/storage';

const PHOTO_FOLDER = 'perfil';

function photoDirectory() {
  const directory = new Directory(Paths.document, PHOTO_FOLDER);

  if (!directory.exists) {
    directory.create({ idempotent: true });
  }

  return directory;
}

function deleteFile(uri: string | null) {
  if (!uri || Platform.OS === 'web') {
    return;
  }

  const file = new File(uri);

  if (file.exists) {
    file.delete();
  }
}

// A foto de capa fica só neste aparelho, como as fotos de evolução. No celular, uma cópia vai
// para a pasta privada do app; no navegador, a imagem inteira fica guardada como texto.
export async function getProfilePhoto(userId: string) {
  const uri = await storage.get(storageKeys.profilePhoto(userId));

  if (!uri || Platform.OS === 'web') {
    return uri;
  }

  return new File(uri).exists ? uri : null;
}

// Abre a galeria e guarda a foto escolhida no lugar da anterior. Devolve null se a pessoa desistir.
export async function pickProfilePhoto(userId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    // A proporção da capa na home.
    aspect: [3, 2],
    // No web o seletor devolve um endereço blob:, que some ao recarregar a página.
    base64: Platform.OS === 'web',
    mediaTypes: ['images'],
    quality: 0.8,
  });
  const asset = result.canceled ? undefined : result.assets[0];

  if (!asset) {
    return null;
  }

  const key = storageKeys.profilePhoto(userId);

  if (Platform.OS === 'web') {
    const uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
    await storage.set(key, uri);
    return uri;
  }

  const previous = await storage.get(key);
  const source = new File(asset.uri);
  // Nome novo a cada troca: com o mesmo nome, a imagem antiga continuaria no cache.
  const destination = new File(photoDirectory(), `${userId}-${createId()}${source.extension || '.jpg'}`);

  source.copy(destination);
  await storage.set(key, destination.uri);
  deleteFile(previous);

  return destination.uri;
}

export async function removeProfilePhoto(userId: string) {
  const key = storageKeys.profilePhoto(userId);
  const uri = await storage.get(key);

  await storage.remove(key);
  deleteFile(uri);
}
