/**
 * Admin Dashboard - Main admin interface
 * Lists all forms and provides actions to create, edit, or delete forms
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Form {
  id: number;
  name: string;
  template_data: string;
  created_at: string;
  updated_at: string;
}

export default function AdminDashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormName, setNewFormName] = useState('');

  // Load forms on component mount
  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/forms');
      
      if (!response.ok) {
        throw new Error('Failed to load forms');
      }
      
      const data = await response.json();
      setForms(data.forms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const createForm = async () => {
    if (!newFormName.trim()) {
      alert('Please enter a form name');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFormName.trim(),
          template_data: {
            schemas: [],
            basePdf: "",
            columns: []
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create form');
      }

      const data = await response.json();
      
      // Redirect to form builder for the new form
      window.location.href = `/admin/builder/${data.id}`;
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create form');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteForm = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/forms/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete form');
      }

      // Reload forms after deletion
      loadForms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete form');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading forms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={loadForms}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">IPLC Forms Admin</h1>
              <p className="text-gray-600">Manage your PDF forms and templates</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin/login"
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create New Form Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Form</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Enter form name..."
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && createForm()}
            />
            <button
              onClick={createForm}
              disabled={isCreating || !newFormName.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span className="text-lg">+</span>
              <span>{isCreating ? 'Creating...' : 'Create Form'}</span>
            </button>
          </div>
        </div>

        {/* Forms List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Forms ({forms.length})</h2>
          </div>

          {forms.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No forms created yet</p>
              <p className="text-gray-400 mt-2">Create your first form to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {forms.map((form) => (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{form.name}</div>
                        <div className="text-sm text-gray-500">ID: {form.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(form.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(form.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/forms/${form.id}`}
                            className="text-green-600 hover:text-green-900 px-2 py-1 rounded text-sm font-medium"
                            title="Preview Form"
                          >
                            👁️ View
                          </Link>
                          <Link
                            href={`/admin/builder/${form.id}`}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded text-sm font-medium"
                            title="Edit Form"
                          >
                            ✏️ Edit
                          </Link>
                          <button
                            onClick={() => deleteForm(form.id, form.name)}
                            className="text-red-600 hover:text-red-900 px-2 py-1 rounded text-sm font-medium"
                            title="Delete Form"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}