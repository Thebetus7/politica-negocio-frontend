# Despliegue Frontend (Angular) en AWS - CON DOCKER

Aquí delegamos absolutamente todo a Docker. Docker va a descargar Node.js internamente, compilar Angular, y luego meterlo en un servidor Nginx, todo dentro de una misma "caja" o Contenedor de Linux, sin que tengas que instalar Node.js ni Nginx en el servidor real. Usaremos **Amazon Linux 2023** en tu instancia EC2.

## 1. Crear el Servidor EC2 (Consola Web de AWS)
Sigue esta configuración paso a paso en el asistente de creación de instancias de AWS:

1. **Nombre y etiquetas:** Ponle un nombre identificativo (ej. `politica-frontend-docker`).
2. **Aplicación e imagen de sistema operativo (AMI):** Selecciona **Amazon Linux 2023 AMI** (es apto para la capa gratuita).
3. **Tipo de instancia:** Selecciona `t2.micro` (o `t3.micro` según tu región) para mantenerte dentro del límite gratuito.
4. **Par de claves (inicio de sesión):**
   * Haz clic en **"Crear un nuevo par de claves"** (si no tienes una).
   * Llámalo `politica-negocio-key`.
   * Tipo de clave: **RSA**. Formato: **`.pem`**.
   * Presiona **Crear**. En ese preciso momento, tu navegador descargará el archivo `politica-negocio-key.pem` a tu computadora. **¡Guárdalo bien!** Es el único momento donde AWS te lo dará.
5. **Configuraciones de red:**
   * Deja la red por defecto.
   * **Asignación automática de IP pública:** Asegúrate de que esté configurado en **"Habilitar"**.
   * **Firewall (grupos de seguridad):** Selecciona **"Crear un grupo de seguridad"**.
   * Marca la casilla **"Permitir el tráfico de SSH desde"** y selecciona **"Cualquier lugar (0.0.0.0/0)"**.
   * *(Importante para el Frontend)*: Marca también estas dos casillas de tráfico web:
     * **Permitir el tráfico de HTTPS desde internet**
     * **Permitir el tráfico de HTTP desde internet** (abre el puerto 80 por defecto).
6. **Configurar almacenamiento:** Deja el disco en **`8 GiB` gp3** (configuración por defecto).
7. **Detalles avanzados:**
   * **No toques absolutamente nada de esta sección.** Deja todos los selectores como vienen por defecto ("Seleccionar", "Ninguno", etc.).
   * El cuadro de texto final **"Datos de usuario - opcional"** debe quedar **completamente vacío**.
8. Haz clic en el botón naranja **"Lanzar instancia"** en el panel derecho.

## 2. Conectarse al Servidor vía SSH (En tu PC Local - MINGW64 / Git Bash)

> **Suposición:** Ya tienes la llave `politica-negocio-key.pem` guardada en tu carpeta `.ssh` y abriste **Git Bash directamente desde esa carpeta** (clic derecho en la carpeta `.ssh` → *Open Git Bash here*). Tu prompt ya muestra:
> ```
> USUARIO@BetoIlusion MINGW64 ~/.ssh
> $
> ```

1. Protege los permisos de la llave (solo lectura — solo la primera vez):
   ```bash
   chmod 400 politica-negocio-key.pem
   ```
2. Conéctate al servidor (reemplaza `IP_AWS` por la IP pública de tu EC2):
   ```bash
   ssh -i politica-negocio-key.pem ec2-user@IP_AWS
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

## 4. Subir el código a AWS (Terminal Local - PowerShell / Git Bash)
A diferencia de Vanilla, aquí subimos el **código fuente crudo** (sin compilar), para que Docker lo compile en la nube.
```bash
# Se ejecuta en tu PC Local
# Copiamos la carpeta frontend al servidor usando el usuario ec2-user y apuntando a tu llave en ~/.ssh/
scp -i ~/.ssh/politica-negocio-key.pem -r "ruta/a/tu/politica-negocio-frontend" ec2-user@IP_AWS:/home/ec2-user/
```

## 5. Desplegar con Docker (En el Servidor AWS - Linux Amazon Linux 2023)
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
   * *Si usas SCP:* Vuelve a subir los archivos (excluyendo la carpeta `node_modules`):
     ```bash
     scp -i ~/.ssh/politica-negocio-key.pem -r "ruta/a/tu/politica-negocio-frontend" ec2-user@IP_AWS:/home/ec2-user/
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
   ssh -i politica-negocio-key.pem ec2-user@NUEVA_IP_AWS
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
