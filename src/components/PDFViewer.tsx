'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface FieldSchema {
  name: string;
  type: 'text' | 'number' | 'email' | 'date' | 'textarea' | 'checkbox';
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  required?: boolean;
  placeholder?: string;
}

export interface TemplateData {
  schemas: FieldSchema[][];
  basePdf?: string;
  sampledata?: Record<string, unknown>[];
}

interface PDFViewerProps {
  template: TemplateData;
  data: Record<string, unknown>;
  onGenerate?: (pdfBytes: Uint8Array) => void;
  onDownload?: (pdfBytes: Uint8Array, filename?: string) => void;
  className?: string;
  showControls?: boolean;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  template,
  data,
  onGenerate,
  onDownload,
  className = '',
  showControls = true
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate PDF with form data using html2pdf.js
  const generatePDF = useCallback(async (): Promise<Uint8Array> => {
    // Ensure we're running on the client side
    if (typeof window === 'undefined') {
      throw new Error('PDF generation is only available on the client side');
    }

    try {
      // Dynamically import PDF libraries on client side only
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      // Create HTML content for each page
      const htmlPages = template.schemas.map((pageSchemas) => {
        const pageHTML = `
          <div class="pdf-page" style="
            width: 8.5in;
            height: 11in;
            position: relative;
            background: white;
            margin: 0;
            padding: 0;
            page-break-after: always;
            font-family: Arial, sans-serif;
          ">
            ${pageSchemas.map(field => {
              const value = data[field.name];
              if (value === undefined || value === null) return '';

              const fontSize = field.fontSize || 12;
              const style = `
                position: absolute;
                left: ${field.x}px;
                top: ${field.y}px;
                width: ${field.width}px;
                height: ${field.height}px;
                font-size: ${fontSize}px;
                font-family: Arial, sans-serif;
                color: black;
                overflow: hidden;
                line-height: 1.2;
              `;

              switch (field.type) {
                case 'checkbox':
                  const checkboxSize = Math.min(field.width, field.height);
                  return `
                    <div style="${style}">
                      <div style="
                        width: ${checkboxSize}px;
                        height: ${checkboxSize}px;
                        border: 1px solid black;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: ${fontSize}px;
                      ">
                        ${Boolean(value) ? '✓' : ''}
                      </div>
                    </div>
                  `;

                case 'textarea':
                  const textValue = String(value);
                  const lines = textValue.split('\n');
                  return `
                    <div style="${style} padding: 2px;">
                      ${lines.map(line => `<div>${line || '&nbsp;'}</div>`).join('')}
                    </div>
                  `;

                default:
                  // Single line text (text, number, email, date)
                  return `
                    <div style="${style} padding: 2px; display: flex; align-items: center;">
                      ${String(value)}
                    </div>
                  `;
              }
            }).join('')}
          </div>
        `;
        return pageHTML;
      });

      // Combine all pages into one HTML document
      const fullHTML = `
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
              .pdf-page:last-child { page-break-after: avoid; }
            </style>
          </head>
          <body>
            ${htmlPages.join('')}
          </body>
        </html>
      `;

      // Create a temporary div to hold the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHTML;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);

      try {
        // Generate canvas from HTML using html2canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 612, // 8.5 inches * 72 DPI
          height: 792, // 11 inches * 72 DPI
          allowTaint: false
        });

        // Create PDF using jsPDF
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF({
          unit: 'pt',
          format: 'letter',
          orientation: 'portrait'
        });

        const imgWidth = 612; // Letter width in points
        const pageHeight = 792; // Letter height in points
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if needed
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Convert PDF to Uint8Array
        const pdfArrayBuffer = pdf.output('arraybuffer');
        return new Uint8Array(pdfArrayBuffer);

      } finally {
        // Clean up temporary element
        document.body.removeChild(tempDiv);
      }

    } catch (err) {
      console.error('PDF generation error:', err);
      throw new Error(`Failed to generate PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [template, data]);

  // Generate and display PDF
  const generateAndDisplay = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const pdfBytes = await generatePDF();
      setGeneratedPdfBytes(pdfBytes);

      // Create blob URL for preview
      const blob = new Blob([pdfBytes.slice()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      setPdfUrl(url);
      onGenerate?.(pdfBytes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [generatePDF, onGenerate, pdfUrl]);

  // Auto-generate on mount and data changes
  useEffect(() => {
    generateAndDisplay();
    
    // Cleanup function
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [template, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = useCallback(() => {
    if (!generatedPdfBytes) return;

    const blob = new Blob([generatedPdfBytes.slice()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `form-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onDownload?.(generatedPdfBytes, link.download);
  }, [generatedPdfBytes, onDownload]);

  const handleRegeneratePDF = useCallback(() => {
    generateAndDisplay();
  }, [generateAndDisplay]);

  // Get field count for display
  const getFieldCount = useCallback((): number => {
    return template.schemas.reduce((total, pageSchemas) => total + pageSchemas.length, 0);
  }, [template.schemas]);

  const getFilledFieldCount = useCallback((): number => {
    const allFields: FieldSchema[] = [];
    template.schemas.forEach(pageSchemas => {
      allFields.push(...pageSchemas);
    });
    
    return allFields.filter(field => {
      const value = data[field.name];
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [template.schemas, data]);

  if (error) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">PDF Generation Failed</h3>
          <p className="text-red-600 mb-4">{error}</p>
          {showControls && (
            <button
              onClick={handleRegeneratePDF}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-600">Generating PDF...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Controls Header */}
      {showControls && (
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">PDF Preview</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRegeneratePDF}
                disabled={isGenerating}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                onClick={handleDownload}
                disabled={!generatedPdfBytes}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download PDF
              </button>
            </div>
          </div>
          
          {/* Status Info */}
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span>
              Fields: {getFilledFieldCount()} / {getFieldCount()} filled
            </span>
            <span>
              Pages: {template.schemas.length}
            </span>
            {generatedPdfBytes && (
              <span>
                Size: {(generatedPdfBytes.length / 1024).toFixed(1)} KB
              </span>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="p-4">
        {pdfUrl ? (
          <div className="w-full">
            <iframe
              src={pdfUrl}
              className="w-full h-[600px] border border-gray-300 rounded-md"
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="w-full h-[600px] flex items-center justify-center bg-gray-50 border border-gray-300 rounded-md">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>PDF preview not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Debug Canvas (hidden) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PDFViewer;