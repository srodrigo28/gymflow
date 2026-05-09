# 🏋️‍♂️ Guia de Instalação e Execução com Expo

Este projeto utiliza **Expo SDK 54**, **React 19** e **React Native 0.81**.

Siga os passos abaixo para criar o projeto, instalar as dependências e executar o aplicativo corretamente.

---

## 📌 1. Pré-requisitos

Antes de começar, verifique se você tem instalado:

- ✅ Node.js 18 LTS ou 20 LTS
- ✅ NPM, que já vem junto com o Node.js
- ✅ Android Studio com emulador configurado ou dispositivo físico Android
- ✅ Xcode, apenas para macOS, caso queira rodar no iOS
- ✅ Expo CLI via `npx`, sem necessidade de instalação global

Verifique as versões instaladas:

```powershell
node -v
npm -v
```

---

## 🚀 2. Criar o projeto com Expo

Caso ainda não tenha criado o projeto, execute o comando abaixo:

```powershell
npx create-expo-app nome-do-projeto
```

Depois, entre na pasta do projeto:

```powershell
cd nome-do-projeto
```

Se quiser criar o projeto já usando um template em branco:

```powershell
npx create-expo-app nome-do-projeto --template blank
```

---

## 📦 3. Instalar as dependências do projeto

Dentro da pasta do projeto, instale as dependências principais:

```powershell
npm install
```

---

## 🧩 4. Instalar bibliotecas adicionais usadas na aplicação

### 📝 Formulários e validação

Essas bibliotecas são usadas para criar e validar formulários:

```powershell
npm i react-hook-form zod @hookform/resolvers
```

---

### 🎨 Ícones

Instale os ícones usando o Expo:

```powershell
npx expo install @expo/vector-icons
```

---

### 📅 Date Picker

Usado para campos de data, como “Data de nascimento”:

```powershell
npx expo install @react-native-community/datetimepicker
```

---

### 🔢 Máscaras de texto

Usado para formatar campos como WhatsApp, placa e quilometragem.

```powershell
npm i react-native-mask-text
```

> ⚠️ Essa biblioteca é opcional. Caso não seja instalada, o app pode funcionar normalmente, mas sem formatação automática nesses campos.

---

## ▶️ 5. Scripts disponíveis

Os principais scripts estão no arquivo `package.json`.

```powershell
npm run start
```

Abre o servidor de desenvolvimento do Expo.

```powershell
npm run android
```

Executa o app em um emulador ou dispositivo Android.

```powershell
npm run ios
```

Executa o app no iOS. Requer macOS com Xcode instalado.

```powershell
npm run web
```

Executa o app no navegador.

Também é possível iniciar o Expo diretamente com:

```powershell
npx expo start
```

---

## 📱 6. Rodando o aplicativo

### Iniciar o servidor do Expo

```powershell
npm run start
```

Depois disso, o terminal exibirá um QR Code e algumas opções de execução.

---

### Rodar no Android

Com o emulador aberto ou um dispositivo físico conectado via USB, execute:

```powershell
npm run android
```

---

### Rodar no iOS

No macOS, com o Xcode configurado, execute:

```powershell
npm run ios
```

---

### Rodar no navegador

```powershell
npm run web
```

---

## 🧱 7. Componentes utilizados na tela

A aplicação utiliza os seguintes componentes e bibliotecas:

- `SafeAreaView`
- `View`
- `Text`
- `Image`
- `Pressable`
- `TextInput`
- `react-hook-form`
- `useForm`
- `Controller`
- `zod`
- `zodResolver`
- `DateTimePicker`
- `Ionicons`
- `MaterialCommunityIcons`

---

## 🛠️ 8. Dicas e troubleshooting

### Sincronizar dependências com a versão do Expo

Caso ocorra algum erro de versão ou compatibilidade, execute:

```powershell
npx expo install
```

---

### Limpar o cache do Metro Bundler

Se o app apresentar comportamento estranho ou erro de cache, execute:

```powershell
npx expo start -c
```

---

### Problemas com Android

Caso o emulador Android não abra:

- Verifique se o Android Studio está instalado
- Confirme se existe um AVD criado
- Abra o emulador antes de rodar o comando
- Verifique se o dispositivo físico está com a depuração USB ativada

---

### Problemas com iOS

Para rodar no iOS, é necessário:

- Usar macOS
- Ter o Xcode instalado
- Ter o simulador configurado

---

## ✅ Fluxo resumido de instalação

```powershell
npx create-expo-app nome-do-projeto
cd nome-do-projeto
npm install
npm i react-hook-form zod @hookform/resolvers
npx expo install @expo/vector-icons
npx expo install @react-native-community/datetimepicker
npm i react-native-mask-text
npm run start
```

---

## 🎉 Pronto!

Com esses passos, o projeto estará configurado e pronto para ser executado com Expo.

Agora é só desenvolver, testar e evoluir o aplicativo! 🚀
