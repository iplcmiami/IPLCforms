'use client';

import { useState, useEffect, useRef } from 'react';
import { Viewer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';
import { notFound } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

interface FormData {
  id: string;
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemas: any[];
  basePdf: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampledata: any[];
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
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inputs, setInputs] = useState<Record<string, any>[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerInstance = useRef<any>(null);

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
            setInputs(Array.isArray(parsedData) ? parsedData : [parsedData]);
          } catch {
            // Fallback to sample data if parsing fails
            setInputs(data.form.sampledata || [{}]);
          }
        } else {
          setInputs(data.form.sampledata || [{}]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [params, searchParams]);

  useEffect(() => {
    if (formData && viewerRef.current && formData.schemas.length > 0) {
      // Clear any existing viewer instance
      if (viewerInstance.current) {
        viewerInstance.current = null;
      }

      const container = viewerRef.current;
      container.innerHTML = '';

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const viewer = new Viewer({
          domContainer: container,
          template: {
            schemas: formData.schemas,
            basePdf: formData.basePdf || '',
            sampledata: formData.sampledata || [{}]
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          inputs: inputs,
          options: {
            theme: {
              token: {
                colorPrimary: '#3B82F6'
              }
            }
          }
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        viewerInstance.current = viewer;
      } catch (err) {
        console.error('Error initializing pdfme Viewer:', err);
        setError('Failed to initialize preview interface');
      }
    }

    return () => {
      if (viewerInstance.current) {
        viewerInstance.current = null;
      }
    };
  }, [formData, inputs]);

  const generatePDF = async () => {
    if (!formData || !inputs.length) return;

    setGenerating(true);
    try {
      const template = {
        schemas: formData.schemas,
        basePdf: formData.basePdf || '',
        sampledata: formData.sampledata || [{}]
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf = await generate({ template: template as any, inputs });
      
      // Create blob URL for the generated PDF
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([pdf.buffer as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!formData || !inputs.length) return;

    try {
      const template = {
        schemas: formData.schemas,
        basePdf: formData.basePdf || '',
        sampledata: formData.sampledata || [{}]
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf = await generate({ template: template as any, inputs });
      
      // Create download link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([pdf.buffer as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF');
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      window.print();
    }
  };

  const handleSummarize = async () => {
    if (!formData || !inputs.length) return;

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formName: formData.name,
          formData: inputs[0] || {}
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
                disabled={!inputs.length}
              >
                AI Summary
              </button>
              <button
                onClick={generatePDF}
                disabled={generating || !inputs.length}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate PDF'}
              </button>
              <button
                onClick={downloadPDF}
                disabled={!inputs.length}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Print
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
                  <li>• Click &quot;Generate PDF&quot; to create a downloadable file</li>
                  <li>• Use &quot;Download PDF&quot; to save to your device</li>
                  <li>• Click &quot;Print&quot; to print the form</li>
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
            {inputs.length > 0 && inputs[0] && Object.keys(inputs[0]).length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Data</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(inputs[0]).map(([key, value]) => (
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
                <div 
                  ref={viewerRef} 
                  className="w-full"
                  style={{ minHeight: '600px' }}
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

      {/* Generated PDF Display */}
      {pdfUrl && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated PDF</h3>
            <iframe
              src={pdfUrl}
              className="w-full h-96 border rounded"
              title="Generated PDF Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}