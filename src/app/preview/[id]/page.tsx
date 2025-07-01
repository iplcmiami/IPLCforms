'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import PDFViewer from '@/components/PDFViewer';

export const runtime = 'edge';

interface FieldSchema {
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

interface TemplateData {
  schemas: FieldSchema[][];
  basePdf?: string;
  sampledata?: Record<string, unknown>[];
}

interface FormData {
  id: string;
  name: string;
  description: string;
  schemas: FieldSchema[][];
  basePdf: string;
  sampledata: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function PreviewPage({ params }: Props) {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, unknown>>({});

  useEffect(() => {
    async function loadForm() {
      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/admin/forms/${resolvedParams.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to load form');
        }

        const data = await response.json();
        setFormData(data.form);

        // Get form data from URL params or use sample data
        const dataParam = searchParams.get('data');
        if (dataParam) {
          try {
            const parsedData = JSON.parse(dataParam);
            const dataToUse = Array.isArray(parsedData) ? parsedData[0] : parsedData;
            setFormInputs(dataToUse || {});
          } catch {
            // Fallback to sample data if parsing fails
            setFormInputs(data.form.sampledata?.[0] || {});
          }
        } else {
          setFormInputs(data.form.sampledata?.[0] || {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [params, searchParams]);

  const handlePDFGenerated = (pdfBytes: Uint8Array) => {
    // Create blob URL for the generated PDF
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    // Open PDF in new window for printing
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handlePDFDownload = (pdfBytes: Uint8Array, filename?: string) => {
    // Create download link
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${formData?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSummarize = async () => {
    if (!formData || !Object.keys(formInputs).length) return;

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formName: formData.name,
          formData: formInputs
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const result = await response.json();
      
      // Show summary in an alert for now (could be enhanced with a modal)
      alert(`AI Summary:\n\n${result.summary}`);
    } catch (err) {
      console.error('Error generating summary:', err);
      alert('Failed to generate AI summary. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Preview</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!formData) {
    return notFound();
  }

  // Create template data for PDFViewer
  const templateData: TemplateData = {
    schemas: formData.schemas,
    basePdf: formData.basePdf,
    sampledata: formData.sampledata
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Preview: {formData.name}</h1>
              {formData.description && (
                <p className="text-gray-600 mt-1">{formData.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSummarize}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                disabled={!Object.keys(formInputs).length}
              >
                AI Summary
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Info Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview Options</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Review your completed form:</p>
                <ul className="space-y-2">
                  <li>• PDF is generated automatically below</li>
                  <li>• Use download button in PDF viewer to save</li>
                  <li>• Use print button in PDF viewer to print</li>
                  <li>• Try &quot;AI Summary&quot; to get an intelligent overview</li>
                </ul>
                <div className="mt-4 p-3 bg-green-50 rounded border-l-4 border-green-400">
                  <p className="text-green-800 text-xs">
                    ✅ <strong>Ready:</strong> Your form is complete and ready for final processing.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Data Summary */}
            {Object.keys(formInputs).length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Data</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(formInputs).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key}:</span>
                      <span className="text-gray-900 font-medium">
                        {typeof value === 'string' ? (value.length > 20 ? `${value.substring(0, 20)}...` : value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              {formData.schemas.length > 0 ? (
                <PDFViewer
                  template={templateData}
                  data={formInputs}
                  onGenerate={handlePDFGenerated}
                  onDownload={handlePDFDownload}
                  className="w-full"
                  showControls={true}
                />
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="text-gray-400 text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Preview Available</h3>
                    <p className="text-gray-600">
                      This form template doesn&apos;t have any fields configured for preview.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}