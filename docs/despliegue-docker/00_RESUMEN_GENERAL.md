# Despliegue Frontend (Angular + Nginx) con Docker — Resumen General

Esta guía describe cómo empaquetar y desplegar el frontend de **Angular** en producción usando **Docker** y **Nginx** de manera modular y escalable.

---

## 📋 Flujo General de Despliegue

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CONFIGURAR ARCHIVOS DEL PROYECTO                                 │
│    nginx.conf, Dockerfile, docker-compose.yml                       │
│                              ↓                                      │
│ 2. DESPLEGAR Y VERIFICAR                                            │
│    Construir la imagen multi-stage, levantar el contenedor y logs   │
│                              ↓                                      │
│ 3. APAGAR SERVICIOS                                                 │
│    Detener contenedores y liberar recursos en disco                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de esta Guía

| Archivo | Contenido |
|---|---|
| `00_RESUMEN_GENERAL.md` | **Este archivo.** Flujo general y estructura de la documentación. |
| `01_CONFIGURAR_PROYECTO.md` | Archivos de Configuración Requeridos (`nginx.conf`, `Dockerfile`, `docker-compose.yml`). |
| `02_DESPLEGAR_Y_VERIFICAR.md` | Construir la imagen, levantar el contenedor web, configurar API y validar ruteo SPA. |
| `03_APAGAR_SERVICIOS.md` | Detener el contenedor del frontend y limpiar espacio ocupado por imágenes Docker antiguas. |

---

> **Siguiente paso:** Continúa con [01_CONFIGURAR_PROYECTO.md](./01_CONFIGURAR_PROYECTO.md)
