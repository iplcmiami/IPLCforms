import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { getDatabase } from '@/lib/db';

// GET endpoint to list all forms
export async function GET(request: NextRequest) {
  // Check authentication (both regular users and admins can access)
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  try {
    const db = getDatabase();
    const forms = await db.getAllForms();
    
    return NextResponse.json({
      forms: forms || []
    });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}