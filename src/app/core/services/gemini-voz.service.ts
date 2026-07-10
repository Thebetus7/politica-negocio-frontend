import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
import { CampoFormulario } from './formulario.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiVozService {
  private http = inject(HttpClient);
  
  // Endpoint de Google Gemini API usando la API Key provista por el usuario
  private apiKey = 'AQ.Ab8RN6L410eFE720VevtVHxRxwwvEUMtm7Fcx87FAoXdu0YN_g';
  private apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

  constructor() {}

  /**
   * Envía el audio grabado en Base64 junto con la definición de los campos
   * a la API de Google Gemini para obtener una respuesta JSON estructurada
   * con los valores del formulario mapeados al 100%.
   */
  llenarFormularioConGemini(audioBlob: Blob, campos: CampoFormulario[]): Observable<Record<string, any>> {
    const prompt = this.construirPrompt(campos);
    const esquema = this.generarEsquema(campos);

    // Convertimos el audio Blob a Base64 y encadenamos la llamada HTTP
    return from(this.blobToBase64(audioBlob)).pipe(
      switchMap((base64Audio) => {
        const payload = {
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inlineData: {
                    mimeType: 'audio/webm',
                    data: base64Audio
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: esquema,
            temperature: 0.1 // Temperatura baja para respuestas deterministas y precisas
          }
        };

        return this.http.post<any>(this.apiUrl, payload);
      }),
      map((response) => {
        try {
          const candidatos = response?.candidates;
          if (candidatos && candidatos.length > 0) {
            const textoJson = candidatos[0]?.content?.parts[0]?.text;
            if (textoJson) {
              const parseado = JSON.parse(textoJson);
              return parseado.valores || {};
            }
          }
          throw new Error('Respuesta inválida de la API de Gemini');
        } catch (e) {
          console.error('[Gemini Voz] Error parseando respuesta estructurada:', e);
          throw new Error('No se pudo interpretar la respuesta estructurada de la IA.');
        }
      })
    );
  }

  /**
   * Convierte un Blob a una cadena de texto Base64 limpia (removiendo el prefijo de Data URL).
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Cortar la cabecera 'data:audio/webm;base64,' o similar
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Genera el esquema de respuesta estructurado para la API de Gemini
   * adaptado dinámicamente a la estructura de campos del formulario.
   */
  private generarEsquema(campos: CampoFormulario[]): any {
    const propiedades: Record<string, any> = {};

    for (const campo of campos) {
      if (campo.tipo === 'boton' || campo.tipo === 'archivo') continue;

      switch (campo.tipo) {
        case 'numero':
          propiedades[campo.id] = { 
            type: 'NUMBER', 
            description: `Valor numérico entero o decimal extraído para el campo "${campo.etiqueta}"` 
          };
          break;

        case 'checkbox':
          if (campo.opciones && campo.opciones.length > 0) {
            const checkProps: Record<string, any> = {};
            for (const op of campo.opciones) {
              checkProps[op] = { 
                type: 'BOOLEAN', 
                description: `Indica si el usuario seleccionó o mencionó de manera positiva la opción "${op}"` 
              };
            }
            propiedades[campo.id] = {
              type: 'OBJECT',
              properties: checkProps,
              description: `Opciones marcadas para la lista de selección múltiple "${campo.etiqueta}"`
            };
          } else {
            propiedades[campo.id] = { 
              type: 'BOOLEAN', 
              description: `Valor verdadero/falso para el campo "${campo.etiqueta}"` 
            };
          }
          break;

        case 'tabla':
          if (campo.opciones && campo.opciones.length > 0) {
            const colProps: Record<string, any> = {};
            for (const col of campo.opciones) {
              colProps[col] = { 
                type: 'STRING', 
                description: `Valor textual o numérico correspondiente a la columna "${col}"` 
              };
            }
            propiedades[campo.id] = {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: colProps,
                description: 'Fila de datos de la tabla'
              },
              description: `Listado de filas extraídas secuencialmente para la tabla "${campo.etiqueta}"`
            };
          }
          break;

        default:
          propiedades[campo.id] = { 
            type: 'STRING', 
            description: `Texto transcrito o extraído para el campo "${campo.etiqueta}"` 
          };
          break;
      }
    }

    return {
      type: 'OBJECT',
      properties: {
        valores: {
          type: 'OBJECT',
          properties: propiedades,
          description: 'Esquema clave-valor mapeado con los IDs de campos del formulario'
        }
      },
      required: ['valores']
    };
  }

  /**
   * Construye el prompt con las instrucciones de extracción y mapeo
   * y la definición detallada de todos los campos dinámicos.
   */
  private construirPrompt(campos: CampoFormulario[]): string {
    let prompt = `Eres un sistema experto en transcripción de audio a texto y llenado automático de formularios dinámicos para funcionarios públicos.\n`;
    prompt += `A continuación se te proporciona la lista de campos del formulario actual que el usuario está visualizando en su pantalla. Debes analizar el audio provisto, extraer la información y retornar los valores estructurados en JSON de acuerdo al esquema de respuesta.\n\n`;
    
    prompt += `### Campos del Formulario Activo:\n`;
    for (const campo of campos) {
      prompt += `- ID de campo: "${campo.id}"\n`;
      prompt += `  Tipo de campo: "${campo.tipo}"\n`;
      prompt += `  Etiqueta (texto visible): "${campo.etiqueta}"\n`;
      if (campo.opciones && campo.opciones.length > 0) {
        prompt += `  Opciones/Columnas permitidas: ${JSON.stringify(campo.opciones)}\n`;
      }
      prompt += `\n`;
    }

    prompt += `### Instrucciones de Mapeo y Normalización:\n`;
    prompt += `1. **Texto/Texto largo**: Asigna la frase o descripción dictada correspondiente a la etiqueta del campo.\n`;
    prompt += `2. **Números**: Asigna números válidos en formato dígito (ej: 45, 12, 18.5). Si el usuario lo dice en palabras, conviértelo (ej: "dieciocho" -> 18).\n`;
    prompt += `3. **Fechas**: Parsea fechas en lenguaje natural (ej: "diez de julio del dos mil veintiséis") y devuélvelas exactamente en formato ISO "YYYY-MM-DD" (ej: "2026-07-10").\n`;
    prompt += `4. **Lista (Select) / Radio**: Selecciona estrictamente una de las opciones del array. Usa coincidencia aproximada o lógica semántica para mapear a la mejor opción permitida.\n`;
    prompt += `5. **Checkboxes (Checklist)**: Devuelve un objeto donde cada opción de la lista sea una clave y el valor sea true (si el usuario indica seleccionarla o la menciona positivamente) o false (si no la menciona o indica desmarcarla).\n`;
    prompt += `6. **Tablas**: El usuario dictará registros para la tabla indicando columnas (ej: "nombre Carlos, edad 12"). Si repite el ciclo ("nombre Pedro, edad 36, nombre ulyad, edad 17"), añade cada uno como un nuevo objeto fila al array de la tabla en el orden dictado.\n`;
    prompt += `7. **Ignorar basura**: Si el usuario dice palabras de transición (ej: "hola", "grabar", "guardar"), ignóralas.\n\n`;
    prompt += `Extrae la información con la mayor precisión posible y retorna el JSON requerido.`;

    return prompt;
  }
}
