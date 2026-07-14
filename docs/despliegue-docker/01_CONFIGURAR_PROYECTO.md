# Paso 1: Archivos de Configuración Requeridos en tu Proyecto

Para habilitar Docker en tu proyecto frontend, debes asegurarte de tener los siguientes tres archivos en la raíz de tu carpeta `politica-negocio-frontend/`:

---

### 📄 `nginx.conf`
Este archivo en la raíz del frontend configura el servidor Nginx para servir los archivos estáticos de la aplicación Angular y capturar todas las rutas de la Single Page Application (SPA), redirigiéndolas a `index.html` para evitar errores 404:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        # Redirecciona cualquier ruta no encontrada físicamente a index.html
        # Esto permite que el enrutador de Angular tome el control de la URL
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

### 📄 `Dockerfile`
Este archivo en la raíz del frontend define cómo compilar el proyecto Angular y cómo empaquetarlo en una imagen ligera de Nginx:

```dockerfile
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
```

---

### 📄 `docker-compose.yml`
Este archivo orquesta el contenedor web del frontend en el puerto deseado:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: politica_frontend
    restart: always
    ports:
      # Expone el puerto 4200 del host apuntando al puerto 80 de Nginx interno
      - "4200:80"
```

---

> **Siguiente paso:** [02_DESPLEGAR_Y_VERIFICAR.md](./02_DESPLEGAR_Y_VERIFICAR.md)  
> **Volver al índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)
