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
- Onboarding de até 26 telas (22 a 26, conforme as respostas); as respostas ficam só no aparelho
- Registro de treino offline, com histórico, recordes e "o que está faltando"
- Treinos concluídos sobem sozinhos para a conta quando há internet, e voltam sozinhos num aparelho novo
- Evolução: medidas com gráfico, foto do mês e comparador. Com consentimento específico (LGPD), as medidas ficam guardadas na conta e voltam num aparelho novo; as fotos continuam só no aparelho
- Desafios entre amigos: convite por link, placar de dias com treino
- Card compartilhável de recorde e de resumo da semana
- Painel de administração com o total de cadastros (o gatilho dos 200)
- Perfil: foto de capa, nome, peso, altura, objetivo, troca de senha e exclusão da conta
- Temas de cores: Flow, Dia (claro), Meia-noite, Aurora e Brasa (tela Aparência)
- Menu do perfil completo: sincronizar, alimentações diárias, alimentação ideal, escolhas de treinos, recomendações, conquistas e frase do dia
- Recuperação de senha e confirmação de e-mail por código; Termos de Uso e Política de Privacidade; questionário na conta com consentimento próprio
- Amigos, cards de sequência e do mês, recorde com card na hora, check-in na academia, câmera com guia de contorno e compartilhar fotos com tarja
- Notificações dos desafios (lembrete do dia e placar final) pelo Expo Push: o aparelho se registra ao abrir um desafio; chegam num development build ou no app da loja, não no Expo Go
- Liga e temporada (Fase 4): XP e nível, meta da semana, ligas semanais Bronze, Prata, Ouro e Elite, temporada do mês entre amigos por categoria, força relativa por DOTS com consentimento, check-in verificado na conta e troféus e selos
- API publicada em `https://99dev.pro/gymflow-api`, com a documentação das rotas em https://99dev.pro/gymflow-api/doc
- App validado contra a API publicada no emulador Android (24/09): cadastro, consentimento e medida, treino com recorde, desafio com convite e exclusão da conta

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

O app precisa da API para cadastro, login, desafios e sincronização (o registro de treino funciona sem ela).

### Em produção

| O quê | Endereço |
| --- | --- |
| API (base de todas as rotas) | https://99dev.pro/gymflow-api |
| Documentação das rotas (Swagger) | https://99dev.pro/gymflow-api/doc |
| A mesma documentação em OpenAPI 3.1, para o Postman ou o Insomnia | https://99dev.pro/gymflow-api/openapi.json |
| Saúde da API e do banco | https://99dev.pro/gymflow-api/health (responde `{"ok":true}`) |
| Código da API | https://github.com/srodrigo28/gymflow-api |

A raiz da API responde 404 de propósito: ela não tem rota ali, só em `/health`, `/auth/...`, `/me` e as demais. `/healthz` responde igual ao `/health`: é o endereço que o painel 99dev testa depois de cada deploy, então a sonda também confere o banco (veja o guia de deploy no repositório da API). Os links de convite dos desafios saem como `https://99dev.pro/gymflow-api/c/<código>`.

A documentação lista todas as rotas, com corpos, respostas e erros. O endereço é `/doc`, sem barra no fim (`/doc/` dá 404). O botão **Authorize** recebe o token que `POST /auth/sign-in` devolve, e o **Try it out** chama a produção de verdade: um cadastro feito ali é uma conta real e entra no total do painel de administração (o gatilho dos 200). Para testar criando dados, use a documentação da API local, em `http://localhost:3333/doc`.

O app usa a API publicada quando não há `.env.local`: o endereço fica em `app.json` (`expo.extra.apiUrl`).

### Em desenvolvimento

1. Suba a API seguindo o README do repositório `gymflow-api` (Postgres local com `npx prisma dev`, sem Docker). Ele também explica a publicação na VPS.
2. Copie `.env.example` para `.env.local` na raiz e ajuste `EXPO_PUBLIC_API_URL`.
3. No emulador Android: `adb reverse tcp:3333 tcp:3333`. No celular, use o IP do computador na rede Wi-Fi.

Com `.env.local`, o app usa o endereço dele em vez do publicado. As chamadas ficam em `src/services/` (`api.ts`, `auth.ts`, `sync.ts`, `challenges.ts`, `admin.ts`); as telas não fazem `fetch` direto.

## Próximos passos

- Testar num celular físico e no iPhone (no emulador Android já foi)
- Fotos de evolução na conta, com o mesmo consentimento específico das medidas (precisam de armazenamento privado com URL assinada)
- Configurar SMTP e SUPPORT_EMAIL na VPS (libera recuperação de senha, confirmação de e-mail e o alerta da sonda em produção)
- Check-in com foto nos desafios (Fase 3) e um development build para ver as notificações chegando
- Fase 4: pontualidade, modalidade e equilíbrio na temporada e os escudos da sequência; Fase 5: personal e academia
- Build de loja (EAS), depois das funções acima
