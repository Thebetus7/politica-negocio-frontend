
---

## 📁 Estructura de carpetas (con ejemplos)

```
src/
├── app/
│   ├── core/                              # Servicios globales, guards e interceptores
│   │   ├── guards/
│   │   │   ├── auth.guard.ts              # Protege rutas que requieren autenticación
│   │   │   └── role.guard.ts              # Restringe acceso según rol (admin, user)
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts        # Agrega token JWT a las peticiones HTTP
│   │   │   └── error.interceptor.ts       # Maneja errores globales (401, 500)
│   │   ├── services/
│   │   │   ├── api.service.ts             # Cliente HTTP base con URL de backend
│   │   │   ├── auth.service.ts            # Login, logout, refresh token
│   │   │   └── toast.service.ts           # Servicio para notificaciones (éxito/error)
│   │   └── core.module.ts                 # (opcional) Exporta los servicios globales
│   │
│   ├── shared/                            # Componentes reutilizables sin lógica de negocio
│   │   ├── components/
│   │   │   ├── button/
│   │   │   │   ├── button.component.ts
│   │   │   │   ├── button.component.html
│   │   │   │   └── button.component.css
│   │   │   ├── modal/
│   │   │   │   └── modal.component.ts
│   │   │   └── card/
│   │   │       └── card.component.ts
│   │   ├── directives/
│   │   │   └── highlight.directive.ts     # Resalta elementos en hover
│   │   ├── pipes/
│   │   │   ├── filter.pipe.ts             # Filtra arrays por texto
│   │   │   └── sort.pipe.ts               # Ordena listas por campo
│   │   └── shared.module.ts               # Exporta todo lo de shared para usar en features
│   │
│   ├── features/                          # Módulos funcionales (cada uno es independiente)
│   │   │
│   │   ├── auth/                          # Módulo de autenticación
│   │   │   ├── login/
│   │   │   │   ├── login.component.ts
│   │   │   │   ├── login.component.html
│   │   │   │   └── login.component.css
│   │   │   ├── register/
│   │   │   │   ├── register.component.ts
│   │   │   │   └── register.component.html
│   │   │   ├── auth.service.ts            # Servicio específico de auth (llamadas API)
│   │   │   └── auth-routing.module.ts     # Rutas hijas: /login, /register
│   │   │
│   │   ├── dashboard/                     # Panel principal
│   │   │   ├── dashboard.component.ts
│   │   │   ├── dashboard.component.html
│   │   │   ├── dashboard.service.ts       # Estadísticas, resúmenes
│   │   │   └── dashboard-routing.module.ts
│   │   │
│   │   └── politicas/                     # Gestión de políticas (ejemplo de CRUD)
│   │       ├── politicas-list/
│   │       │   ├── politicas-list.component.ts   # Tabla con todas las políticas
│   │       │   └── politicas-list.component.html
│   │       ├── politica-form/
│   │       │   ├── politica-form.component.ts    # Formulario crear/editar
│   │       │   └── politica-form.component.html
│   │       ├── politica-detail/
│   │       │   ├── politica-detail.component.ts  # Vista detallada
│   │       │   └── politica-detail.component.html
│   │       ├── politica.service.ts               # CRUD hacia API (get, post, put, delete)
│   │       ├── models/
│   │       │   └── politica.interface.ts         # Interfaz de Política (id, nombre, descripción)
│   │       └── politicas-routing.module.ts
│   │
│   ├── layout/                            # Componentes estructurales (opcional)
│   │   ├── header/
│   │   │   ├── header.component.ts        # Barra de navegación, logout, avatar
│   │   │   └── header.component.html
│   │   ├── footer/
│   │   │   └── footer.component.ts
│   │   └── layout.module.ts
│   │
│   ├── app.component.ts                   # Componente raíz (suele solo tener <router-outlet>)
│   ├── app.component.html
│   ├── app.component.css
│   ├── app.config.ts                      # Configuración global (providers, hydration) si usas standalone
│   └── app.routes.ts                      # Rutas principales con lazy loading:
│                                          #   { path: 'auth', loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule) }
│                                          #   { path: 'dashboard', loadChildren: ... }
│                                          #   { path: 'politicas', loadChildren: ... }
│
├── assets/                                # Imágenes, fuentes, íconos
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── environments/                          # Configuración por entorno
│   ├── environment.ts                     # API_URL = 'http://localhost:3000/api'
│   └── environment.prod.ts                # API_URL = 'https://api.midominio.com/api'
│
├── styles/                                # Estilos globales
│   ├── _variables.css                     # Colores, fuentes, breakpoints
│   ├── _global.css                        # Reset, clases base
│   └── styles.css                         # Importa todo lo anterior
│
├── index.html
├── main.ts
└── ...
```

