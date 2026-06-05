import type { OcrPageResult } from "../pdf/pdf-types.js";
import { type IOcrProvider, NullOcrProvider } from "./OcrProvider.js";
import { TesseractProvider } from "./TesseractProvider.js";

interface PdfJsPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }): { promise: Promise<void> };
}

export class OcrManager {
  private static provider: IOcrProvider | null = null;

  static async initialize(preferTesseract = true): Promise<void> {
    if (preferTesseract) {
      OcrManager.provider = new TesseractProvider();
    } else {
      OcrManager.provider = new NullOcrProvider();
    }
    await OcrManager.provider.initialize();
  }

  static async recognizePage(page: PdfJsPage, pageNumber: number): Promise<OcrPageResult> {
    if (!OcrManager.provider) {
      throw new Error("OCR provider is not initialized.");
    }

    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) {
      throw new Error("Could not get 2D rendering context.");
    }

    await page.render({ canvasContext, viewport }).promise;

    const result = await OcrManager.provider.recognizePage(canvas);
    return {
      ...result,
      pageNumber
    };
  }

  static terminate(): void {
    if (OcrManager.provider) {
      OcrManager.provider.terminate();
      OcrManager.provider = null;
    }
  }

  static isAvailable(): boolean {
    return OcrManager.provider !== null && OcrManager.provider.isAvailable();
  }
}
