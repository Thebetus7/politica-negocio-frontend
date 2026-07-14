# Paso 3: Detener Servicios y Mantenimiento de Docker

En este paso explicamos cómo apagar el servicio web del frontend y limpiar recursos en disco cuando actualices tu aplicación.

---

## 3.1 — Detener los Contenedores

Si necesitas detener temporalmente la aplicación frontend para liberar recursos del servidor o realizar mantenimiento, navega a la raíz del proyecto y ejecuta:

```bash
docker-compose down
```

Este comando detendrá el contenedor `politica_frontend` y removerá la red virtual de Docker asociada a este servicio. **Los archivos compilados dentro de la imagen no se pierden**, ya que volverán a estar activos cuando ejecutes `docker-compose up -d` nuevamente.

---

## 3.2 — Mantenimiento: Limpiar espacio en disco

Al utilizar construcciones multi-stage (Node.js para compilar y Nginx para servir), Docker crea imágenes temporales intermedias llamadas "imágenes huérfanas" o *dangling images*. Con el tiempo, cada vez que reconstruyas la aplicación con `--build`, estas imágenes consumirán espacio innecesario en disco.

Para liberar este espacio de forma segura en tu servidor, ejecuta:

```bash
docker system prune -f
```

Este comando eliminará:
* Todos los contenedores detenidos.
* Todas las redes creadas por Docker que no estén en uso.
* Todas las imágenes intermedias colgantes/huérfanas (*dangling*).

*(No te preocupes, este comando no borrará tu imagen activa del frontend ni afectará a los servicios que estén corriendo en ese momento).*

---

> **Volver al índice:** [00_RESUMEN_GENERAL.md](./00_RESUMEN_GENERAL.md)
