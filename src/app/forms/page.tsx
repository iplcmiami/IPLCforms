'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';



interface Form {
  id: string;
  name: string;
  createdAt: string;
}

interface AuthInfo {
  isAuthenticated: boolean;
  username: string | null;
  isAdmin: boolean;
}

export default function FormsListPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<AuthInfo>({
    isAuthenticated: false,
    username: null,
    isAdmin: false
  });

  const loadForms = useCallback(async () => {
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load forms');
      }
      
      const data = await response.json();
      setForms(data);
    } catch (error) {
      console.error('Error loading forms:', error);
      setError('Failed to load forms. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      
      if (data.authenticated) {
        setAuthInfo({
          isAuthenticated: true,
          username: data.username,
          isAdmin: data.userType === 'admin'
        });
        loadForms();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  }, [router, loadForms]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading forms...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with user info and logout */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Available Forms</h1>
              <p className="text-gray-600 mt-1">Select a form to fill out</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-gray-700">Logged in as: </span>
                <span className="font-semibold">{authInfo.username}</span>
                {authInfo.isAdmin && (
                  <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Forms list */}
        {error ? (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500">No forms available at the moment.</p>
            {authInfo.isAdmin && (
              <Link
                href="/admin"
                className="mt-4 inline-block text-blue-600 hover:text-blue-500"
              >
                Go to Admin Dashboard to create forms
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Link
                key={form.id}
                href={`/forms/${form.id}`}
                className="block bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {form.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Created: {new Date(form.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-4 text-blue-600 hover:text-blue-500">
                  Fill out form →
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Navigation links */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-500 mr-4"
          >
            ← Back to Home
          </Link>
          {authInfo.isAdmin && (
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-500"
            >
              Admin Dashboard →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}