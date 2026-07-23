import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface GroqDiagramCommand {
  accion: 'añadir_nodo' | 'conectar' | 'eliminar_nodo' | 'eliminar_conexion';
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
export class GroqDiagramService {
  private http = inject(HttpClient);

  // Clave de la API y endpoint de GroqCloud
  private apiKey = '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';
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  /**
   * Envía la instrucción en lenguaje natural a la API de Groq usando Llama 3.3 70B,
   * y retorna el listado de comandos estruturados a ejecutar.
   */
  interpretarPrompt(promptUsuario: string, contexto: { nodos: any[]; links: any[]; departamentos: any[] }): Observable<GroqDiagramCommand[]> {
    const promptSistema = this.construirPromptSistema(contexto);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: promptSistema
        },
        {
          role: 'user',
          content: `Instrucción del usuario a interpretar y ejecutar:\n"${promptUsuario}"`
        }
      ],
      response_format: {
        type: 'json_object'
      },
      temperature: 0.1
    };

    return this.http.post<any>(this.apiUrl, payload, { headers }).pipe(
      map((response) => {
        try {
          const content = response?.choices?.[0]?.message?.content;
          if (content) {
            const parseado = JSON.parse(content);
            // Groq requiere estructura de objeto JSON, por lo que le pedimos que use la clave 'comandos'
            if (parseado && Array.isArray(parseado.comandos)) {
              return parseado.comandos as GroqDiagramCommand[];
            }
          }
          throw new Error('Respuesta de Groq no contiene comandos estructurados válidos');
        } catch (e: any) {
          console.error('[Groq Diagrama] Error parseando JSON de respuesta:', e);
          throw new Error('No se pudo interpretar la respuesta estructurada de Groq: ' + e.message);
        }
      })
    );
  }

  /**
   * Construye las reglas y contexto del diagrama para el prompt de sistema.
   */
  private construirPromptSistema(contexto: { nodos: any[]; links: any[]; departamentos: any[] }): string {
    let prompt = `Eres un asistente experto en la edición y estructuración de diagramas de flujos de trabajo (workflows).\n`;
    prompt += `Tu tarea es interpretar la instrucción del usuario y convertirla en una secuencia lógica de comandos de edición (añadir_nodo, conectar, eliminar_nodo o eliminar_conexion) para actualizar el diagrama actual.\n\n`;
    
    prompt += `Debes retornar obligatoriamente un OBJETO JSON con la clave "comandos" que contenga un array de objetos con el siguiente esquema exacto:\n`;
    prompt += `{\n`;
    prompt += `  "comandos": [\n`;
    prompt += `    {\n`;
    prompt += `      "accion": "añadir_nodo" | "conectar" | "eliminar_nodo" | "eliminar_conexion",\n`;
    prompt += `      "tipo": "inicio" | "actividad" | "decision" | "pregunta" | "time_event" | "fin",\n`;
    prompt += `      "nombre": "Nombre descriptivo del nodo (ej: 'Revisión')",\n`;
    prompt += `      "departamentoId": "ID del departamento correspondiente",\n`;
    prompt += `      "condicion": "Condición lógica para decision o pregunta (ej: '¿Terminó?')",\n`;
    prompt += `      "iterativoTipo": "while_do" | "do_while" (para nodos tipo pregunta),\n`;
    prompt += `      "origenNombre": "Nombre del nodo origen para conectar/eliminar_conexion",\n`;
    prompt += `      "destinoNombre": "Nombre del nodo destino para conectar/eliminar_conexion"\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}\n\n`;

    prompt += `### Departamentos Disponibles (swimlanes del diagrama):\n`;
    for (const dep of contexto.departamentos) {
      prompt += `- ID: "${dep.id}", Nombre: "${dep.nombre}"\n`;
    }
    prompt += `*Regla de carril*: Si el usuario especifica un departamento, haz fuzzy match con el listado anterior y pon su ID exacto. Si el usuario no menciona departamento, asigna el ID del primer departamento: "${contexto.departamentos[0]?.id}".\n\n`;

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

    prompt += `### Reglas Críticas de Mapeo:\n`;
    prompt += `1. **Nodos Válidos**: Solo crea nodos de tipo: 'inicio', 'actividad', 'decision', 'pregunta', 'time_event', 'fin'.\n`;
    prompt += `2. **Añadir Nodo**:
       - Si es tipo 'fin', el nombre debe ser "Fin" (o el indicado).
       - Si es tipo 'inicio', el nombre debe ser "Inicio" (o el indicado).
       - Si es tipo 'time_event', el nombre debe ser "Espera" (o similar).
    3. **Conectar**:
       - Si el usuario indica "conecta X a fin", y 'fin' no existe, emite dos comandos en orden: 1. añadir_nodo de tipo fin y nombre "Fin", y 2. conectar con origenNombre "X" y destinoNombre "Fin".
    4. **Eliminar Nodo**:
       - Si pide remover o eliminar una actividad o nodo (ej: "elimina la actividad X y la actividad Y"), emite un comando { "accion": "eliminar_nodo", "nombre": "X" } por cada uno.
    5. **Eliminar Conexión**:
       - Si pide eliminar el enlace o flujo entre dos actividades (ej: "eliminar la conexion entre A y B"), emite un comando { "accion": "eliminar_conexion", "origenNombre": "A", "destinoNombre": "B" }.
    6. **Corrección de Errores Tipográficos y Mapeo**:
       - Si el usuario se refiere a un nodo existente pero con errores tipográficos, abreviaciones o de ortografía (ej: "finazliacion", "finilacion", "perfil"), debes buscar en la lista de 'Nodos Existentes' el nodo que semánticamente o por proximidad de caracteres corresponda (ej: "finalizacion", "inicio de perfil").
       - En los campos 'origenNombre' y 'destinoNombre' de los comandos, debes escribir obligatoriamente el nombre EXACTO tal como aparece en la lista de 'Nodos Existentes' (ej: "finalizacion") para que el sistema pueda encontrarlo.\n\n`;

    prompt += `Recuerda retornar única y exclusivamente el objeto JSON en el formato especificado.`;

    return prompt;
  }
}
