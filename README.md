# Plano inicial: Splash, Login e Cadastro

## Objetivo

Preparar o projeto Expo/React Native para iniciar o app Gym Flow com uma base limpa, modular e pronta para consumo de API, começando pela sequência:

1. Splash
2. Login
3. Cadastro

O foco inicial será entregar telas bem acabadas, reaproveitando a direção visual do diretório `preview`, removendo o que veio do template e criando uma estrutura simples de evoluir.

## Preview

<img src="./preview/login.png" alt="" />
<img src="./preview/sign-up.png" alt="" />

## Referências analisadas

Arquivos em `preview/`:

- `login.png`: tela de autenticação com imagem de academia em fundo, overlay escuro, marca "Ignite Gym", CTA verde, campos de e-mail/senha e link para criação de conta.
- `sign-up.png`: mesma identidade do login, com campos de nome, e-mail, senha e confirmação de senha.
- `home.png`, `history.png`, `exercise.png`, `profile.png`: indicam a identidade futura do app pós-login: fundo escuro, cards cinza, destaque verde, navegação inferior e foco em treino/exercícios.

## Estado atual do projeto

O projeto ainda está próximo do template padrão do Expo Router:

- Rotas de exemplo em `app/(tabs)/index.tsx` e `app/(tabs)/explore.tsx`.
- Modal de exemplo em `app/modal.tsx`.
- Componentes de template em `components/hello-wave.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`, `themed-view.tsx`, `external-link.tsx` e `components/ui/*`.
- Assets padrão do React/Expo em `assets/images/react-logo*`, `partial-react-logo.png` e ícones padrão.
- `README.md` com texto de instalação, mas com caracteres quebrados de encoding.

Esses itens devem ser limpos ou substituídos por uma base própria do Gym Flow.

## Direção visual

Base visual para as primeiras telas:

- Tema principal escuro.
- Fundo preto ou quase preto: `#121214` / `#111113`.
- Superfícies: `#202024` / `#29292E`.
- Texto principal branco: `#FFFFFF`.
- Texto secundário cinza: `#C4C4CC` / `#A9A9B2`.
- Ação principal verde: `#00875F` ou `#00B37E`.
- Campos com fundo escuro, altura generosa e cantos levemente arredondados.
- Marca no topo com ícone de halter e texto `Ignite Gym` ou nome definitivo do app.
- Imagem de fundo no fluxo de autenticação com overlay escuro para preservar contraste.

## Estrutura proposta

Criar uma estrutura focada em telas, componentes e serviços:

```txt
app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
    splash.tsx
    login.tsx
    sign-up.tsx
  (app)/
    _layout.tsx
    home.tsx

src/
  assets/
  components/
    auth/
      AuthBackground.tsx
      BrandHeader.tsx
    ui/
      Button.tsx
      Input.tsx
      Screen.tsx
  config/
    env.ts
  constants/
    colors.ts
    spacing.ts
  services/
    api.ts
    auth.ts
  types/
    auth.ts
  utils/
```

Observação: se preferirmos manter `components/` e `constants/` na raiz, podemos fazer isso, mas o ideal é padronizar antes de começar as telas.

## Limpeza inicial

Remover ou substituir:

- `app/(tabs)/index.tsx`
- `app/(tabs)/explore.tsx`
- `app/(tabs)/_layout.tsx`
- `app/modal.tsx`
- Componentes de exemplo não usados:
  - `components/hello-wave.tsx`
  - `components/parallax-scroll-view.tsx`
  - `components/external-link.tsx`
  - `components/themed-text.tsx`
  - `components/themed-view.tsx`
  - `components/ui/collapsible.tsx`
  - `components/ui/icon-symbol.tsx`
  - `components/ui/icon-symbol.ios.tsx`
  - `components/haptic-tab.tsx`
- Assets padrão do React/Expo que não serão usados:
  - `assets/images/react-logo.png`
  - `assets/images/react-logo@2x.png`
  - `assets/images/react-logo@3x.png`
  - `assets/images/partial-react-logo.png`

Manter por enquanto:

- `app.json`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `eslint.config.js`
- `assets/images/icon.png`
- `assets/images/splash-icon.png`
- `assets/images/favicon.png`
- ícones Android configurados em `assets/images/`
- `preview/` como referência visual temporária

