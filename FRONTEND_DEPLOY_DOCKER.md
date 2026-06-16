# Despliegue Frontend (Angular) en AWS - CON DOCKER

Aquí delegamos absolutamente todo a Docker. Docker va a descargar Node.js internamente, compilar Angular, y luego meterlo en un servidor Nginx, todo dentro de una misma "caja" o Contenedor de Linux, sin que tengas que instalar Node.js ni Nginx en el servidor real. Usaremos **Amazon Linux 2023** en tu instancia EC2.

## 1. Crear el Servidor EC2 (Consola Web de AWS)
Sigue esta configuración paso a paso en el asistente de creación de instancias de AWS:

1. **Nombre y etiquetas:** Ponle un nombre identificativo (ej. `politica-frontend-docker`).
2. **Aplicación e imagen de sistema operativo (AMI):** Selecciona **Amazon Linux 2023 AMI** (es apto para la capa gratuita).
3. **Tipo de instancia:** Selecciona `t2.micro` (o `t3.micro` según tu región) para mantenerte dentro del límite gratuito.
4. **Par de claves (inicio de sesión):**
   * Haz clic en **"Crear un nuevo par de claves"** (si no tienes una).
   * Llámalo `politica-negocio-front-key`.
   * Tipo de clave: **RSA**. Formato: **`.pem`**.
   * Presiona **Crear**. En ese preciso momento, tu navegador descargará el archivo `politica-negocio-front-key.pem` a tu computadora. **¡Guárdalo bien!** Es el único momento donde AWS te lo dará.
   > **💡 Buena Práctica de Seguridad:** Observa que nombramos esta llave `politica-negocio-front-key`, distinta a la del backend (`politica-negocio-key`). En producción, la mejor práctica es generar llaves independientes para cada máquina. Así, si una llave se llegara a ver comprometida, tu otro servidor seguiría estando 100% seguro.
5. **Configuraciones de red:**
   * Deja la red por defecto.
   * **Asignación automática de IP pública:** Asegúrate de que esté configurado en **"Habilitar"**.
   * **Firewall (grupos de seguridad):** Selecciona **"Crear un grupo de seguridad"**.
   * En la sección de **Reglas de grupos de seguridad de entrada**, verás que ya existe la "Regla del grupo de seguridad 1" configurada para **SSH** (puerto 22) desde "Cualquier lugar" (`0.0.0.0/0`). Déjala tal cual.
   * *(Importante para el Frontend)*: Haz clic en el botón azul **"Agregar regla del grupo de seguridad"** (abajo a la izquierda) para crear una segunda regla y configúrala así:
     * **Tipo:** HTTP
     * **Tipo de origen:** Cualquier lugar
     * **Origen:** `0.0.0.0/0`
     *(Esto abrirá el puerto 80 para que el mundo pueda ver tu página web).*
6. **Configurar almacenamiento:** Deja el disco en **`8 GiB` gp3** (configuración por defecto).
7. **Detalles avanzados:**
   * **No toques absolutamente nada de esta sección.** Deja todos los selectores como vienen por defecto ("Seleccionar", "Ninguno", etc.).
   * El cuadro de texto final **"Datos de usuario - opcional"** debe quedar **completamente vacío**.
8. Haz clic en el botón naranja **"Lanzar instancia"** en el panel derecho.

## 2. Conectarse al Servidor vía SSH (En tu PC Local - MINGW64 / Git Bash)

> **Suposición:** Ya tienes la llave `politica-negocio-front-key.pem` guardada en tu carpeta `.ssh` y abriste **Git Bash directamente desde esa carpeta** (clic derecho en la carpeta `.ssh` → *Open Git Bash here*). Tu prompt ya muestra:
> ```
> USUARIO@BetoIlusion MINGW64 ~/.ssh
> $
> ```

1. Protege los permisos de la llave (solo lectura — solo la primera vez):
   ```bash
   chmod 400 politica-negocio-front-key.pem
   ```
2. Conéctate al servidor (reemplaza `IP_AWS` por la IP pública de tu EC2):
   ```bash
   ssh -i politica-negocio-front-key.pem ec2-user@IP_AWS
   ```
3. La primera vez te preguntará:
   > *Are you sure you want to continue connecting (yes/no)?*

   Escribe **`yes`** y dale Enter.

4. Si todo salió bien, tu terminal cambiará y mostrará:
   ```
   [ec2-user@ip-xxx-xxx-xxx-xxx ~]$
   ```
   Eso significa que ya estás dentro del servidor de AWS.

