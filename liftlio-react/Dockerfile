FROM node:20 as build
WORKDIR /app

# Declarar ARGs para pegar secrets do Fly.io durante o build
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY

# Tornar disponíveis como ENV durante o build
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Copiar a landing page HTML da pasta build (já processada pelo React build)
COPY --from=build /app/build/landing-page.html /usr/share/nginx/html/landing-page.html
# Manter o index.html original do React para as rotas funcionarem
# Vamos usar o nginx para servir landing.html na rota raiz
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
