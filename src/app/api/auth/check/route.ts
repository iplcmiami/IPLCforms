import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/middleware/auth';
import { getDatabase } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const dbHelpers = getDatabase();
  let username = '';

  try {
    if (session.userType === 'admin') {
      // For admin users, we need to query the admin_users table
      const admin = await dbHelpers.getAdminById(session.userId);
      if (admin) {
        username = admin.username;
      }
    } else {
      // For regular users, use getUserById
      const user = await dbHelpers.getUserById(session.userId);
      if (user) {
        username = user.username;
      }
    }
  } catch (error) {
    console.error('Error fetching user details:', error);
  }

  return NextResponse.json({
    authenticated: true,
    username: username,
    userType: session.userType
  });
}