Once connected, instala Docker:
```bash
# Se ejecuta en Linux (AWS) - Instalamos SOLO Docker
sudo dnf update -y
sudo dnf install docker -y

# Activar docker para que arranque con el sistema
sudo systemctl enable docker
sudo systemctl start docker

# Agregar el usuario ec2-user al grupo docker
sudo usermod -aG docker ec2-user
```
*(Debes escribir `exit` y volver a entrar con SSH para que los permisos de Docker se activen en tu usuario correctamente).*

## 3. Crear el Dockerfile (En tu PC Local - Editor de Código / IDE)
En la carpeta `politica-negocio-frontend` de tu computadora, creas un archivo **`Dockerfile`**:

```dockerfile
# Etapa 1: Construcción (Descarga un contenedor con Node.js y compila)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servidor Web (Descarga un contenedor con Nginx y mete lo compilado)
FROM nginx:alpine
COPY --from=builder /app/dist/politica-negocio-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 4. Configurar la URL del Backend (En tu PC Local - Editor de Código)
Antes de subir tu código, **es obligatorio** decirle a Angular dónde está el backend en la nube. En tu proyecto no usas `environment.ts`, la configuración está en `api-config.ts`. 

1. Abre en tu editor de código el archivo `src/app/core/services/api-config.ts`.
2. Cambia la IP local por tu **IP pública de AWS** (asegúrate de mantener `:8081`).

Ejemplo de cómo debe quedar:
```typescript
// En src/app/core/services/api-config.ts
export const BASE_URL = 'http://TU_IP_PUBLICA_AWS:8081'; // Reemplaza por tu IP real
export const API_URL = `${BASE_URL}/api`;
```
Asegúrate de guardar los cambios en ese archivo.

## 5. Subir el código a AWS (Terminal Local - PowerShell / Git Bash)
A diferencia de Vanilla, aquí subimos el **código fuente crudo** (sin compilar), para que Docker lo compile en la nube.
```bash
# Se ejecuta en tu PC Local
# Copiamos la carpeta frontend al servidor usando el usuario ec2-user y apuntando a tu llave en ~/.ssh/
scp -i ~/.ssh/politica-negocio-front-key.pem -r "ruta/a/tu/politica-negocio-frontend" ec2-user@IP_AWS:/home/ec2-user/
```

## 6. Desplegar con Docker (En el Servidor AWS - Linux Amazon Linux 2023)
Vuelve a tu conexión SSH en AWS, entra a la carpeta que subiste y ejecuta la magia:

```bash
# Se ejecuta en Linux (AWS)
cd politica-negocio-frontend

# 1. Esto lee el Dockerfile, compila Angular y genera la imagen
docker build -t frontend-angular .

# 2. Esto toma la imagen y enciende el servidor web mapeando el puerto 80
docker run -d -p 80:80 --name mi-frontend frontend-angular
```

Si entras a `http://IP_AWS` verás tu frontend.

---

## 🔄 ¿Cómo subir actualizaciones (si haces cambios en el código)?
Para actualizar tu frontend empaquetado en Docker al modificar archivos locales, sigue estos pasos:

1. **Subir tu código fuente modificado al servidor (En tu PC Local):**
   * *Si usas Git:* `git push` local y `git pull` en tu servidor de AWS.
   * *Si usas SCP:* Vuelve a subir los archivos (excluyendo la carpeta `node_modules`). *(Recuerda usar la llave específica del frontend `politica-negocio-front-key.pem`)*:
     ```bash
     scp -i ~/.ssh/politica-negocio-front-key.pem -r "ruta/a/tu/politica-negocio-frontend" ec2-user@IP_AWS:/home/ec2-user/
     ```
2. **Re-compilar y lanzar en el servidor (En el Servidor AWS - Linux Amazon Linux 2023):**
   Entra por SSH a tu servidor, navega a la carpeta de tu frontend y corre:
   ```bash
   # 1. Reconstruir la imagen de Docker con el código actualizado
   docker build -t frontend-angular .
   
   # 2. Detener y borrar el contenedor web viejo que está corriendo en puerto 80
   docker stop mi-frontend
   docker rm mi-frontend
   
   # 3. Lanzar el nuevo contenedor con la imagen fresca compilada
   docker run -d -p 80:80 --name mi-frontend frontend-angular
   ```

