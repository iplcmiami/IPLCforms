'use client';

import { useState, useCallback, useRef } from 'react';
import html2pdf from 'html2pdf.js';

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

interface PDFTemplateDesignerProps {
  initialTemplate?: TemplateData;
  onTemplateChange?: (template: TemplateData) => void;
}

export default function PDFTemplateDesigner({
  initialTemplate,
  onTemplateChange
}: PDFTemplateDesignerProps) {
  const [template, setTemplate] = useState<TemplateData>(
    initialTemplate || { schemas: [[]], sampledata: [{}] }
  );
  const [selectedField, setSelectedField] = useState<FieldSchema | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const designAreaRef = useRef<HTMLDivElement>(null);

  const fieldTypes = [
    { type: 'text', label: 'Text Input', icon: '📝' },
    { type: 'number', label: 'Number Input', icon: '🔢' },
    { type: 'email', label: 'Email Input', icon: '📧' },
    { type: 'date', label: 'Date Input', icon: '📅' },
    { type: 'textarea', label: 'Text Area', icon: '📄' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑️' },
  ] as const;

  const addField = useCallback((type: FieldSchema['type']) => {
    const newField: FieldSchema = {
      name: `field_${Date.now()}`,
      type,
      x: 100,
      y: 100,
      width: type === 'checkbox' ? 20 : 150,
      height: type === 'textarea' ? 80 : type === 'checkbox' ? 20 : 30,
      fontSize: 12,
      required: false,
      placeholder: `Enter ${type}`
    };

    setTemplate(prev => {
      const newSchemas = [...prev.schemas];
      if (newSchemas.length <= currentPage) {
        // Add pages if needed
        for (let i = newSchemas.length; i <= currentPage; i++) {
          newSchemas.push([]);
        }
      }
      newSchemas[currentPage] = [...(newSchemas[currentPage] || []), newField];
      
      const updated = { ...prev, schemas: newSchemas };
      onTemplateChange?.(updated);
      return updated;
    });
  }, [currentPage, onTemplateChange]);

  const updateField = useCallback((updatedField: FieldSchema) => {
    setTemplate(prev => {
      const newSchemas = [...prev.schemas];
      const pageFields = newSchemas[currentPage] || [];
      const fieldIndex = pageFields.findIndex(f => f.name === updatedField.name);
      
      if (fieldIndex >= 0) {
        newSchemas[currentPage] = [
          ...pageFields.slice(0, fieldIndex),
          updatedField,
          ...pageFields.slice(fieldIndex + 1)
        ];
      }
      
      const updated = { ...prev, schemas: newSchemas };
      onTemplateChange?.(updated);
      return updated;
    });
    setSelectedField(updatedField);
  }, [currentPage, onTemplateChange]);

  const deleteField = useCallback((fieldName: string) => {
    setTemplate(prev => {
      const newSchemas = [...prev.schemas];
      newSchemas[currentPage] = (newSchemas[currentPage] || []).filter(f => f.name !== fieldName);
      
      const updated = { ...prev, schemas: newSchemas };
      onTemplateChange?.(updated);
      return updated;
    });
    setSelectedField(null);
  }, [currentPage, onTemplateChange]);

  const addPage = useCallback(() => {
    setTemplate(prev => {
      const updated = { ...prev, schemas: [...prev.schemas, []] };
      onTemplateChange?.(updated);
      return updated;
    });
    setCurrentPage(template.schemas.length);
  }, [template.schemas.length, onTemplateChange]);

  const generatePreview = useCallback(async () => {
    if (!template.schemas.length) return;
    
    setIsGeneratingPreview(true);
    try {
      // Create HTML representation of all pages
      const htmlPages = template.schemas.map((pageSchemas, pageIndex) => {
        const fieldsHtml = pageSchemas.map(field => {
          const baseStyle = `position: absolute; left: ${field.x}px; top: ${field.y}px; width: ${field.width}px; height: ${field.height}px; font-size: ${field.fontSize || 12}px; border: 1px solid #ccc; padding: 4px; box-sizing: border-box;`;
          
          switch (field.type) {
            case 'checkbox':
              return `<div style="${baseStyle} display: flex; align-items: center; justify-content: center; background: white;">☐</div>`;
            case 'textarea':
              return `<div style="${baseStyle} background: white; line-height: 1.4; overflow: hidden;">${field.placeholder || 'Textarea'}</div>`;
            default:
              return `<div style="${baseStyle} background: white; line-height: ${field.height}px; overflow: hidden;">${field.placeholder || field.type}</div>`;
          }
        }).join('');

        return `
          <div style="position: relative; width: 210mm; height: 297mm; background: white; margin: 0; padding: 20px; box-sizing: border-box; page-break-after: ${pageIndex < template.schemas.length - 1 ? 'always' : 'auto'};">
            <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Template Preview - Page ${pageIndex + 1}</h3>
            ${fieldsHtml}
          </div>
        `;
      }).join('');

      // Create temporary container
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlPages;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);

      // Generate PDF
      const options = {
        margin: 0,
        filename: 'template-preview.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(options).from(tempDiv).save();

      // Cleanup
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [template]);

  const currentPageFields = template.schemas[currentPage] || [];

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar - Field Types */}
      <div className="w-64 bg-white border-r p-4">
        <h3 className="font-semibold mb-4">Field Types</h3>
        <div className="space-y-2 mb-6">
          {fieldTypes.map((fieldType) => (
            <button
              key={fieldType.type}
              onClick={() => addField(fieldType.type as FieldSchema['type'])}
              className="w-full p-3 text-left border border-gray-200 rounded hover:bg-gray-50 flex items-center"
            >
              <span className="mr-2">{fieldType.icon}</span>
              {fieldType.label}
            </button>
          ))}
        </div>

        {/* Page Controls */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Pages</h4>
          <div className="flex items-center gap-2 mb-2">
            <select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="flex-1 px-2 py-1 border rounded"
            >
              {template.schemas.map((_, index) => (
                <option key={index} value={index}>Page {index + 1}</option>
              ))}
            </select>
            <button
              onClick={addPage}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              +
            </button>
          </div>
          
          <button
            onClick={generatePreview}
            disabled={isGeneratingPreview || !currentPageFields.length}
            className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {isGeneratingPreview ? 'Generating...' : 'Preview PDF'}
          </button>
        </div>

        {/* Field Properties */}
        {selectedField && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-2">Field Properties</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={selectedField.name}
                onChange={(e) => updateField({ ...selectedField, name: e.target.value })}
                placeholder="Field name"
                className="w-full px-2 py-1 border rounded"
              />
              <input
                type="number"
                value={selectedField.x}
                onChange={(e) => updateField({ ...selectedField, x: Number(e.target.value) })}
                placeholder="X position"
                className="w-full px-2 py-1 border rounded"
              />
              <input
                type="number"
                value={selectedField.y}
                onChange={(e) => updateField({ ...selectedField, y: Number(e.target.value) })}
                placeholder="Y position"
                className="w-full px-2 py-1 border rounded"
              />
              <input
                type="number"
                value={selectedField.width}
                onChange={(e) => updateField({ ...selectedField, width: Number(e.target.value) })}
                placeholder="Width"
                className="w-full px-2 py-1 border rounded"
              />
              <input
                type="number"
                value={selectedField.height}
                onChange={(e) => updateField({ ...selectedField, height: Number(e.target.value) })}
                placeholder="Height"
                className="w-full px-2 py-1 border rounded"
              />
              <button
                onClick={() => deleteField(selectedField.name)}
                className="w-full px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete Field
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Design Area */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded shadow-lg h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Template Designer - Page {currentPage + 1}</h2>
          </div>
          
          <div
            ref={designAreaRef}
            className="relative bg-gray-50 m-4 rounded"
            style={{ height: 'calc(100% - 80px)', minHeight: '600px' }}
          >
            {/* Design Canvas */}
            <div className="relative w-full h-full bg-white border-2 border-dashed border-gray-300 overflow-auto">
              {currentPageFields.map((field) => (
                <div
                  key={field.name}
                  onClick={() => setSelectedField(field)}
                  className={`absolute border-2 p-1 cursor-pointer ${
                    selectedField?.name === field.name ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                  }`}
                  style={{
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                    fontSize: field.fontSize || 12
                  }}
                >
                  <span className="text-xs text-gray-600">
                    {field.type === 'checkbox' ? '☐' : field.placeholder || field.name}
                  </span>
                </div>
              ))}
              
              {/* Empty state */}
              {currentPageFields.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">No fields on this page</p>
                    <p className="text-sm">Click a field type from the sidebar to add it here</p>
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