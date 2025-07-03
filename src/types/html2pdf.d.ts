declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      logging?: boolean;
      width?: number;
      height?: number;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
    };
  }

  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker;
    from(element: Element | string): Html2PdfWorker;
    save(): Promise<void>;
    outputPdf(type: 'blob'): Promise<Blob>;
    outputPdf(type: 'datauristring'): Promise<string>;
    outputPdf(type: 'arraybuffer'): Promise<ArrayBuffer>;
  }

  function html2pdf(): Html2PdfWorker;
  
  export = html2pdf;
}