## Dependências recomendadas

Instalar para formulários e validação:

```powershell
npm i react-hook-form zod @hookform/resolvers
```

Avaliar instalar quando necessário:

```powershell
npx expo install expo-secure-store
```

Uso previsto:

- `react-hook-form`: estado dos formulários.
- `zod`: validação de login e cadastro.
- `@hookform/resolvers`: integração entre formulário e validação.
- `expo-secure-store`: persistência segura de token quando a API real entrar.

## Preparação para API

Criar uma camada simples e substituível:

```txt
src/services/api.ts
src/services/auth.ts
src/config/env.ts
src/types/auth.ts
```

Responsabilidades:

- `api.ts`: cliente HTTP centralizado com `baseURL`, headers e tratamento básico de erro.
- `auth.ts`: funções `signIn`, `signUp`, `signOut` e futura recuperação de sessão.
- `env.ts`: leitura da URL da API via configuração.
- `types/auth.ts`: tipos de payload e resposta da autenticação.

Exemplo de contrato inicial:

```ts
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

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};
```

Enquanto a API real não existir, usar mocks controlados dentro de `auth.ts`, sem espalhar dados falsos pelas telas.

## Fluxo de navegação

Rota inicial:

- `app/index.tsx` redireciona para `/(auth)/splash`.

Fluxo esperado:

```txt
splash -> login -> sign-up
              \-> app/home após autenticação
```

Splash:

- Carrega identidade visual.
- Faz checagem futura de token/sessão.
- Enquanto não houver autenticação real, redireciona para login depois de um pequeno delay.

Login:

- E-mail.
- Senha.
- Botão `Acessar`.
- Link `Criar conta`.
- Validação local antes de chamar `auth.signIn`.
- Estados de loading, erro e campo inválido.

Cadastro:

- Nome.
- E-mail.
- Senha.
- Confirmar senha.
- Botão `Criar e acessar`.
- Link `Voltar para o login`.
- Validação de senha e confirmação.
- Estados de loading, erro e campo inválido.

## Componentes iniciais

Criar componentes reutilizáveis:

- `Screen`: wrapper com `SafeAreaView`, background e padding padrão.
- `AuthBackground`: imagem de fundo com overlay escuro para splash/login/cadastro.
- `BrandHeader`: ícone + nome + subtítulo.
- `Button`: variantes `primary` e `outline`.
- `Input`: campo controlado com label opcional, erro, senha visível/oculta quando aplicável.

Critérios:

- Componentes sem regra de negócio.
- Telas chamam serviços de API, não fazem `fetch` direto.
- Estilos centralizados por tokens de cor e espaçamento.
- Layout responsivo para Android, iOS e web.

## Checklist de execução

1. Criar tokens de tema em `src/constants/colors.ts` e `src/constants/spacing.ts`.
2. Criar estrutura `src/components`, `src/services`, `src/config` e `src/types`.
3. Limpar rotas e componentes do template Expo.
4. Criar rotas `splash`, `login` e `sign-up`.
5. Implementar `Screen`, `AuthBackground`, `BrandHeader`, `Button` e `Input`.
6. Configurar validação com `react-hook-form` e `zod`.
7. Criar `api.ts` e `auth.ts` com mocks temporários.
8. Conectar login e cadastro aos serviços de autenticação.
9. Configurar redirecionamento pós-login para `/(app)/home`.
10. Criar uma `home` mínima apenas para confirmar o fluxo autenticado.
11. Rodar `npm run lint`.
12. Rodar `npm run web` ou `npm run start` para validar visualmente.

## Pendências de decisão

- Nome final da marca: manter `Ignite Gym` das referências ou trocar para `Gym Flow`.
- Imagem final de fundo do auth: usar asset próprio, gerar imagem nova ou incorporar uma imagem licenciada.
- API real: definir `baseURL`, endpoints e formato final de resposta.
- Persistência de sessão: confirmar uso de `expo-secure-store`.

## Primeiro incremento recomendado

Começar pelo incremento abaixo:

1. Limpar o template.
2. Criar a arquitetura base.
3. Implementar Splash, Login e Cadastro com mock de API.
4. Validar navegação e estados de formulário.

Depois disso, o projeto já estará pronto para trocar o mock pela API real sem refatorar as telas.
