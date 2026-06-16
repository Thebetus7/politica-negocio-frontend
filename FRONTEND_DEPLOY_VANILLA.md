# Despliegue Frontend (Angular) en AWS - SIN DOCKER (Vanilla)

Este método compila tu código web (HTML/JS/CSS) en tu propia computadora, y luego sube esos archivos estáticos a un servidor de Nginx que configuraremos a mano en AWS usando **Amazon Linux 2023**.

## 1. Crear el Servidor EC2 (Consola Web de AWS)
Sigue esta configuración paso a paso en el asistente de creación de instancias de AWS:

1. **Nombre y etiquetas:** Ponle un nombre identificativo (ej. `politica-frontend`).
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

Antes de compilar, **es obligatorio** decirle a Angular dónde está el backend en la nube. En tu proyecto no usas `environment.ts`, sino que tienes tu configuración centralizada en `api-config.ts`. Abre tu editor de código y edita ese archivo:

1. Abre `src/app/core/services/api-config.ts`.
2. Cambia la IP local por tu **IP pública de AWS** (asegúrate de mantener `:8081`).

Ejemplo de cómo debe quedar:
```typescript
// En src/app/core/services/api-config.ts
export const BASE_URL = 'http://TU_IP_PUBLICA_AWS:8081'; // Reemplaza por tu IP real
export const API_URL = `${BASE_URL}/api`;
```

Asegúrate de guardar los cambios en ese archivo. Luego compila:
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
scp -i ~/.ssh/politica-negocio-front-key.pem -r dist/politica-negocio-frontend/browser/* ec2-user@IP_AWS:/tmp/
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
   *(Recuerda usar la llave específica del frontend `politica-negocio-front-key.pem` que creamos antes).*
   ```bash
   scp -i ~/.ssh/politica-negocio-front-key.pem -r dist/politica-negocio-frontend/browser/* ec2-user@IP_AWS:/tmp/
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
   ssh -i politica-negocio-front-key.pem ec2-user@NUEVA_IP_AWS
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

---

## ⚠️ Solución de Problemas Comunes (Troubleshooting)

### 1. Error: `Warning: Identity file ... not accessible` o `Permission denied (publickey)` al usar `scp`
* **Causa:** Estás ejecutando el comando `scp` **dentro del servidor AWS** (el prompt de tu consola muestra `[ec2-user@ip-... ~]$`). El comando `scp` sirve para transferir archivos *desde* tu computadora local *hacia* el servidor de AWS.
* **Solución:** Cierra la sesión de AWS (escribe `exit`) o abre una nueva pestaña/terminal en tu computadora local. Ejecuta el comando `scp` en la terminal de tu máquina local (donde tienes guardada la llave `.pem` y los archivos compilados en la carpeta `dist`).

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
  3. Compila el backend de nuevo (`mvn clean package`) y reinícialo en la EC2 del backend:
     ```bash
     nohup java -jar politica-negocio-0.0.1-SNAPSHOT.jar > logs.txt 2>&1 &
     ```

