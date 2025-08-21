FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Copiar a landing page HTML atualizada (fix scroll smooth)
COPY --from=build /app/public/landing-page.html /usr/share/nginx/html/landing-page.html
# Manter o index.html original do React para as rotas funcionarem
# Vamos usar o nginx para servir landing.html na rota raiz
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]