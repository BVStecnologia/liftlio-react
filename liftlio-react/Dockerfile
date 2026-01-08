# Use pre-built local build folder instead of building inside container
# This ensures the exact local build (with fixes) is deployed
# Cache bust: 2026-01-08 v7 - use local build for blog fix

FROM nginx:alpine

# Copy pre-built React app from local build folder
COPY build /usr/share/nginx/html
COPY build/landing-page.html /usr/share/nginx/html/landing-page.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
