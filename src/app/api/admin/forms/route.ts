/**
 * Admin Forms API Routes
 * Handles CRUD operations for PDF forms
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseHelpers, Env } from '@/lib/db';

interface CloudflareRequest extends NextRequest {
  env: Env;
}

interface TemplateData {
  schemas?: unknown[];
  basePdf?: string;
  columns?: unknown[];
}

interface RequestBody {
  name: string;
  template_data: TemplateData;
}

// GET /api/admin/forms - List all forms
export async function GET(request: CloudflareRequest) {
  try {
    const db = request.env?.DB;
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const dbHelpers = new DatabaseHelpers(db);
    const forms = await dbHelpers.getAllForms();

    return NextResponse.json({ forms });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

// POST /api/admin/forms - Create a new form
export async function POST(request: CloudflareRequest) {
  try {
    const db = request.env?.DB;
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body: RequestBody = await request.json();
    
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Form name is required' },
        { status: 400 }
      );
    }

    // Validate template_data structure
    if (!body.template_data || typeof body.template_data !== 'object') {
      return NextResponse.json(
        { error: 'Valid template_data is required' },
        { status: 400 }
      );
    }

    const dbHelpers = new DatabaseHelpers(db);
    
    // Create the form with proper template_data structure
    const templateData = {
      schemas: body.template_data.schemas || [],
      basePdf: body.template_data.basePdf || "",
      columns: body.template_data.columns || []
    };

    const formId = await dbHelpers.createForm(
      body.name.trim(),
      templateData
    );

    if (!formId) {
      return NextResponse.json(
        { error: 'Failed to create form' },
        { status: 500 }
      );
    }

    // Return the created form with its ID
    return NextResponse.json({
      id: formId,
      name: body.name.trim(),
      template_data: templateData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}