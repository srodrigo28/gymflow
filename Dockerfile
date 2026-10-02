# syntax=docker/dockerfile:1

# A versão web do Gyn Flow (Expo, "npx expo export -p web") servida por nginx na raiz de um domínio.
# O que a hospedagem precisa fazer está em web/nginx.conf.template: os cabeçalhos COOP e COEP em toda
# resposta (sem eles o banco local do navegador não liga) e o index.html nas rotas do app.
#
#   docker build -t gynflow-web .
#   docker run --rm -p 8080:80 gynflow-web
#
# Argumentos de build:
#   EXPO_PUBLIC_API_URL  a API que o app chama (padrão: a de produção)
#
# O app fica na raiz do domínio. Num subcaminho (ex.: 99dev.pro/gynflow) o build pede
# experiments.baseUrl no app.json e o proxy na frente, e isso não foi testado.

FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_API_URL=https://99dev.pro/gymflow-api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL} \
    CI=1
RUN npx expo export -p web

FROM nginx:alpine AS runner

COPY --from=build /app/dist /usr/share/nginx/html

# O nginx oficial processa /etc/nginx/templates/*.template com o envsubst; o filtro é obrigatório,
# senão ele comeria o $uri e o $host da própria configuração.
ENV PORT=80 \
    NGINX_ENVSUBST_FILTER=PORT
COPY web/cross-origin.conf /etc/nginx/snippets/cross-origin.conf
COPY web/nginx.conf.template /etc/nginx/templates/default.conf.template
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
