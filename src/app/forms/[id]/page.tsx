'use client';

import { useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import PDFFormRenderer from '../../../components/PDFFormRenderer';



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

interface AuthInfo {
  authenticated: boolean;
  username?: string;
  userType?: 'admin' | 'user';
}

export default function FormFillPage({ params }: Props) {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, unknown>[]>([]);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndLoadForm() {
      try {
        // Check authentication first
        const authResponse = await fetch('/api/auth/check');
        
        if (!authResponse.ok) {
          // Not authenticated, redirect to login
          router.push('/login');
          return;
        }

        const authData = await authResponse.json();
        setAuthInfo(authData);

        // Now load the form
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
        
        // Initialize inputs with sample data or empty objects
        const initialInputs = data.form.sampledata && data.form.sampledata.length > 0
          ? [...data.form.sampledata]
          : [{}];
        setInputs(initialInputs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoadForm();
  }, [params, router]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    console.log('Field changed:', fieldName, value);
    setInputs(prev => [{
      ...prev[0],
      [fieldName]: value
    }]);
  };

  const handleSave = async () => {
    if (!formData || !inputs.length) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: formData.id,
          data: inputs,
          submittedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save form submission');
      }

      setSaveMessage('Form submission saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save form submission');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePreview = async () => {
    if (!formData) return;
    
    // Navigate to preview page with current form data
    const queryParams = new URLSearchParams({
      data: JSON.stringify(inputs)
    }).toString();
    
    window.open(`/preview/${formData.id}?${queryParams}`, '_blank');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Form</h1>
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
              <h1 className="text-2xl font-bold text-gray-900">{formData.name}</h1>
              {formData.description && (
                <p className="text-gray-600 mt-1">{formData.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {authInfo && (
                <div className="text-sm text-gray-600">
                  Logged in as <span className="font-medium">{authInfo.username}</span>
                  {authInfo.userType === 'admin' && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Admin
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={!inputs.length}
                >
                  Preview & Generate PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !inputs.length}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className={`p-4 rounded-lg ${
            saveMessage.includes('successfully') 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {saveMessage}
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Instructions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Fill out the form fields on the right:</p>
                <ul className="space-y-2">
                  <li>• Complete all required fields marked with *</li>
                  <li>• Use &quot;Preview & Generate PDF&quot; to create a final PDF</li>
                  <li>• Click &quot;Save Draft&quot; to save your progress</li>
                  <li>• Use &quot;Print&quot; to print the current form view</li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-blue-800 text-xs">
                    💡 <strong>Tip:</strong> Your changes are automatically saved as you type.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              {formData.schemas.length > 0 ? (
                <PDFFormRenderer
                  template={formData}
                  onFieldChange={handleFieldChange}
                />
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="text-gray-400 text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Form Fields</h3>
                    <p className="text-gray-600">
                      This form template doesn&apos;t have any fields configured yet.
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