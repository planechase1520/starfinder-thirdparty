import type { OcrPageResult } from "../pdf/pdf-types.js";

export interface IOcrProvider {
  name: string;
  isAvailable(): boolean;
  recognizePage(imageData: ImageData | HTMLCanvasElement): Promise<OcrPageResult>;
  initialize(): Promise<void>;
  terminate(): void;
}

export class NullOcrProvider implements IOcrProvider {
  name = "null";

  isAvailable(): boolean {
    return false;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  recognizePage(_imageData: ImageData | HTMLCanvasElement): Promise<OcrPageResult> {
    return Promise.resolve({
      pageNumber: 0,
      text: "",
      confidence: 0,
      durationMs: 0
    });
  }

  terminate(): void {}
}
