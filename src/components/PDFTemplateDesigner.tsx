'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { PDFDocument } from 'pdf-lib';

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [, setPdfUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fieldTypes = useMemo(() => [
    { type: 'text', label: 'Text Input', icon: '📝' },
    { type: 'number', label: 'Number Input', icon: '🔢' },
    { type: 'email', label: 'Email Input', icon: '📧' },
    { type: 'date', label: 'Date Input', icon: '📅' },
    { type: 'textarea', label: 'Text Area', icon: '📄' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑️' },
  ] as const, []);

  const handlePDFUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const dataUrl = `data:application/pdf;base64,${base64String}`;
      
      setTemplate(prev => ({ ...prev, basePdf: base64String }));
      setPdfUrl(dataUrl);
      
      // Create canvas preview of first page
      const pdf = await PDFDocument.load(arrayBuffer);
      const page = pdf.getPage(0);
      const { width, height } = page.getSize();
      
      // Update canvas size to match PDF
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = width * 0.5; // Scale down for UI
        canvas.height = height * 0.5;
        
        if (ctx) {
          ctx.fillStyle = '#f8f9fa';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#dee2e6';
          ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF file');
    }
  }, []);

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
      if (newSchemas.length === 0) newSchemas.push([]);
      newSchemas[0] = [...(newSchemas[0] || []), newField];
      
      const updated = { ...prev, schemas: newSchemas };
      onTemplateChange?.(updated);
      return updated;
    });
  }, [onTemplateChange]);

  const updateField = useCallback((updatedField: FieldSchema) => {
    setTemplate(prev => {
      const newSchemas = prev.schemas.map(pageSchema => 
        pageSchema.map(field => 
          field.name === updatedField.name ? updatedField : field
        )
      );
      
      const updated = { ...prev, schemas: newSchemas };
      onTemplateChange?.(updated);
      return updated;
    });
    setSelectedField(updatedField);
  }, [onTemplateChange]);

  const deleteField = useCallback((fieldName: string) => {
    setTemplate(prev => {
      const newSchemas = prev.schemas.map(pageSchema => 
        pageSchema.filter(field => field.name !== fieldName)
      );
      
      const updated = { ...prev, schemas: newSchemas };
      onTemplateChange?.(updated);
      return updated;
    });
    setSelectedField(null);
  }, [onTemplateChange]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 2; // Scale back up
    const y = (event.clientY - rect.top) * 2;
    
    // Check if clicked on existing field
    const clickedField = template.schemas[0]?.find(field => 
      x >= field.x && x <= field.x + field.width &&
      y >= field.y && y <= field.y + field.height
    );
    
    setSelectedField(clickedField || null);
  }, [template.schemas]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedField || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 2;
    const y = (event.clientY - rect.top) * 2;
    
    setIsDragging(true);
    setDragOffset({
      x: x - selectedField.x,
      y: y - selectedField.y
    });
  }, [selectedField]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedField || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 2;
    const y = (event.clientY - rect.top) * 2;
    
    const updatedField = {
      ...selectedField,
      x: Math.max(0, x - dragOffset.x),
      y: Math.max(0, y - dragOffset.y)
    };
    
    updateField(updatedField);
  }, [isDragging, selectedField, dragOffset, updateField]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Render fields on canvas
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#dee2e6';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw fields
    template.schemas[0]?.forEach(field => {
      const x = field.x * 0.5; // Scale down for display
      const y = field.y * 0.5;
      const width = field.width * 0.5;
      const height = field.height * 0.5;
      
      // Draw field rectangle
      ctx.fillStyle = selectedField?.name === field.name ? '#e3f2fd' : '#ffffff';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = selectedField?.name === field.name ? '#2196f3' : '#adb5bd';
      ctx.lineWidth = selectedField?.name === field.name ? 2 : 1;
      ctx.strokeRect(x, y, width, height);
      
      // Draw field label
      ctx.fillStyle = '#495057';
      ctx.font = '10px Arial';
      ctx.fillText(field.name, x + 2, y - 2);
      
      // Draw field type icon
      const typeInfo = fieldTypes.find(t => t.type === field.type);
      if (typeInfo) {
        ctx.font = '12px Arial';
        ctx.fillText(typeInfo.icon, x + 2, y + height - 2);
      }
    });
  }, [template.schemas, selectedField, fieldTypes]);

  // Re-render canvas when template changes
  useState(() => {
    renderCanvas();
  });

  return (
    <div className="flex h-full">
      {/* Field Palette */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Form Fields</h3>
        
        {/* PDF Upload */}
        <div className="mb-6">
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handlePDFUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
          >
            📎 Upload PDF Template
          </button>
        </div>
        
        {/* Field Types */}
        <div className="space-y-2 mb-6">
          {fieldTypes.map((fieldType) => (
            <button
              key={fieldType.type}
              onClick={() => addField(fieldType.type)}
              className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
            >
              <span className="mr-2">{fieldType.icon}</span>
              {fieldType.label}
            </button>
          ))}
        </div>
        
        {/* Field Properties */}
        {selectedField && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Field Properties</h4>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Field Name
              </label>
              <input
                type="text"
                value={selectedField.name}
                onChange={(e) => updateField({ ...selectedField, name: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={selectedField.placeholder || ''}
                onChange={(e) => updateField({ ...selectedField, placeholder: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  value={selectedField.width}
                  onChange={(e) => updateField({ ...selectedField, width: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="number"
                  value={selectedField.height}
                  onChange={(e) => updateField({ ...selectedField, height: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={selectedField.required || false}
                  onChange={(e) => updateField({ ...selectedField, required: e.target.checked })}
                  className="mr-2"
                />
                Required field
              </label>
            </div>
            
            <button
              onClick={() => deleteField(selectedField.name)}
              className="w-full bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
            >
              🗑️ Delete Field
            </button>
          </div>
        )}
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 p-4">
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-2 text-sm text-gray-600">
            Design Area - Click to select fields, drag to move
          </div>
          <div className="p-4">
            <canvas
              ref={canvasRef}
              width={600}
              height={800}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="border border-gray-300 cursor-crosshair"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}