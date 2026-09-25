// Só no navegador, que não tem a pasta privada do app: a imagem escolhida (um endereço blob: ou data:) vira
// um JPEG de no máximo 1600 px no lado maior, guardado como texto. Redesenhar a imagem também tira os
// metadados (nem a localização fica), como o servidor faz com as fotos da conta.
export async function webImageDataUri(uri: string, maxSide = 1600, quality = 0.8) {
  const image = new window.Image();
  image.src = uri;
  await image.decode();

  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('O navegador não conseguiu preparar a imagem.');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', quality);
}
