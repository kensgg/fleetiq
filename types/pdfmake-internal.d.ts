/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'pdfmake/js/Printer' {
  import type { TDocumentDefinitions } from 'pdfmake/interfaces';

  export default class PdfPrinter {
    constructor(
      fontDescriptors: Record<string, unknown>,
      virtualfs?: unknown,
      urlResolver?: unknown,
      localAccessPolicy?: unknown,
    );
    createPdfKitDocument(
      docDefinition: TDocumentDefinitions,
      options?: Record<string, unknown>,
    ): Promise<any>;
  }
}

declare module 'pdfmake/js/virtual-fs' {
  const virtualFs: unknown;
  export default virtualFs;
}

declare module 'pdfmake/js/URLResolver' {
  export default class URLResolver {
    constructor(fs: unknown);
  }
}
