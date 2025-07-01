import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { hashSync } from '@edge-utils/bcrypt';
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

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await dbHelpers.getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = hashSync(password, 10);

    // Create the user
    const userId = await dbHelpers.createUser(username, passwordHash);

    // Generate session token
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Create session
    const sessionCreated = await dbHelpers.createSession(userId, 'user', sessionId, expiresAt);

    if (!sessionCreated) {
      throw new Error('Failed to create session');
    }

    // Sign the session token
    const signedToken = await signCookie(sessionId);

    const response = NextResponse.json({ success: true });
    
    // Set session cookie
    response.cookies.set('session', signedToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(expiresAt),
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}