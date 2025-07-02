'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFTemplateDesigner from '@/components/PDFTemplateDesigner';

interface Form {
  id: number;
  name: string;
  template_data: string;
  created_at: string;
  updated_at: string;
}

// Field schema interface
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

// Template data structure
interface Template {
  schemas: FieldSchema[][];
  basePdf?: string;
  sampledata?: Record<string, unknown>[];
}

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState<Template>({ schemas: [] });

  // Unwrap params
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    const loadForm = async () => {
      try {
        const response = await fetch(`/api/admin/forms/${resolvedParams.id}`);
        
        // Check for authentication
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Form not found');
          } else {
            setError('Failed to load form');
          }
          return;
        }

        const formData = await response.json();
        setForm(formData);

        // Parse template data
        let parsedTemplate: Template = { schemas: [] };
        try {
          if (formData.template_data) {
            parsedTemplate = JSON.parse(formData.template_data);
          }
        } catch (e) {
          console.error('Error parsing template data:', e);
          parsedTemplate = { schemas: [] };
        }

        setTemplate(parsedTemplate);
      } catch (error) {
        console.error('Error loading form:', error);
        setError('Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [resolvedParams, router]);


  const handleSave = async () => {
    if (!form || !resolvedParams) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/forms/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          template_data: JSON.stringify(template)
        }),
      });

      // Check for authentication
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save form' }));
        throw new Error(errorData.error || 'Failed to save form');
      }

      // Update local state
      const updatedTemplateData = JSON.stringify(template);
      setForm(prev => prev ? { ...prev, template_data: updatedTemplateData } : null);

      // Show success message briefly
      const successMessage = document.createElement('div');
      successMessage.textContent = 'Form saved successfully!';
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);

    } catch (error) {
      console.error('Error saving form:', error);
      setError(error instanceof Error ? error.message : 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form builder...</p>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Form Builder: {form?.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Design your PDF template using the drag-and-drop interface
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Designer Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Instructions */}
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Instructions</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload a PDF template using the &quot;Upload PDF&quot; button</li>
              <li>• Drag and drop form fields onto your PDF template</li>
              <li>• Configure field properties using the right panel</li>
              <li>• Use &quot;Preview&quot; to test your template with sample data</li>
              <li>• Click &quot;Save Template&quot; when you&apos;re satisfied with your design</li>
            </ul>
          </div>

          {/* PDF Template Designer */}
          <PDFTemplateDesigner
            initialTemplate={template}
            onTemplateChange={setTemplate}
          />
        </div>
      </div>
    </div>
  );
}