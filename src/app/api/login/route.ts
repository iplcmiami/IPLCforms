import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { compareSync } from '@edge-utils/bcrypt';
import { signCookie } from '@/lib/cookie-utils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const dbHelpers = getDatabase();

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get user by username
    const user = await dbHelpers.getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Create session
    const sessionCreated = await dbHelpers.createSession(user.id, 'user', sessionId, expiresAt);

    if (!sessionCreated) {
      throw new Error('Failed to create session');
    }

    // Sign the session token
    const signedToken = await signCookie(sessionId);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      }
    });
    
    // Set signed session cookie
    response.cookies.set('session', signedToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(expiresAt),
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}