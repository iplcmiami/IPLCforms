import { NextRequest, NextResponse } from 'next/server';
import { DatabaseHelpers, Env } from '../../../../lib/db';
import crypto from 'crypto';

// Configure Edge Runtime for Cloudflare Pages
export const runtime = "edge";

// Type for Cloudflare Pages Functions request
interface CloudflareRequest extends NextRequest {
  env?: Env;
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Get database instance from Cloudflare binding
    // In Cloudflare Pages Functions, env is available on the request object
    const env = (request as CloudflareRequest).env;
    
    if (!env?.DB) {
      console.error('Database binding not found');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const dbHelpers = new DatabaseHelpers(env.DB);

    // Get admin user by username
    const adminUser = await dbHelpers.getAdminByUsername('admin');

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Simple password comparison (in production, you'd use proper hashing)
    // For now, we'll assume password is stored as plain text for simplicity
    if (adminUser.password_hash !== password) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Create session in database
    const sessionCreated = await dbHelpers.createSession(adminUser.id, sessionId, expiresAt);

    if (!sessionCreated) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Create response with session cookie
    const response = NextResponse.json({ success: true });

    // Set HTTP-only cookie with session token
    response.cookies.set('admin-token', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
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