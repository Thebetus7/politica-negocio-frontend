import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WhisperService {
  modeloCargando = signal<boolean>(false);
  progresoDescarga = signal<number>(0);
  modeloListo = signal<boolean>(false);

  private transcriber: any = null;

  constructor() {}

  /**
   * Carga el pipeline del modelo ASR (Automatic Speech Recognition)
   * de forma perezosa (lazy). Si ya está cargado, no hace nada.
   */
  async cargarModelo(): Promise<void> {
    if (this.transcriber || this.modeloListo()) {
      return;
    }

    console.log('[Whisper V2 - Depuración] Iniciando carga de modelo de voz local...');
    this.modeloCargando.set(true);
    this.progresoDescarga.set(0);

    try {
      // Importación dinámica para evitar cargar la librería entera al arrancar la app
      const { pipeline, env } = await import('@huggingface/transformers');

      // Forzar que busque los modelos en el Hugging Face Hub (CDN)
      env.allowLocalModels = false;

      // Borrar caché de modelos local (transformers-cache) para eliminar archivos cuantizados incompatibles de pruebas anteriores
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          await caches.delete('transformers-cache');
          console.log('[Whisper V2] Caché transformers-cache eliminada para evitar conflictos de cuantización.');
        } catch (e) {
          console.warn('[Whisper V2] No se pudo limpiar la caché:', e);
        }
      }

      // Forzar el proveedor de ejecución a WASM (WebAssembly en CPU) para evitar bugs de WebGPU/decuantización en ciertos navegadores/GPUs
      (env.backends.onnx as any)['executionProviders'] = ['wasm'];

      // Mapa para rastrear el progreso de descarga de cada archivo individual
      const progressTracker: Record<string, number> = {};

      this.transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
        device: 'wasm', // Forzar explícitamente el dispositivo a WASM (CPU en la web)
        dtype: {
          encoder_model: 'fp32',
          decoder_model_merged: 'fp32'
        },
        session_options: {
          graphOptimizationLevel: 'disabled' // Desactivar completamente optimizaciones de grafo
        },
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            progressTracker[data.file] = data.progress;
            
            // Calcular un progreso promedio aproximado de los archivos activos
            const values = Object.values(progressTracker);
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / Math.max(values.length, 1));
            this.progresoDescarga.set(avg);
          } else if (data.status === 'ready') {
            console.log(`[Whisper] Archivo cargado: ${data.file}`);
          } else if (data.status === 'done') {
            // El archivo se descargó completamente
            progressTracker[data.file] = 100;
            const values = Object.values(progressTracker);
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / Math.max(values.length, 1));
            this.progresoDescarga.set(avg);
          }
        }
      });

      this.modeloListo.set(true);
      this.progresoDescarga.set(100);
      console.log('[Whisper] Modelo cargado y listo para transcripción local.');
    } catch (error) {
      console.error('[Whisper] Error cargando el modelo en el navegador:', error);
      throw new Error('No se pudo cargar el modelo de transcripción de voz local.');
    } finally {
      this.modeloCargando.set(false);
    }
  }

  /**
   * Transcribe un Blob de audio grabado en el navegador.
   * Convierte internamente el audio a Float32Array PCM de 16kHz.
   */
  async transcribir(audioBlob: Blob): Promise<string> {
    // Asegurar que el modelo esté cargado
    if (!this.transcriber) {
      await this.cargarModelo();
    }

    console.log('[Whisper] Decodificando audio para transcripción local...');
    const audioData = await this.prepararAudioParaWhisper(audioBlob);

    console.log('[Whisper] Iniciando inferencia en el navegador...');
    const startTime = performance.now();
    
    const response = await this.transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'spanish', // Forzar transcripción en español
      task: 'transcribe',
      return_timestamps: false
    });

    const endTime = performance.now();
    console.log(`[Whisper] Transcripción completada en ${((endTime - startTime) / 1000).toFixed(2)}s`);
    
    const texto = response && response.text ? response.text.trim() : '';
    console.log(`[Whisper] Texto transcrito: "${texto}"`);
    return texto;
  }

  /**
   * Decodifica un audio Blob (ej: WebM) y lo remuestrea a 16000Hz PCM Mono Float32Array.
   */
  private async prepararAudioParaWhisper(audioBlob: Blob): Promise<Float32Array> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API no está soportada en este navegador.');
    }

    // Instanciar un contexto de audio forzado a 16000Hz (frecuencia nativa que requiere Whisper)
    const audioCtx = new AudioContextClass({ sampleRate: 16000 });
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      // decodeAudioData decodifica y remuestrea al sampleRate del contexto
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // Obtener el primer canal de audio (mono)
      const channelData = audioBuffer.getChannelData(0);
      return channelData;
    } catch (e) {
      console.error('[Whisper] Error decodificando audio:', e);
      throw new Error('Error al decodificar el audio para el motor de transcripción.');
    } finally {
      // Cerrar el contexto de audio para liberar recursos
      await audioCtx.close();
    }
  }
}
