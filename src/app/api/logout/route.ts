import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/db';
import { verifyCookie } from '@/lib/cookie-utils';

export const runtime = 'edge';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const signedToken = cookieStore.get('session')?.value;

    if (!signedToken) {
      return NextResponse.json({ message: 'Already logged out' });
    }

    // Verify and extract the actual session token
    const sessionToken = await verifyCookie(signedToken);
    if (!sessionToken) {
      // Invalid signature, clear the cookie anyway
      const response = NextResponse.json({
        message: 'Invalid session'
      });
      response.cookies.set('session', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      return response;
    }

    // Delete session from database
    const dbHelpers = getDatabase();
    await dbHelpers.deleteSession(sessionToken);

    // Clear the session cookie
    const response = NextResponse.json({ 
      message: 'Logged out successfully' 
    });

    response.cookies.set('session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}