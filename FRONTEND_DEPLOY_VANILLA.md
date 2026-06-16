# Despliegue Frontend (Angular) en AWS - SIN DOCKER (Vanilla)

Este método compila tu código web (HTML/JS/CSS) en tu propia computadora, y luego sube esos archivos estáticos a un servidor de Nginx que configuraremos a mano en AWS usando **Amazon Linux 2023**.

## 1. Crear el Servidor EC2 (Consola Web de AWS)
Sigue esta configuración paso a paso en el asistente de creación de instancias de AWS:

1. **Nombre y etiquetas:** Ponle un nombre identificativo (ej. `politica-frontend`).
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

Una vez conectado, instala Nginx usando `dnf`:
```bash
# Se ejecuta en Linux (AWS) - Actualizar e instalar el servidor web Nginx
sudo dnf update -y
sudo dnf install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 3. Compilar Angular (En tu PC Local - PowerShell)
Deja el servidor web corriendo y abre una **nueva terminal** en tu computadora Windows (PowerShell) dentro de la carpeta `politica-negocio-frontend`.

Asegúrate de que en tu archivo `environment.ts` pusiste la IP pública de tu backend de AWS (no `localhost`). Luego compila:
```powershell
# Se ejecuta en PowerShell (Local)
npm install
npm run build
```
Esto creará una carpeta llamada `dist/politica-negocio-frontend/browser` llena de archivos HTML y JS.

## 4. Subir los archivos a AWS (En tu PC Local - PowerShell / Git Bash)
En esa misma terminal local, vamos a subir los archivos generados a AWS usando SCP (dirigido a la carpeta temporal `/tmp/` del usuario `ec2-user` y apuntando a tu llave segura en `~/.ssh/`):
```bash
# Se ejecuta en tu PC Local. 
# El '-r' copia toda la carpeta recursivamente hacia la ruta temporal '/tmp/' en AWS
scp -i ~/.ssh/politica-negocio-key.pem -r dist/politica-negocio-frontend/browser/* ec2-user@IP_AWS:/tmp/
```

## 5. Mover a la carpeta pública en la EC2 (En el Servidor AWS - Linux Amazon Linux 2023)
Vuelve a tu terminal que estaba conectada por SSH a AWS. Vamos a tomar los archivos que subimos a `/tmp/` y ponerlos donde Nginx los lee por defecto en Amazon Linux, que es la ruta **`/usr/share/nginx/html/`**:

```bash
# Se ejecuta en Linux (AWS)
sudo cp -r /tmp/* /usr/share/nginx/html/

# Reiniciamos nginx para asegurar que tome los cambios
sudo systemctl restart nginx
```
Ahora puedes entrar a tu navegador, escribir `http://IP_AWS` y verás tu frontend.

---

## 🔄 ¿Cómo subir actualizaciones (si haces cambios en el código)?
Si modificas el diseño, rutas o lógicas de tu Angular localmente, sigue estos pasos para actualizar el servidor:

1. **Compilar de nuevo localmente (En tu PC Local - PowerShell):**
   *(Asegúrate de haber guardado tus cambios).*
   ```powershell
   npm run build
   ```
2. **Subir los nuevos archivos estáticos (En tu PC Local - Git Bash / PowerShell):**
   ```bash
   scp -i ~/.ssh/politica-negocio-key.pem -r dist/politica-negocio-frontend/browser/* ec2-user@IP_AWS:/tmp/
   ```
3. **Reemplazar los archivos anteriores en el servidor (En el Servidor AWS - Linux Amazon Linux 2023):**
   Vuelve a tu terminal de AWS por SSH, limpia la carpeta pública y copia los nuevos archivos:
   ```bash
   # Opcional: Limpiar archivos viejos
   sudo rm -rf /usr/share/nginx/html/*
   
   # Copiar los nuevos desde la carpeta temporal
   sudo cp -r /tmp/* /usr/share/nginx/html/
   
   # Reiniciar el servidor Nginx para refrescar caché
   sudo systemctl restart nginx
   ```

---
### ⚖️ Diferencias / Comparativa
* **Ventajas:** Súper rápido de servir, Nginx nativo es extremadamente ligero y la página carga en milisegundos.
* **Desventajas:** Hay que compilar en tu computadora local obligatoriamente. Además, para que Angular funcione bien al recargar pestañas (Evitar errores 404 en las rutas), debes configurar la ruta de Nginx `/etc/nginx/nginx.conf` a mano en el servidor para añadir el fallback a `index.html`.

---

## 🛑 ¿Cómo apagar servicios para ahorrar facturación?

Si vas a dejar de usar el frontend por unos días y quieres evitar cargos en AWS (especialmente si se vence tu capa gratuita):

### Opción A: Apagar el Servidor Nginx (La máquina sigue encendida)
Esto detiene el servicio web en el puerto 80, pero AWS te seguirá cobrando por las horas de uso de la instancia EC2.
1. Conéctate a tu servidor de AWS por SSH.
2. Ejecuta el comando para detener Nginx:
   ```bash
   sudo systemctl stop nginx
   ```

### Opción B: Detener la Instancia EC2 completa (Recomendado para ahorrar dinero)
Apagar el servidor completo detiene los cargos de computación de la EC2 (solo se te cobrará unos centavos por el almacenamiento del disco virtual EBS).
1. Entra a la **Consola de AWS** -> **EC2** -> **Instancias**.
2. Selecciona tu instancia `politica-frontend`.
3. Haz clic en **Estado de la instancia** -> **Detener instancia** (Stop instance). *¡NUNCA la termines (Terminate)!*

---

## 🚀 ¿Cómo volver a encender los servicios?

### Si detuviste la Instancia EC2 completa (Opción B)
1. Entra a la **Consola de AWS** -> **EC2** -> **Instancias** y dale a **Iniciar instancia** (Start instance).
2. **IMPORTANTE:** Cuando apagas y enciendes una EC2, **su IP pública cambia**. Si tus clientes entran a ver la web, ahora deberán entrar usando la **nueva IP pública** o reconfigurar tu DNS si tienes un dominio asignado.
3. Conéctate por SSH usando la nueva IP si necesitas hacer cambios:
   ```bash
   ssh -i politica-negocio-key.pem ec2-user@NUEVA_IP_AWS
   ```
4. Nginx está configurado para iniciar automáticamente con el sistema, pero si no responde, puedes iniciarlo manualmente:
   ```bash
   sudo systemctl start nginx
   ```

### Si solo detuviste Nginx (Opción A)
Si no apagaste el servidor entero, la IP sigue siendo la misma:
1. Conéctate a la EC2 por SSH.
2. Inicia el servidor web:
   ```bash
   sudo systemctl start nginx
   ```
