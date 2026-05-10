# Plano: Splash, animações e transições

## Objetivo

Melhorar a percepção de qualidade do fluxo inicial do app com:

1. Splash animada com duração total de 10 segundos.
2. Transições suaves entre splash, login, cadastro e home.
3. Microinterações nos formulários.
4. Validação consistente dos campos com Zod.

## Bibliotecas

Não é necessário instalar novas bibliotecas neste momento.

O projeto já possui o necessário:

- `react-native-reanimated`: animações de entrada, saída, opacidade, escala, progresso e microinterações.
- `expo-router`: transições de navegação via Stack.
- `expo-splash-screen`: controle da splash nativa do Expo.
- `react-hook-form`: controle dos formulários.
- `zod`: validação dos schemas de login e cadastro.
- `@hookform/resolvers`: integração entre React Hook Form e Zod.

Referências:

- Expo Router Stack: https://docs.expo.dev/router/advanced/stack/
- Expo SplashScreen: https://docs.expo.dev/versions/latest/sdk/splash-screen/
- React Native Reanimated Entering/Exiting: https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/

## Estratégia de splash

Usar duas camadas:

1. Splash nativa do Expo:
   - Continua sendo a tela inicial técnica, usada enquanto o app carrega.
   - Deve ser curta e controlada para evitar tela branca.

2. Splash animada React Native:
   - Tela `app/(auth)/splash.tsx`.
   - Duração visual de 10 segundos.
   - Após a animação, redireciona para `/(auth)/login`.

Importante: os 10 segundos devem ficar na splash React Native, não segurando a splash nativa do Expo por 10 segundos. Assim conseguimos animar elementos e manter controle visual.

## Roteiro da animação de 10 segundos

Tempo sugerido:

```txt
0.0s - 1.0s    Fade in do fundo e marca
1.0s - 2.4s    Ícone entra com scale e leve bounce
2.4s - 4.0s    Nome Ignite Gym aparece com fade/slide
4.0s - 5.5s    Subtítulo aparece
5.5s - 8.5s    Barra ou anel de progresso animado
8.5s - 10.0s   Fade out geral e navegação para login
```

Elementos:

- Ícone de halter.
- Título `Ignite Gym`.
- Subtítulo `Treine sua mente e o seu corpo`.
- Indicador de carregamento minimalista.

## Transições de telas

Configurar o Stack de autenticação em `app/(auth)/_layout.tsx`:

- Splash para login: fade.
- Login para cadastro: slide horizontal.
- Cadastro para login: slide horizontal reverso quando possível.
- Auth para home: fade ou slide suave.

Opção inicial:

```tsx
<Stack
  screenOptions={{
    headerShown: false,
    animation: 'fade_from_bottom',
    animationDuration: 280,
  }}
/>
```

Se o Expo Router/React Navigation não entregar a experiência desejada no web, complementar com animações internas usando Reanimated nos containers das telas.

## Microinterações

### Inputs

Já existe foco com animação no `Input`.

Melhorias propostas:

- Borda verde com glow discreto no foco.
- Borda vermelha animada quando houver erro.
- Mensagem de erro com fade in.
- Ícone de senha com troca suave.

### Botões

Melhorias propostas:

- Press feedback com scale `0.98`.
- Loading mantendo altura fixa.
- Estado disabled com opacidade.
- Pequena animação de entrada junto ao formulário.

### Formulários

Adicionar animação de entrada por blocos:

- Header entra primeiro.
- Título entra depois.
- Inputs entram com delay em cascata.
- Botões entram por último.

## Validação com Zod

Já existe validação com Zod em:

- `app/(auth)/login.tsx`
- `app/(auth)/sign-up.tsx`

Melhorias propostas:

### Login

Regras:

- `email`: obrigatório e formato válido.
- `password`: obrigatório.

Mensagens sugeridas:

- `Informe seu e-mail.`
- `Informe um e-mail válido.`
- `Informe sua senha.`

### Cadastro

Regras:

- `name`: mínimo de 2 caracteres.
- `email`: obrigatório e formato válido.
- `password`: mínimo de 6 caracteres.
- `passwordConfirmation`: obrigatório.
- confirmação igual à senha.

Melhorias futuras:

- Força mínima de senha.
- Bloqueio de espaços no início/fim com `trim`.
- Normalização de e-mail com lowercase antes de chamar API.

## Ordem de implementação

1. Criar componente `AnimatedAuthContent` para entrada em cascata das telas.
2. Melhorar `Button` com animação de press usando Reanimated.
3. Melhorar `Input` com erro animado e foco refinado.
4. Refatorar `splash.tsx` para animação de 10 segundos.
5. Configurar transições no `app/(auth)/_layout.tsx`.
6. Configurar transição para `app/(app)/home`.
7. Revisar schemas Zod e normalização dos dados.
8. Rodar `npm run lint` e `npx tsc --noEmit`.

## Critérios de aceite

- Splash fica visível por 10 segundos.
- Animação não trava o app.
- Login e cadastro têm transições suaves.
- Foco dos inputs permanece verde/escuro, sem branco ou amarelo no web.
- Mensagens de erro aparecem de forma clara.
- Validação Zod continua funcionando.
- Nenhuma biblioteca nova é instalada sem necessidade.