---

## 🧠 Contexto: ¿Por qué esta estructura? (para enviar a una IA)

Este es el **prompt de contexto** que puedes darle a una IA para que entienda cómo organizar carpetas en un proyecto Angular pequeño/mediano:

---

### Contexto de organización de carpetas para Angular (tamaño pequeño/mediano)

**Principios fundamentales:**

1. **Separación por responsabilidad**  
   - `core/`: Servicios e infraestructura que se usan en toda la aplicación y se instancian una sola vez (singletons). Aquí van guards, interceptores, servicios de autenticación, API base, notificaciones, etc.  
   - `shared/`: Componentes, directivas y pipes **puramente reutilizables** que no contienen lógica de negocio (ej. botones, modales, tarjetas, pipes de filtrado). Pueden usarse en cualquier módulo sin causar dependencias circulares.  
   - `features/`: Cada carpeta dentro de `features` representa un módulo funcional independiente (ej. `auth`, `dashboard`, `politicas`). Cada módulo contiene sus propias páginas (componentes de ruta), servicios específicos, modelos/interfaces y su propio archivo de rutas.  
   - `layout/` (opcional): Componentes estructurales como header, footer, sidebar. Si la aplicación es muy pequeña, puedes poner header y footer directamente en `app.component.html` sin módulo separado.

2. **Lazy loading por defecto**  
   Cada módulo de `features/` debe cargarse mediante lazy loading desde `app.routes.ts`. Esto mejora el rendimiento inicial.

3. **Standalone vs NgModules**  
   Para proyectos pequeños/medianos se recomienda usar **standalone components** (Angular 14+). En ese caso, `core.module.ts` y `shared.module.ts` no son necesarios; en su lugar, los servicios se declaran con `providedIn: 'root'` y los componentes standalone se importan directamente. La estructura de carpetas se mantiene igual, solo cambia la forma de declarar módulos.

4. **Organización dentro de cada feature**  
   - Los componentes de vista (páginas) se colocan directamente dentro de la carpeta del feature, con nombres descriptivos (ej. `login.component.ts`, `politicas-list.component.ts`). No se necesita subcarpeta `pages/` a menos que el feature tenga muchos componentes (más de 5-6).  
   - Los servicios específicos del feature van en el mismo nivel (ej. `auth.service.ts`, `politica.service.ts`).  
   - Los modelos/interfaces se guardan en una subcarpeta `models/` si son varios; si solo es uno o dos, pueden ir en el mismo archivo del servicio.

5. **Estilos globales y assets**  
   - `styles/` contiene variables y resets CSS/SCSS globales.  
   - Los estilos específicos de cada componente van en su propio archivo `.css` o `.scss`.  
   - `assets/` para archivos estáticos (imágenes, fuentes, íconos).

6. **Configuración por entorno**  
   Usar `environments/` para guardar variables como `API_URL`, claves públicas, etc. Esto permite compilar para desarrollo, producción o staging sin modificar el código.

**Reglas que debe seguir la IA al generar código o sugerir rutas:**  
- No mezcles lógica de negocio en `shared/`.  
- No pongas componentes de un feature dentro de `core/`.  
- Usa lazy loading en todas las rutas de features.  
- Los servicios que son globales (auth, api, toast) van en `core/services/`.  
- Los servicios que solo usa un feature van dentro de la carpeta de ese feature.  
- Al crear un nuevo módulo/feature, genera automáticamente su archivo de rutas (`<feature>-routing.module.ts`) y regístralo en `app.routes.ts` con `loadChildren`.  

**Ejemplo de flujo para la IA:**  
Si el usuario pide "crear un módulo de productos", la IA debe:  
1. Crear carpeta `features/productos/`.  
2. Dentro: `productos-list.component`, `producto-form.component`, `producto.service.ts`, `productos-routing.module.ts` y un `productos.module.ts` (o standalone).  
3. Agregar la ruta en `app.routes.ts` apuntando a `./features/productos/productos.module#ProductosModule`.  

