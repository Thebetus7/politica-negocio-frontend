// =========================================================================
// CONFIGURACIÓN DE LA URL DEL BACKEND (API)
// =========================================================================
//
// CASO 1: Desarrollo Local (Si corres el backend Spring Boot en tu misma PC)
// export const BASE_URL = 'http://localhost:8081';
//
// CASO 2: Servidor en la Nube / VPS (Despliegue externo)
export const BASE_URL = 'http://18.223.28.79:8081';
//
// CASO 3: Red Local / Dispositivo Móvil Físico (Misma red WiFi)
// Reemplaza por la IP LAN local de tu computadora para que tu celular lo detecte
// export const BASE_URL = 'http://192.168.1.100:8081'; 
//
// CASO 4: Dev Tunnel (Ej. ngrok, localtunnel o túneles de VS Code)
// export const BASE_URL = 'https://npwch9fd-8081.brs.devtunnels.ms';
//
// =========================================================================

export const API_URL = `${BASE_URL}/api`;

