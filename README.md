# Frontend - Gestión de Políticas de Negocio

Este es el módulo frontend del sistema de **Gestión de Políticas de Negocio**, desarrollado utilizando **Angular 18**, **Tailwind CSS** para los estilos y la librería **GoJS** para el editor gráfico e interactivo de diagramas y flujos de procesos.

---

## 🚀 Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado en tu computadora:

1. **Node.js**: Versión LTS recomendada (v18 o v20).
   * Puedes verificarlo ejecutando: `node -v`
2. **NPM**: Incluido automáticamente al instalar Node.js.
   * Puedes verificarlo ejecutando: `npm -v`
3. **Angular CLI** (Opcional, pero recomendado globalmente):
   * `npm install -g @angular/cli@18`

---

## 🛠️ Pasos para Levantar el Proyecto Localmente

Sigue estos pasos en tu terminal (dentro de la carpeta `politica-negocio-frontend`):

### 1. Instalar las dependencias
Descarga e instala todas las librerías necesarias ejecutando:
```bash
npm install
```

### 2. Configurar la URL de la API (Backend)
Si necesitas cambiar la dirección del backend de Spring Boot, edita el archivo:
* [src/app/core/services/api-config.ts](file:///c:/EDBERTO/ULT%20SEMESTRE/SW1/1ER%20parcial/SW1_PN_1_2026/politica-negocio-frontend/src/app/core/services/api-config.ts)
```typescript
export const BASE_URL = 'http://localhost:8081'; // URL del servidor Spring Boot
export const API_URL = `${BASE_URL}/api`;
```

### 3. Levantar el servidor de desarrollo
Ejecuta el siguiente comando para compilar el proyecto y levantar el servidor local:
```bash
npm start
```
*(También puedes usar el comando estándar de Angular: `ng serve`)*

Una vez completada la compilación:
* Abre tu navegador en la dirección: **`http://localhost:4200`**
* La aplicación se recargará automáticamente cada vez que realices y guardes cambios en el código.

---

## 📂 Estructura Principal del Proyecto

El frontend sigue una arquitectura limpia dividida en:
* **`core/`**: Servicios globales (`services/`), interceptores HTTP para enviar JWT, configuraciones generales y los guards de ruta para seguridad.
* **`features/`**: Contiene las pantallas y flujos de negocio organizados por módulos (ej: formularios, tareas, políticas, diagramas interactivos con GoJS).
* **`layout/`**: Componentes globales de interfaz (sidebar, barra de navegación superior, footer).

Para más detalles consulta la guía de [estructura-angular.md](./estructura-angular.md).

---

## 💻 Comandos Útiles

* **Generar nuevos componentes o servicios**:
  ```bash
  ng generate component features/mi-modulo/components/mi-componente
  ng generate service core/services/mi-servicio
  ```
* **Compilar para producción**:
  Genera la carpeta `dist/` optimizada para desplegar en producción:
  ```bash
  npm run build
  ```
