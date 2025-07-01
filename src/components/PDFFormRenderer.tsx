'use client';

import React, { useState, useEffect, useCallback } from 'react';

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

interface PDFFormRendererProps {
  template: TemplateData;
  onSubmit?: (data: Record<string, unknown>) => void;
  onFieldChange?: (fieldName: string, value: unknown) => void;
  className?: string;
}

export const PDFFormRenderer: React.FC<PDFFormRendererProps> = ({
  template,
  onSubmit,
  onFieldChange,
  className = ''
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data with sample data if available
  useEffect(() => {
    if (template.sampledata && template.sampledata.length > 0) {
      const initialData = { ...template.sampledata[0] };
      setFormData(initialData);
    }
  }, [template.sampledata]);

  // Get all fields from all pages
  const getAllFields = useCallback((): FieldSchema[] => {
    const allFields: FieldSchema[] = [];
    template.schemas.forEach(pageSchemas => {
      allFields.push(...pageSchemas);
    });
    return allFields;
  }, [template.schemas]);

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear any existing error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Notify parent component
    onFieldChange?.(fieldName, value);
  }, [errors, onFieldChange]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const allFields = getAllFields();

    allFields.forEach(field => {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.name] = `${field.name} is required`;
        }
      }

      // Type-specific validation
      const value = formData[field.name];
      if (value && typeof value === 'string') {
        switch (field.type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors[field.name] = 'Please enter a valid email address';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[field.name] = 'Please enter a valid number';
            }
            break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, getAllFields]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit]);

  const renderField = useCallback((field: FieldSchema) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const fieldId = `field-${field.name}`;

    const commonProps = {
      id: fieldId,
      name: field.name,
      className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`,
      placeholder: field.placeholder || field.name,
      required: field.required,
      style: {
        fontSize: field.fontSize ? `${field.fontSize}px` : '14px'
      }
    };

    let inputElement: React.ReactNode;

    switch (field.type) {
      case 'textarea':
        inputElement = (
          <textarea
            {...commonProps}
            value={value as string}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={3}
          />
        );
        break;

      case 'checkbox':
        inputElement = (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={fieldId}
              name={field.name}
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required={field.required}
            />
            <label htmlFor={fieldId} className="ml-2 text-sm text-gray-700">
              {field.placeholder || field.name}
            </label>
          </div>
        );
        break;

      case 'date':
        inputElement = (
          <input
            {...commonProps}
            type="date"
            value={value as string}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
        break;

      case 'number':
        inputElement = (
          <input
            {...commonProps}
            type="number"
            value={value as string}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
        break;

      case 'email':
        inputElement = (
          <input
            {...commonProps}
            type="email"
            value={value as string}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
        break;

      default: // text
        inputElement = (
          <input
            {...commonProps}
            type="text"
            value={value as string}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
        break;
    }

    return (
      <div key={field.name} className="mb-4">
        {field.type !== 'checkbox' && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {inputElement}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }, [formData, errors, handleFieldChange]);

  const allFields = getAllFields();

  if (allFields.length === 0) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <p>No form fields available in this template.</p>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Form</h2>
          <p className="text-gray-600">
            Please fill out all required fields marked with <span className="text-red-500">*</span>
          </p>
        </div>

        {/* Group fields by page if multiple pages exist */}
        {template.schemas.length > 1 ? (
          template.schemas.map((pageSchemas, pageIndex) => (
            <div key={pageIndex} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                Page {pageIndex + 1}
              </h3>
              <div className="space-y-4">
                {pageSchemas.map(renderField)}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-4">
            {allFields.map(renderField)}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-6 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Form'}
          </button>
        </div>

        {/* Form Data Preview (for development) */}
        {process.env.NODE_ENV === 'development' && Object.keys(formData).length > 0 && (
          <div className="mt-8 p-4 bg-gray-100 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Form Data (Development):</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
};

export default PDFFormRenderer;