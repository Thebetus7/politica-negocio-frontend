import { Injectable } from '@angular/core';
import { CampoFormulario } from './formulario.service';

@Injectable({
  providedIn: 'root'
})
export class VoiceFormMapperService {

  constructor() {}

  /**
   * Mapea un texto transcrito por Whisper a los valores correspondientes
   * de los campos de un formulario dinámico.
   */
  mapear(texto: string, campos: CampoFormulario[]): Record<string, any> {
    if (!texto || !campos || campos.length === 0) {
      return {};
    }

    const resultado: Record<string, any> = {};
    const textoNorm = this.normalizar(texto);

    // 1. Identificar las posiciones de cada campo en el texto transcrito
    const posicionesCampos = this.obtenerPosicionesCampos(texto, textoNorm, campos);

    // 2. Segmentar el texto basándose en las posiciones encontradas
    for (let i = 0; i < posicionesCampos.length; i++) {
      const actual = posicionesCampos[i];
      const siguiente = posicionesCampos[i + 1];

      // Extraer el segmento correspondiente del texto original (para preservar nombres de archivos, textos libres, etc.)
      const inicioIndex = actual.indexOriginal;
      const finIndex = siguiente ? siguiente.indexOriginal : texto.length;
      
      let segmento = texto.substring(inicioIndex, finIndex).trim();
      
      // Limpiar la etiqueta del inicio del segmento
      segmento = this.limpiarPrefijoEtiqueta(segmento, actual.etiquetaEncontrada);

      // Procesar el segmento según el tipo de campo
      const valorMapeado = this.procesarSegmentoPorTipo(segmento, actual.campo);
      if (valorMapeado !== undefined && valorMapeado !== null) {
        resultado[actual.campo.id] = valorMapeado;
      }
    }

    return resultado;
  }

