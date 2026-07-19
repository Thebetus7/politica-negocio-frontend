# --- ETAPA 1: Construcción (Node.js) ---
FROM node:18-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias y descargarlas en caché
COPY package*.json ./
RUN npm install

# Copiar todo el código del frontend
COPY . .

# Compilar la aplicación para producción
RUN npm run build -- --configuration production

# --- ETAPA 2: Ejecución (Nginx) ---
FROM nginx:1.25-alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos compilados desde la etapa 1
# NOTA: Asegúrate de que la ruta coincide con tu angular.json (dist/politica-negocio-frontend/browser)
COPY --from=build /app/dist/politica-negocio-frontend/browser /usr/share/nginx/html

# Exponer el puerto del servidor Nginx
EXPOSE 80

# Iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]