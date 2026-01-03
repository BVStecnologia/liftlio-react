FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Cache bust: 2026-01-03 v3 - sitemap fix
RUN echo "Build timestamp: $(date)"

# Declare build arguments from fly.toml
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ARG REACT_APP_BROWSER_ORCHESTRATOR_URL
ARG REACT_APP_BROWSER_MCP_API_KEY
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_GOOGLE_CLIENT_SECRET

# Set as environment variables for React build process
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_BROWSER_ORCHESTRATOR_URL=$REACT_APP_BROWSER_ORCHESTRATOR_URL
ENV REACT_APP_BROWSER_MCP_API_KEY=$REACT_APP_BROWSER_MCP_API_KEY
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_GOOGLE_CLIENT_SECRET=$REACT_APP_GOOGLE_CLIENT_SECRET

RUN npm run build

# NOTE: Static blog HTML generation removed - React SPA handles /blog routes dynamically
# The generate-static-blog.js script was creating files that overrode React routing

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /app/build/landing-page.html /usr/share/nginx/html/landing-page.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