  /**
   * Normaliza un texto eliminando acentos, convirtiendo a minúsculas,
   * reemplazando caracteres especiales por espacios y colapsando espacios múltiples.
   */
  private normalizar(txt: string): string {
    if (!txt) return '';
    return txt
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s]/g, ' ')   // Quitar caracteres no alfanuméricos
      .replace(/\s+/g, ' ')           // Unificar espacios
      .trim();
  }

  /**
   * Encuentra dónde empieza cada campo en el texto normalizado.
   */
  private obtenerPosicionesCampos(
    textoOriginal: string,
    textoNorm: string,
    campos: CampoFormulario[]
  ): Array<{ campo: CampoFormulario; indexNorm: number; indexOriginal: number; etiquetaEncontrada: string }> {
    const encontradas: Array<{
      campo: CampoFormulario;
      indexNorm: number;
      indexOriginal: number;
      etiquetaEncontrada: string;
    }> = [];

    for (const campo of campos) {
      if (campo.tipo === 'boton') continue;

      const etiquetaNorm = this.normalizar(campo.etiqueta);
      
      // Intentar buscar la etiqueta completa normalizada
      let index = textoNorm.indexOf(etiquetaNorm);
      let etiquetaUsada = campo.etiqueta;

      // Si no se encuentra, probar con una versión simplificada (por ejemplo, quitando textos entre paréntesis)
      if (index === -1) {
        const etiquetaSimplificada = campo.etiqueta.replace(/\(.*?\)/g, '').trim();
        const etiquetaSimplificadaNorm = this.normalizar(etiquetaSimplificada);
        if (etiquetaSimplificadaNorm.length > 3) {
          index = textoNorm.indexOf(etiquetaSimplificadaNorm);
          etiquetaUsada = etiquetaSimplificada;
        }
      }

      // Si aún así no se encuentra y la etiqueta es larga, buscar las primeras palabras significativas
      if (index === -1) {
        const palabras = etiquetaNorm.split(' ').filter(p => p.length > 3);
        if (palabras.length >= 2) {
          const primerasPalabras = palabras.slice(0, 2).join(' ');
          index = textoNorm.indexOf(primerasPalabras);
          etiquetaUsada = primerasPalabras;
        }
      }

      if (index !== -1) {
        // Encontrar la posición correspondiente en el texto original (con acentos/mayúsculas)
        // Hacemos una búsqueda simple basada en caracteres alfanuméricos correlativos
        const indexOriginal = this.mapearIndexNormAOriginal(textoOriginal, index);

        encontradas.push({
          campo,
          indexNorm: index,
          indexOriginal,
          etiquetaEncontrada: etiquetaUsada
        });
      }
    }

    // Ordenar los campos por su aparición en el texto
    return encontradas.sort((a, b) => a.indexNorm - b.indexNorm);
  }

  /**
   * Mapea un índice del texto normalizado de vuelta a su posición exacta en el texto original.
   * Alinea los caracteres teniendo en cuenta los eliminados (puntuación, acentos) y modificados.
   */
  private mapearIndexNormAOriginal(textoOriginal: string, indexNorm: number): number {
    if (indexNorm <= 0) return 0;
    
    const textoNorm = this.normalizar(textoOriginal);
    if (indexNorm >= textoNorm.length) return textoOriginal.length;

    let iNorm = 0;
    let iOrig = 0;

    // Recorrer ambos textos en paralelo
    while (iNorm < indexNorm && iOrig < textoOriginal.length) {
      const charOrig = textoOriginal[iOrig];
      const charNorm = textoNorm[iNorm];

      // Normalizar el carácter original individualmente para compararlo
      const charOrigNorm = this.normalizar(charOrig);

      if (charOrigNorm === charNorm) {
        iNorm++;
        iOrig++;
      } else if (charNorm === ' ' && charOrigNorm === '') {
        // En la normalización los caracteres especiales a veces se convierten en espacios
        iNorm++;
        iOrig++;
      } else {
        // Carácter eliminado en la normalización (ej: acento, coma, punto)
        iOrig++;
      }
    }

    return iOrig;
  }

  /**
   * Limpia la etiqueta y conectores comunes al inicio del segmento de texto.
   */
  private limpiarPrefijoEtiqueta(segmento: string, etiqueta: string): string {
    let limpio = segmento;
    
    // Quitar la etiqueta del inicio (case-insensitive)
    const etiquetaEscapada = etiqueta.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexEtiqueta = new RegExp('^' + etiquetaEscapada, 'i');
    limpio = limpio.replace(regexEtiqueta, '').trim();

    // Quitar conectores iniciales comunes como "es", "mi respuesta es", "dos puntos", ":", "es igual a", "del", "de"
    limpio = limpio.replace(/^[:\-\s=]+/i, '').trim();
    limpio = limpio.replace(/^(es|mi respuesta es|respuesta|dos puntos|es igual a|del|de|que es)\s+/i, '').trim();
    limpio = limpio.replace(/^[:\-\s=]+/i, '').trim();

    return limpio;
  }

  /**
   * Procesa un segmento de texto según el tipo de campo del formulario.
   */
  private procesarSegmentoPorTipo(segmento: string, campo: CampoFormulario): any {
    const segmentoNorm = this.normalizar(segmento);

    switch (campo.tipo) {
      case 'texto':
      case 'texto_largo':
        return segmento.trim();

      case 'numero':
        return this.extraerNumero(segmentoNorm);

      case 'fecha':
        return this.extraerFecha(segmentoNorm);

      case 'email':
        return this.extraerEmail(segmentoNorm);

      case 'checkbox':
        return this.extraerCheckbox(segmentoNorm, campo.opciones || []);

      case 'lista':
      case 'radio':
        return this.extraerOpcionUnica(segmentoNorm, campo.opciones || []);

      case 'tabla':
        return this.extraerTabla(segmento, campo.opciones || []);

      default:
        return segmento.trim();
    }
  }

  /**
   * Extrae un número del texto, convirtiendo palabras numéricas si es necesario.
   */
  private extraerNumero(texto: string): number | null {
    // 1. Intentar extraer dígitos directamente
    const matchDigitos = texto.match(/\b\d+(\.\d+)?\b/);
    if (matchDigitos) {
      return parseFloat(matchDigitos[0]);
    }

    // 2. Si no hay dígitos, intentar parsear palabras numéricas en español
    const palabras = texto.split(' ');
    let acumulado = 0;
    let parcial = 0;
    let encontrado = false;

    const valoresPalabras: Record<string, { val: number; mult: boolean }> = {
      'cero': { val: 0, mult: false },
      'uno': { val: 1, mult: false },
      'un': { val: 1, mult: false },
      'dos': { val: 2, mult: false },
      'tres': { val: 3, mult: false },
      'cuatro': { val: 4, mult: false },
      'cinco': { val: 5, mult: false },
      'seis': { val: 6, mult: false },
      'siete': { val: 7, mult: false },
      'ocho': { val: 8, mult: false },
      'nueve': { val: 9, mult: false },
      'diez': { val: 10, mult: false },
      'once': { val: 11, mult: false },
      'doce': { val: 12, mult: false },
      'trece': { val: 13, mult: false },
      'catorce': { val: 14, mult: false },
      'quince': { val: 15, mult: false },
      'dieciseis': { val: 16, mult: false },
      'diecisiete': { val: 17, mult: false },
      'dieciocho': { val: 18, mult: false },
      'diecinueve': { val: 19, mult: false },
      'veinte': { val: 20, mult: false },
      'veintiuno': { val: 21, mult: false },
      'veintidos': { val: 22, mult: false },
      'veintitres': { val: 23, mult: false },
      'veinticuatro': { val: 24, mult: false },
      'veinticinco': { val: 25, mult: false },
      'veintiseis': { val: 26, mult: false },
      'veintisiete': { val: 27, mult: false },
      'veintiocho': { val: 28, mult: false },
      'veintinueve': { val: 29, mult: false },
      'treinta': { val: 30, mult: false },
      'cuarenta': { val: 40, mult: false },
      'cincuenta': { val: 50, mult: false },
      'sesenta': { val: 60, mult: false },
      'setenta': { val: 70, mult: false },
      'ochenta': { val: 80, mult: false },
      'noventa': { val: 90, mult: false },
      'cien': { val: 100, mult: false },
      'ciento': { val: 100, mult: false },
      'doscientos': { val: 200, mult: false },
      'trescientos': { val: 300, mult: false },
      'cuatrocientos': { val: 400, mult: false },
      'quinientos': { val: 500, mult: false },
      'seiscientos': { val: 600, mult: false },
      'setecientos': { val: 700, mult: false },
      'ochocientos': { val: 800, mult: false },
      'novecientos': { val: 900, mult: false },
      'mil': { val: 1000, mult: true }
    };

    for (const palabra of palabras) {
      const info = valoresPalabras[palabra];
      if (info !== undefined) {
        encontrado = true;
        if (info.mult) {
          acumulado += (parcial === 0 ? 1 : parcial) * info.val;
          parcial = 0;
        } else {
          parcial += info.val;
        }
      }
    }

    acumulado += parcial;

    return encontrado ? acumulado : null;
  }

  /**
   * Extrae una fecha en formato YYYY-MM-DD del texto.
   */
  private extraerFecha(texto: string): string | null {
    // 1. Intentar buscar formato estándar numérico: DD/MM/YYYY o DD-MM-YYYY
    const matchNumerico = texto.match(/\b(\d{1,2})[\/\-s](\d{1,2})[\/\-s](\d{4})\b/);
    if (matchNumerico) {
      const dia = matchNumerico[1].padStart(2, '0');
      const mes = matchNumerico[2].padStart(2, '0');
      const anio = matchNumerico[3];
      return `${anio}-${mes}-${dia}`;
    }

    // 2. Intentar buscar formato hablado: "10 de julio de 2026"
    const meses: Record<string, string> = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };

    // Regex para buscar: [numero] de [mes] de [año]
    // Soportamos números en dígitos o palabras
    const regexMeses = Object.keys(meses).join('|');
    const regexFechaHablada = new RegExp(`(\\d+|[a-z]+)\\s+de\\s+(${regexMeses})\\s+de\\s+(\\d+|[a-z]+)`, 'i');
    
    const matchHablada = texto.match(regexFechaHablada);
    if (matchHablada) {
      let diaStr = matchHablada[1];
      const mesStr = matchHablada[2].toLowerCase();
      let anioStr = matchHablada[3];

      // Convertir dia y año si están en letras
      let diaNum = parseInt(diaStr);
      if (isNaN(diaNum)) {
        diaNum = this.extraerNumero(diaStr) || 1;
      }
      
      let anioNum = parseInt(anioStr);
      if (isNaN(anioNum)) {
        anioNum = this.extraerNumero(anioStr) || new Date().getFullYear();
      }

      const dia = String(diaNum).padStart(2, '0');
      const mes = meses[mesStr];
      const anio = String(anioNum);

      return `${anio}-${mes}-${dia}`;
    }

    return null;
  }

  /**
   * Extrae el email limpiando el dictado (ej: "juan arroba gmail punto com").
   */
  private extraerEmail(texto: string): string | null {
    let email = texto.replace(/\s+/g, ''); // Quitar todos los espacios
    email = email.replace(/arroba/g, '@');
    email = email.replace(/punto/g, '.');
    
    // Buscar un patrón de email válido
    const match = email.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
  }

  /**
   * Extrae los checkboxes seleccionados basándose en fuzzy-matching con las opciones.
   */
  private extraerCheckbox(texto: string, opciones: string[]): Record<string, boolean> {
    const resultado: Record<string, boolean> = {};
    
    // Inicializar todas las opciones del checkbox como false
    for (const op of opciones) {
      resultado[op] = false;
    }

    // Buscar cuáles opciones se mencionan de forma positiva
    for (const op of opciones) {
      const opNorm = this.normalizar(op);
      
      // Buscar la opción exacta o con distancia de edición pequeña (fuzzy) en el texto
      if (texto.includes(opNorm) || this.contieneFuzzy(texto, opNorm)) {
        // Verificar que no haya una negación justo antes de la opción
        const index = texto.indexOf(opNorm);
        const subAntes = index > 0 ? texto.substring(Math.max(0, index - 15), index) : '';
        
        const tieneNegacion = /\b(no|quitar|desmarcar|desactiva|sin)\b/i.test(subAntes);
        resultado[op] = !tieneNegacion;
      }
    }

    return resultado;
  }

  /**
   * Extrae una opción única (lista o radio) buscando la mejor coincidencia fuzzy en el texto.
   */
  private extraerOpcionUnica(texto: string, opciones: string[]): string | null {
    if (opciones.length === 0) return null;

    let mejorOpcion: string | null = null;
    let mejorScore = -1; // Cuanto más alto, mejor coincidencia

    for (const op of opciones) {
      const opNorm = this.normalizar(op);

      // Si coincide exactamente, retornamos de inmediato
      if (texto.includes(opNorm)) {
        return op;
      }

      // Si no, evaluamos Levenshtein o coincidencia parcial de palabras
      const score = this.calcularCoincidenciaScore(texto, opNorm);
      if (score > mejorScore && score > 0.4) { // Umbral de confianza
        mejorScore = score;
        mejorOpcion = op;
      }
    }

    return mejorOpcion;
  }

  /**
   * Procesa la transcripción de una tabla y extrae las filas.
   * Si el usuario repite una columna que ya tiene valor en la fila activa, 
   * se cierra la fila actual y se inicia una nueva fila automáticamente.
   */
  private extraerTabla(textoOriginal: string, columnas: string[]): Array<Record<string, string>> {
    const filasResultado: Array<Record<string, string>> = [];
    if (columnas.length === 0) return filasResultado;

    const textoOriginalNorm = this.normalizar(textoOriginal);
    
    // 1. Identificar posiciones de todos los nombres de columnas y separadores en el texto
    const ocurrencias: Array<{ tipo: 'columna' | 'separador'; nombre: string; indexNorm: number; lengthNorm: number }> = [];

    // Buscar nombres de columnas
    for (const col of columnas) {
      const colNorm = this.normalizar(col);
      let pos = textoOriginalNorm.indexOf(colNorm);
      while (pos !== -1) {
        ocurrencias.push({
          tipo: 'columna',
          nombre: col,
          indexNorm: pos,
          lengthNorm: colNorm.length
        });
        pos = textoOriginalNorm.indexOf(colNorm, pos + colNorm.length);
      }
    }

    // Buscar palabras de separación de filas explícitas
    const separadores = ['nueva fila', 'siguiente fila', 'siguiente', 'fila nueva', 'otra fila', 'adicionar fila', 'insertar fila'];
    for (const sep of separadores) {
      let pos = textoOriginalNorm.indexOf(sep);
      while (pos !== -1) {
        ocurrencias.push({
          tipo: 'separador',
          nombre: sep,
          indexNorm: pos,
          lengthNorm: sep.length
        });
        pos = textoOriginalNorm.indexOf(sep, pos + sep.length);
      }
    }

    // Fallback: Si no se encontró ninguna mención de columna ni separador, intentar asignar por conectores comas directamente
    if (ocurrencias.length === 0) {
      const fila: Record<string, string> = {};
      for (const col of columnas) {
        fila[col] = '';
      }
      const partesValores = textoOriginal.split(/\b(?:y|,|\.|con)\b/gi).map(p => p.trim()).filter(Boolean);
      for (let i = 0; i < columnas.length; i++) {
        if (partesValores[i]) {
          fila[columnas[i]] = partesValores[i];
        }
      }
      const tieneDatos = Object.values(fila).some(v => v.trim() !== '');
      if (tieneDatos) {
        filasResultado.push(fila);
      }
      return filasResultado;
    }

    // Ordenar las ocurrencias por su aparición en el texto
    ocurrencias.sort((a, b) => a.indexNorm - b.indexNorm);

    // 2. Procesar las ocurrencias secuencialmente de izquierda a derecha
    let filaActual: Record<string, string> = {};
    const inicializarFila = () => {
      const f: Record<string, string> = {};
      for (const col of columnas) {
        f[col] = '';
      }
      return f;
    };

    filaActual = inicializarFila();
    let tieneValoresFilaActual = false;

    for (let i = 0; i < ocurrencias.length; i++) {
      const actual = ocurrencias[i];
      const siguiente = ocurrencias[i + 1];

      // Si es un separador explícito, guardamos la fila actual y empezamos una nueva
      if (actual.tipo === 'separador') {
        if (tieneValoresFilaActual) {
          filasResultado.push({ ...filaActual });
          filaActual = inicializarFila();
          tieneValoresFilaActual = false;
        }
        continue;
      }

      // Si es una columna real
      const colNombre = actual.nombre;

      // REGLA SOLICITADA: "si repito el ciclo añade otra fila"
      // Si la columna actual ya tiene un valor asignado en esta fila, significa que empezamos un nuevo registro
      if (filaActual[colNombre] !== undefined && filaActual[colNombre] !== '') {
        if (tieneValoresFilaActual) {
          filasResultado.push({ ...filaActual });
          filaActual = inicializarFila();
          tieneValoresFilaActual = false;
        }
      }

      // El valor asociado a la columna actual está entre el final de la columna y el inicio de la siguiente ocurrencia
      const inicioNorm = actual.indexNorm + actual.lengthNorm;
      const finNorm = siguiente ? siguiente.indexNorm : textoOriginalNorm.length;

      // Convertir los índices de la cadena normalizada a sus posiciones reales en la cadena original
      const inicioOrig = this.mapearIndexNormAOriginal(textoOriginal, inicioNorm);
      const finOrig = this.mapearIndexNormAOriginal(textoOriginal, finNorm);

      // Extraer el substring del texto original usando los índices corregidos
      let valorSegmentado = textoOriginal.substring(inicioOrig, finOrig).trim();

      // Limpiar conectores como "es", "de", "con", ":" al principio del valor
      valorSegmentado = valorSegmentado.replace(/^[:\-\s=]+/i, '').trim();
      valorSegmentado = valorSegmentado.replace(/^(es|de|con|igual a)\s+/i, '').trim();
      valorSegmentado = valorSegmentado.replace(/^[:\-\s=]+/i, '').trim();

      filaActual[colNombre] = valorSegmentado;
      tieneValoresFilaActual = true;
    }

    // Agregar la última fila si quedó con valores pendientes
    if (tieneValoresFilaActual) {
      filasResultado.push({ ...filaActual });
    }

    return filasResultado;
  }

  /**
   * Evalúa si un texto contiene una subcadena de manera fuzzy (tolerando pequeños errores).
   */
  private contieneFuzzy(texto: string, subcadena: string): boolean {
    if (subcadena.length < 3) return texto.includes(subcadena);

    const palabrasTexto = texto.split(' ');
    const palabrasSub = subcadena.split(' ');

    // Si la subcadena tiene varias palabras, buscar si coinciden de forma consecutiva aproximada
    for (let i = 0; i <= palabrasTexto.length - palabrasSub.length; i++) {
      let coincidencias = 0;
      for (let j = 0; j < palabrasSub.length; j++) {
        const pTexto = palabrasTexto[i + j];
        const pSub = palabrasSub[j];
        if (pTexto && this.calcularDistanciaLevenshtein(pTexto, pSub) <= 1) {
          coincidencias++;
        }
      }
      if (coincidencias === palabrasSub.length) {
        return true;
      }
    }

    return false;
  }

  /**
   * Retorna un score entre 0 y 1 de qué tan alineados están un texto dictado con una opción.
   */
  private calcularCoincidenciaScore(texto: string, opcionNorm: string): number {
    // Buscar la palabra más parecida en el texto
    const palabrasTexto = texto.split(' ');
    const palabrasOpcion = opcionNorm.split(' ');

    let maxScore = 0;

    for (const pTexto of palabrasTexto) {
      for (const pOp of palabrasOpcion) {
        const dist = this.calcularDistanciaLevenshtein(pTexto, pOp);
        const maxLen = Math.max(pTexto.length, pOp.length);
        const score = maxLen === 0 ? 1 : 1 - dist / maxLen;
        if (score > maxScore) {
          maxScore = score;
        }
      }
    }

    return maxScore;
  }

  /**
   * Distancia Levenshtein básica entre dos strings.
   */
  private calcularDistanciaLevenshtein(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // Sustitución
            matrix[i][j - 1] + 1,     // Inserción
            matrix[i - 1][j] + 1      // Eliminación
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
