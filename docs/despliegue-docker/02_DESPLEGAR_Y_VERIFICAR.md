# Paso 2: Construir, Desplegar y Verificar el Frontend

Una vez que tengas creados los archivos `nginx.conf`, `Dockerfile` y `docker-compose.yml` en la raíz de tu proyecto, sigue estos pasos para levantar la aplicación en producción.

---

## 2.1 — Configurar el Endpoint del Backend

Antes de compilar la imagen de producción, debes asegurarte de que tu frontend apunte a la dirección correcta del servidor API:

1. Ve a la carpeta `src/environments/` de tu frontend.
2. Abre el archivo de configuración de producción (ej. `environment.prod.ts`).
3. Reemplaza el endpoint de desarrollo por tu URL de API de producción (ej. `http://IP_PUBLICA_EC2:8081` o `https://api.tuapp.com`).

---

## 2.2 — Construir y Levantar el Contenedor

Desde tu terminal (ya sea localmente o dentro de tu servidor conectado por SSH), navega a la carpeta del proyecto y ejecuta el siguiente comando:

```bash
docker-compose up -d --build
```

**Qué hace cada flag:**
* `up` -> Crea e inicia los contenedores.
* `-d` -> Corre el contenedor en segundo plano (detached mode).
* `--build` -> Fuerza la reconstrucción de la imagen Docker utilizando el código más actual del directorio.

---

## 2.3 — Verificar el Estado del Despliegue

### 1. Confirmar que el contenedor está activo:
```bash
docker-compose ps
```
Deberías ver `politica_frontend` listado con el estado `Up` en el puerto `0.0.0.0:4200->80/tcp`.

### 2. Monitorear logs de Nginx:
Para ver las peticiones que llegan al servidor y posibles errores de compilación u otros fallos:
```bash
docker-compose logs -f frontend
```

---

## 2.4 — Probar la SPA y Solución de Problemas

1. Abre tu navegador e ingresa a `http://localhost:4200` (o a tu dominio/IP pública si estás en el servidor).
2. **Prueba el routing de Angular:** Navega a cualquier ruta interna (ej. `/dashboard`, `/politicas`).
3. **Prueba la actualización (F5):** Con la ruta interna abierta, presiona F5 en el teclado. La página debe recargarse con total normalidad.
   * *Si Nginx te arroja una página con error `404 Not Found`, revisa que tu archivo `nginx.conf` se esté copiando correctamente en el `Dockerfile` a la ruta de configuración de Nginx: `/etc/nginx/conf.d/default.conf`.*

---

> **Siguiente paso:** [03_APAGAR_SERVICIOS.md](./03_APAGAR_SERVICIOS.md)  
> **Volver al índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)
