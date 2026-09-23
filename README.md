# Gyn Flow

Aplicativo mobile em Expo/React Native para acompanhar treino, saúde e bem-estar: registro de treino que funciona sem internet, evolução do corpo com medidas e fotos, e desafios entre amigos com convite por link. A API própria fica no repositório `gymflow-api`.

## Treino em Dia
- melhor equilíbrio entre clareza e disponibilidade aparente.

## Preview

<p align="center">
  <img src="./preview/login.png" alt="Tela de login" width="220" />
  <img src="./preview/sign-up.png" alt="Tela de cadastro" width="220" />
  <img src="./preview/home.png" alt="Tela home" width="220" />
</p>

<p align="center">
  <img src="./preview/exercise.png" alt="Tela de exercício" width="220" />
  <img src="./preview/history.png" alt="Tela de histórico" width="220" />
  <img src="./preview/profile.png" alt="Tela de perfil" width="220" />
</p>

## Status

- Splash animada, hero de boas-vindas, login e cadastro (contas reais na API)
- Onboarding de 23 etapas; as respostas ficam só no aparelho
- Registro de treino offline, com histórico, recordes e "o que está faltando"
- Treinos concluídos sobem sozinhos para a conta quando há internet
- Evolução: medidas com gráfico, foto do mês e comparador (só no aparelho)
- Desafios entre amigos: convite por link, placar de dias com treino
- Card compartilhável de recorde e de resumo da semana
- Painel de administração com o total de cadastros (o gatilho dos 200)
- Temas de cores: Flow, Meia-noite, Aurora e Brasa (tela Aparência)

O plano de produto e o registro de cada fase estão em [`22-estrategia.md`](22-estrategia.md).

## Tecnologias

- Expo SDK 54
- React 19
- React Native 0.81
- Expo Router
- TypeScript
- React Hook Form
- Zod
- Expo Vector Icons

## Estrutura

```txt
app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
    splash.tsx
    welcome.tsx
    login.tsx
    sign-up.tsx
  (app)/
    _layout.tsx
    home.tsx
    appearance.tsx

src/
  components/
    auth/
    brand/
    ui/
    visual/
  config/
  constants/
  db/          (banco local: expo-sqlite e fila de sincronização)
  services/
  theme/
  types/

preview/
  login.png
  sign-up.png
  home.png
  exercise.png
  history.png
  profile.png
```

## Instalação

Instale as dependências:

```powershell
npm install
```

## Execução

Iniciar o Expo:

```powershell
npm run start
```

Rodar no navegador:

```powershell
npm run web
```

Rodar no Android:

```powershell
npm run android
```

Rodar no iOS:

```powershell
npm run ios
```

## Qualidade

Rodar o lint:

```powershell
npm run lint
```

Checar TypeScript:

```powershell
npx tsc --noEmit
```

## API

O app precisa da API para cadastro, login, desafios e sincronização (o registro de treino funciona sem ela). Para rodar tudo em desenvolvimento:

1. Suba a API seguindo o README do repositório `gymflow-api` (Postgres local com `npx prisma dev`, sem Docker). Ele também explica a publicação na VPS.
2. Copie `.env.example` para `.env.local` na raiz e ajuste `EXPO_PUBLIC_API_URL`.
3. No emulador Android: `adb reverse tcp:3333 tcp:3333`. No celular, use o IP do computador na rede Wi-Fi.

As chamadas ficam em `src/services/` (`api.ts`, `auth.ts`, `sync.ts`, `challenges.ts`, `admin.ts`); as telas não fazem `fetch` direto. Em produção, o endereço vai em `app.json` (`expo.extra.apiUrl`).

## Próximos passos

- Publicar a API (hospedagem e banco) e apontar `apiUrl` para ela
- Restaurar treinos da conta num aparelho novo (a API já recebe; falta o app baixar)
- Consentimento específico para medidas e fotos subirem para a conta (LGPD)
- Recuperação de senha, e o botão de apagar a conta no app (a API já apaga)
- Amigos e check-in com foto nos desafios (Fase 3)
