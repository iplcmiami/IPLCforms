import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { comparePassword } from '@/lib/password-utils';
import { signCookie } from '@/lib/cookie-utils';


export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get database instance using centralized database utility
    const dbHelpers = getDatabase();

    // Get admin user by username from request
    const adminUser = await dbHelpers.getAdminByUsername(username);

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Use Web Crypto API to compare password with hashed password
    const isPasswordValid = await comparePassword(password, adminUser.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate session token using crypto.randomUUID()
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Create session in database
    const sessionCreated = await dbHelpers.createSession(adminUser.id, 'admin', sessionToken, expiresAt);

    if (!sessionCreated) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Sign the session token
    const signedToken = await signCookie(sessionToken);

    // Create response with session cookie
    const response = NextResponse.json({ success: true });

    // Set signed session cookie
    response.cookies.set('session', signedToken, {
      httpOnly: true,
      secure: true, // Always use secure in Cloudflare Workers
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}