---
### ⚖️ Diferencias / Comparativa
* **Ventajas:** Si entra un desarrollador nuevo al equipo, no tiene que instalar Node.js ni Angular CLI en su PC local ni preocuparse por versiones; el `Dockerfile` lo hace automáticamente en un ambiente aislado. La configuración viaja con el código.
* **Desventajas:** El proceso de construcción (`docker build`) consume CPU y RAM en el servidor de AWS durante un par de minutos mientras Node compila el frontend. A veces en servidores gratuitos muy pequeños (t2.micro) el servidor se puede congelar al tratar de compilar grandes aplicaciones Angular.

---

## 🛑 ¿Cómo apagar servicios para ahorrar facturación?

Si vas a dejar de usar el frontend por unos días y quieres evitar cargos en AWS (especialmente si se vence tu capa gratuita):

### Opción A: Apagar el Contenedor Docker (La máquina sigue encendida)
Esto detiene el contenedor de Nginx en ejecución, pero AWS te seguirá cobrando por la instancia EC2 activa.
1. Conéctate a tu servidor de AWS por SSH.
2. Detén el contenedor del frontend:
   ```bash
   docker stop mi-frontend
   ```

### Opción B: Detener la Instancia EC2 completa (Recomendado para ahorrar dinero)
Apagar el servidor completo detiene los cargos de computación de la EC2 (solo se te cobrará unos centavos por el almacenamiento del disco virtual EBS).
1. Entra a la **Consola de AWS** -> **EC2** -> **Instancias**.
2. Selecciona tu instancia `politica-frontend-docker`.
3. Haz clic en **Estado de la instancia** -> **Detener instancia** (Stop instance). *¡NUNCA la termines (Terminate)!*

---

## 🚀 ¿Cómo volver a encender los servicios?

### Si detuviste la Instancia EC2 completa (Opción B)
1. Entra a la **Consola de AWS** -> **EC2** -> **Instancias** y dale a **Iniciar instancia** (Start instance).
2. **IMPORTANTE:** Cuando apagas y enciendes una EC2, **su IP pública cambia**. Si tus clientes entran a ver la web, ahora deberán entrar usando la **nueva IP pública**.
3. Conéctate por SSH usando la nueva IP desde Git Bash en la carpeta `.ssh`:
   ```bash
   ssh -i politica-negocio-front-key.pem ec2-user@NUEVA_IP_AWS
   ```
4. Levanta el contenedor de Docker (este se guarda en memoria local, solo debemos encenderlo):
   ```bash
   docker start mi-frontend
   ```

### Si solo detuviste el contenedor (Opción A)
Si no apagaste el servidor entero, la IP sigue siendo la misma:
1. Conéctate a la EC2 por SSH.
2. Inicia de nuevo el contenedor:
   ```bash
   docker start mi-frontend
   ```

---

## ⚠️ Solución de Problemas Comunes (Troubleshooting)

### 1. Error: `Warning: Identity file ... not accessible` o `Permission denied (publickey)` al usar `scp`
* **Causa:** Estás ejecutando el comando `scp` **dentro del servidor AWS** (el prompt de tu consola muestra `[ec2-user@ip-... ~]$`). El comando `scp` sirve para transferir archivos *desde* tu computadora local *hacia* el servidor de AWS.
* **Solución:** Cierra la sesión de AWS (escribe `exit`) o abre una nueva pestaña/terminal en tu computadora local. Ejecuta el comando `scp` en la terminal de tu máquina local (donde tienes guardada la llave `.pem` y los archivos fuente de tu proyecto).

### 2. Error al iniciar sesión o registrarse: `Http failure response ... 0 Unknown Error`
* **Causa:** El navegador web bloquea las peticiones debido a políticas de **CORS** (Cross-Origin Resource Sharing). El backend está configurado para aceptar peticiones solo desde `localhost:4200` y rechaza peticiones que provengan de la IP pública del frontend.
* **Solución:**
  1. En el backend, abre el archivo [SecurityConfig.java](file:///c:/EDBERTO/ULT%20SEMESTRE/SW1/1ER%20parcial/SW1_PN_1_2026/politica-negocio/src/main/java/com/example/politica_negocio/config/security/SecurityConfig.java).
  2. Modifica el método de configuración de CORS (`setAllowedOriginPatterns`) para incluir `"*"` o la IP pública del frontend:
     ```java
     configuration.setAllowedOriginPatterns(java.util.List.of(
             "http://localhost:4201",
             "http://localhost:4200",
             "http://127.0.0.1:4201",
             "http://127.0.0.1:4200",
             "*" // Agrega esto para permitir todas las IPs en un entorno de desarrollo/pruebas
     ));
     ```
  3. Compila el backend de nuevo y reinícialo en el servidor AWS. Si usas Docker en el backend, reconstruye la imagen (`docker build ...`) y reinicia el contenedor.

