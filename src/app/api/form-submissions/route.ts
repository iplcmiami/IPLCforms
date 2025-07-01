/**
 * Form Submissions API
 * Handles saving form submissions to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';


interface FormSubmissionRequest {
  formId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  submittedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: FormSubmissionRequest = await request.json();
    const { formId, data, submittedAt } = body;

    // Validate required fields
    if (!formId || !data || !submittedAt) {
      return NextResponse.json(
        { error: 'Missing required fields: formId, data, and submittedAt are required' },
        { status: 400 }
      );
    }

    // Validate formId is a valid number
    const formIdNum = parseInt(formId, 10);
    if (isNaN(formIdNum)) {
      return NextResponse.json(
        { error: 'Invalid formId: must be a valid number' },
        { status: 400 }
      );
    }

    // Validate data is an array
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data: must be an array' },
        { status: 400 }
      );
    }

    // Get database instance
    const dbHelpers = getDatabase();

    // Check if the form exists
    const existingForm = await dbHelpers.getFormById(formIdNum);
    if (!existingForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Create the submission
    const submissionId = await dbHelpers.createSubmission(formIdNum, {
      formData: data,
      submittedAt: submittedAt,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        submissionId: submissionId,
        message: 'Form submission saved successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error saving form submission:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Database binding not found')) {
        return NextResponse.json(
          { error: 'Database configuration error' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        return NextResponse.json(
          { error: 'Invalid form ID: form does not exist' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit form data.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit form data.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit form data.' },
    { status: 405 }
  );
}