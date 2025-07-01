/**
 * Authentication Middleware
 * Handles access control for different user types
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyCookie } from '@/lib/cookie-utils';

export interface AuthContext {
  userId: number;
  userType: 'admin' | 'user';
}

/**
 * Verify if the request has a valid session
 */
export async function verifySession(request: NextRequest): Promise<AuthContext | null> {
  try {
    const signedSessionToken = request.cookies.get('session')?.value;
    
    if (!signedSessionToken) {
      return null;
    }

    // Verify the signed cookie and extract the session token
    const sessionToken = await verifyCookie(signedSessionToken);
    
    if (!sessionToken) {
      return null;
    }

    const dbHelpers = getDatabase();
    const session = await dbHelpers.getSession(sessionToken);
    
    if (!session) {
      return null;
    }

    return {
      userId: session.user_id,
      userType: session.user_type
    };
  } catch (error) {
    console.error('Error verifying session:', error);
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | AuthContext> {
  const auth = await verifySession(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  return auth;
}

/**
 * Middleware to require admin authentication
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | AuthContext> {
  const auth = await verifySession(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  if (auth.userType !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }
  
  return auth;
}