import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface DiagramCommand {
  accion: 'añadir_nodo' | 'conectar';
  tipo?: 'inicio' | 'actividad' | 'decision' | 'pregunta' | 'time_event' | 'fin';
  nombre?: string;
  departamentoId?: string;
  condicion?: string;
  iterativoTipo?: 'while_do' | 'do_while';
  origenNombre?: string;
  destinoNombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiDiagramService {
  private http = inject(HttpClient);

  // Clave de la API de Google Gemini (2.5 Flash)
  private apiKey = 'AQ.Ab8RN6L410eFE720VevtVHxRxwwvEUMtm7Fcx87FAoXdu0YN_g';
  private apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

  /**
   * Envía la instrucción en lenguaje natural junto con el contexto del diagrama actual
   * a la API de Gemini 2.5 Flash y retorna el listado de comandos a ejecutar.
   */
  interpretarPrompt(promptUsuario: string, contexto: { nodos: any[]; links: any[]; departamentos: any[] }): Observable<DiagramCommand[]> {
    const prompt = this.construirPrompt(promptUsuario, contexto);
    const esquema = this.generarEsquema();

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: esquema,
        temperature: 0.1 // Temperatura baja para consistencia lógica
      }
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map((response) => {
        try {
          const candidatos = response?.candidates;
          if (candidatos && candidatos.length > 0) {
            const textoJson = candidatos[0]?.content?.parts[0]?.text;
            if (textoJson) {
              const comandos = JSON.parse(textoJson);
              if (Array.isArray(comandos)) {
                return comandos as DiagramCommand[];
              }
            }
          }
          throw new Error('Respuesta inválida o vacía de la API de Gemini');
        } catch (e: any) {
          console.error('[Gemini Diagrama] Error parseando comandos estructurados:', e);
          throw new Error('No se pudo interpretar el comando de la IA: ' + e.message);
        }
      })
    );
  }

  /**
   * Genera el esquema JSON estructurado para recibir comandos como array de objetos.
   */
  private generarEsquema(): any {
    return {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          accion: {
            type: 'STRING',
            enum: ['añadir_nodo', 'conectar'],
            description: 'Acción de modificación del diagrama a ejecutar'
          },
          tipo: {
            type: 'STRING',
            enum: ['inicio', 'actividad', 'decision', 'pregunta', 'time_event', 'fin'],
            description: 'Tipo de nodo a crear'
          },
          nombre: {
            type: 'STRING',
            description: 'Nombre descriptivo o etiqueta visible para el nodo a crear'
          },
          departamentoId: {
            type: 'STRING',
            description: 'ID del departamento al cual debe pertenecer el nodo'
          },
          condicion: {
            type: 'STRING',
            description: 'Texto de la condición para nodos de tipo decision o pregunta'
          },
          iterativoTipo: {
            type: 'STRING',
            enum: ['while_do', 'do_while'],
            description: 'Subtipo iterativo para nodos de tipo pregunta'
          },
          origenNombre: {
            type: 'STRING',
            description: 'Nombre o etiqueta del nodo origen de la conexión'
          },
          destinoNombre: {
            type: 'STRING',
            description: 'Nombre o etiqueta del nodo destino de la conexión'
          }
        },
        required: ['accion']
      }
    };
  }

  /**
   * Construye el prompt descriptivo del diagrama para Gemini.
   */
  private construirPrompt(promptUsuario: string, contexto: { nodos: any[]; links: any[]; departamentos: any[] }): string {
    let prompt = `Eres un asistente experto en la edición y modelado de diagramas de flujos de trabajo (workflows).\n`;
    prompt += `Tu tarea es interpretar la instrucción del usuario y convertirla en una secuencia lógica de comandos de edición (añadir_nodo o conectar) para actualizar el diagrama actual.\n\n`;
    
    prompt += `### Departamentos Disponibles (swimlanes del diagrama):\n`;
    for (const dep of contexto.departamentos) {
      prompt += `- ID: "${dep.id}", Nombre: "${dep.nombre}"\n`;
    }
    prompt += `*Regla crítica*: Si el usuario menciona un departamento, haz fuzzy match con la lista anterior y devuelve su ID exacto. Si el usuario no menciona ningún departamento, asigna por defecto el ID del primer departamento: "${contexto.departamentos[0]?.id}".\n\n`;

    prompt += `### Estado Actual del Diagrama:\n`;
    prompt += `#### Nodos Existentes:\n`;
    if (contexto.nodos.length === 0) {
      prompt += `(El diagrama está vacío)\n`;
    } else {
      for (const nodo of contexto.nodos) {
        prompt += `- Tipo: "${nodo.tipo}", Nombre: "${nodo.nombre}", Departamento ID: "${nodo.departamentoId}"\n`;
      }
    }

    prompt += `#### Conexiones Existentes:\n`;
    if (contexto.links.length === 0) {
      prompt += `(No hay conexiones)\n`;
    } else {
      for (const link of contexto.links) {
        const sourceNode = contexto.nodos.find(n => n.id === link.sourceId || n.tempId === link.sourceId);
        const targetNode = contexto.nodos.find(n => n.id === link.targetId || n.tempId === link.targetId);
        prompt += `- Origen: "${sourceNode?.nombre || 'Desconocido'}", Destino: "${targetNode?.nombre || 'Desconocido'}", Tipo de enlace: "${link.tipo}"\n`;
      }
    }
    prompt += `\n`;

    prompt += `### Reglas de Conversión:\n`;
    prompt += `1. **Nodos Válidos**: Solo crea nodos de tipo: 'inicio', 'actividad', 'decision', 'pregunta', 'time_event', 'fin'. Ignora cualquier otro tipo.\n`;
    prompt += `2. **Nombres de Nodos**:
       - Si el tipo es 'fin', el nombre debe ser "Fin" (o el nombre descriptivo que provea el usuario).
       - Si el tipo es 'inicio', el nombre debe ser "Inicio" (o el nombre descriptivo que provea el usuario).
       - Si el tipo es 'time_event', el nombre debe ser "Espera" (o similar).
    3. **Comando de Conexión ('conectar')**:
       - Debe indicar 'origenNombre' y 'destinoNombre'.
       - Si el usuario dice "conecta X a fin", y 'fin' no existe, debes primero emitir un comando 'añadir_nodo' para el tipo 'fin', y luego un comando 'conectar' con destinoNombre: "Fin".
       - Asegúrate de usar los nombres de los nodos de forma consistente en los comandos.\n\n`;

    prompt += `### INSTRUCCIÓN DEL USUARIO A INTERPRETAR:\n`;
    prompt += `"${promptUsuario}"`;

    return prompt;
  }
}
