import { NextRequest, NextResponse } from 'next/server';
import { DatabaseHelpers, Env } from '@/lib/db';

// Configure Edge Runtime for Cloudflare Pages
export const runtime = "edge";

interface CloudflareRequest extends NextRequest {
  env: Env;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Helper function to verify admin authentication
async function verifyAdminAuth(request: NextRequest, env: Env): Promise<boolean> {
  const sessionToken = request.cookies.get('admin-token')?.value;
  
  if (!sessionToken) {
    return false;
  }

  const dbHelpers = new DatabaseHelpers(env.DB);
  const session = await dbHelpers.getSession(sessionToken);
  
  return !!session && new Date(session.expires_at) > new Date();
}

// GET /api/admin/forms/[id] - Get a specific form
export async function GET(request: CloudflareRequest, context: RouteContext) {
  try {
    // Verify admin authentication
    if (!await verifyAdminAuth(request, request.env)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const formId = parseInt(id);

    if (isNaN(formId)) {
      return NextResponse.json(
        { error: 'Invalid form ID' },
        { status: 400 }
      );
    }

    const dbHelpers = new DatabaseHelpers(request.env.DB);
    const form = await dbHelpers.getFormById(formId);

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(form);

  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/forms/[id] - Update a specific form
export async function PUT(request: CloudflareRequest, context: RouteContext) {
  try {
    // Verify admin authentication
    if (!await verifyAdminAuth(request, request.env)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const formId = parseInt(id);

    if (isNaN(formId)) {
      return NextResponse.json(
        { error: 'Invalid form ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Form name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.template_data || typeof body.template_data !== 'object') {
      return NextResponse.json(
        { error: 'Template data is required and must be an object' },
        { status: 400 }
      );
    }

    const dbHelpers = new DatabaseHelpers(request.env.DB);
    
    // Check if form exists
    const existingForm = await dbHelpers.getFormById(formId);
    if (!existingForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Validate template data structure
    const templateData = body.template_data;
    if (!Array.isArray(templateData.schemas) || !Array.isArray(templateData.template)) {
      return NextResponse.json(
        { error: 'Template data must contain schemas and template arrays' },
        { status: 400 }
      );
    }

    // Update the form
    const success = await dbHelpers.updateForm(
      formId,
      body.name.trim(),
      templateData
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update form' },
        { status: 500 }
      );
    }

    // Get and return the updated form
    const updatedForm = await dbHelpers.getFormById(formId);
    return NextResponse.json(updatedForm);

  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/forms/[id] - Delete a specific form
export async function DELETE(request: CloudflareRequest, context: RouteContext) {
  try {
    // Verify admin authentication
    if (!await verifyAdminAuth(request, request.env)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const formId = parseInt(id);

    if (isNaN(formId)) {
      return NextResponse.json(
        { error: 'Invalid form ID' },
        { status: 400 }
      );
    }

    const dbHelpers = new DatabaseHelpers(request.env.DB);
    
    // Check if form exists
    const existingForm = await dbHelpers.getFormById(formId);
    if (!existingForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Check if form has submissions (optional - prevent deletion if submissions exist)
    const submissions = await dbHelpers.getSubmissionsByFormId(formId);
    if (submissions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete form with existing submissions. Please delete submissions first.' },
        { status: 409 }
      );
    }

    // Delete the form
    const success = await dbHelpers.deleteForm(formId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete form' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Form deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}