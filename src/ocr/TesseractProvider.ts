import type { OcrPageResult } from "../pdf/pdf-types.js";
import type { IOcrProvider } from "./OcrProvider.js";

interface TesseractWorker {
  recognize(
    image: ImageData | HTMLCanvasElement
  ): Promise<{ data: { text: string; confidence: number } }>;
  terminate(): Promise<void>;
}

interface TesseractStatic {
  createWorker(language: string): Promise<TesseractWorker>;
}

interface GlobalWithTesseract {
  Tesseract?: TesseractStatic;
}

export class TesseractProvider implements IOcrProvider {
  name = "tesseract";
  private worker: TesseractWorker | null = null;

  isAvailable(): boolean {
    const g = globalThis as unknown as GlobalWithTesseract;
    return g.Tesseract !== undefined;
  }

  async initialize(): Promise<void> {
    if (this.worker) {
      return;
    }

    await this.loadTesseractScript();

    const g = globalThis as unknown as GlobalWithTesseract;
    if (!g.Tesseract) {
      throw new Error("Tesseract.js script loaded but global Tesseract object not found.");
    }
    this.worker = await g.Tesseract.createWorker("eng");
  }

  async recognizePage(imageData: ImageData | HTMLCanvasElement): Promise<OcrPageResult> {
    if (!this.worker) {
      throw new Error("Tesseract provider is not initialized.");
    }

    const start = Date.now();
    const result = await this.worker.recognize(imageData);
    const durationMs = Date.now() - start;

    return {
      pageNumber: 0,
      text: result.data.text || "",
      confidence: result.data.confidence || 0,
      durationMs
    };
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate().catch((): void => {});
      this.worker = null;
    }
  }

  private async loadTesseractScript(): Promise<void> {
    const g = globalThis as unknown as GlobalWithTesseract;
    if (g.Tesseract) {
      return;
    }

    return new Promise<void>((resolve, reject): void => {
      const cdnUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      const existing = document.querySelector(`script[src="${cdnUrl}"]`);

      if (existing) {
        const interval = setInterval((): void => {
          const innerG = globalThis as unknown as GlobalWithTesseract;
          if (innerG.Tesseract) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        return;
      }

      const script = document.createElement("script");
      script.src = cdnUrl;
      script.async = true;

      const timeout = setTimeout((): void => {
        script.remove();
        reject(new Error("Timeout loading Tesseract.js from CDN"));
      }, 30000);

      script.onload = (): void => {
        const innerG = globalThis as unknown as GlobalWithTesseract;
        if (innerG.Tesseract) {
          clearTimeout(timeout);
          resolve();
        } else {
          const poll = setInterval((): void => {
            const pollG = globalThis as unknown as GlobalWithTesseract;
            if (pollG.Tesseract) {
              clearInterval(poll);
              clearTimeout(timeout);
              resolve();
            }
          }, 50);

          setTimeout((): void => {
            clearInterval(poll);
            clearTimeout(timeout);
            reject(new Error("Tesseract loaded but global object was not set"));
          }, 2000);
        }
      };

      script.onerror = (): void => {
        clearTimeout(timeout);
        script.remove();
        reject(new Error("Failed to load Tesseract.js script"));
      };

      document.head.appendChild(script);
    });
  }
}
