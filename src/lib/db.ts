/**
 * Database utilities for Cloudflare D1
 * Handles all database operations for the IPLC Forms application
 */

// Cloudflare D1 types
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    served_by?: string;
    duration?: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
  changes: number; // Also available at top level for compatibility
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// Types for our database schema
export interface Form {
  id: number;
  name: string;
  template_data: string; // JSON string of pdfme template
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: number;
  form_id: number;
  form_data: string; // JSON string of form field values
  pdf_url?: string;
  ai_summary?: string;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  is_active: boolean;
}

export interface Session {
  id: string;
  user_id: number;
  user_type: 'admin' | 'user';
  expires_at: string;
  created_at: string;
}

// Database helper functions
export class DatabaseHelpers {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // Form operations
  async getAllForms(): Promise<Form[]> {
    const result = await this.db.prepare(`
      SELECT id, name, template_data, created_at, updated_at
      FROM forms
      ORDER BY updated_at DESC
    `).all();
    
    return result.results as Form[];
  }

  async getFormById(id: number): Promise<Form | null> {
    const result = await this.db.prepare(`
      SELECT id, name, template_data, created_at, updated_at
      FROM forms
      WHERE id = ?
    `).bind(id).first();
    
    return result as Form | null;
  }

  async createForm(name: string, templateData: object): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO forms (name, template_data, created_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `).bind(name, JSON.stringify(templateData)).run();
    
    return result.meta.last_row_id as number;
  }

  async updateForm(id: number, name: string, templateData: object): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE forms
      SET name = ?, template_data = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(name, JSON.stringify(templateData), id).run();
    
    return result.changes > 0;
  }

  async deleteForm(id: number): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM forms WHERE id = ?
    `).bind(id).run();
    
    return result.changes > 0;
  }

  // Submission operations
  async createSubmission(formId: number, formData: object, userId?: number, userType?: 'admin' | 'user'): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO submissions (form_id, form_data, user_id, user_type, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(formId, JSON.stringify(formData), userId || null, userType || null).run();
    
    return result.meta.last_row_id as number;
  }

  async getSubmissionById(id: number): Promise<Submission | null> {
    const result = await this.db.prepare(`
      SELECT id, form_id, form_data, pdf_url, ai_summary, created_at
      FROM submissions
      WHERE id = ?
    `).bind(id).first();
    
    return result as Submission | null;
  }

  async updateSubmissionPdfUrl(id: number, pdfUrl: string): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE submissions
      SET pdf_url = ?
      WHERE id = ?
    `).bind(pdfUrl, id).run();
    
    return result.changes > 0;
  }

  async updateSubmissionAiSummary(id: number, aiSummary: string): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE submissions
      SET ai_summary = ?
      WHERE id = ?
    `).bind(aiSummary, id).run();
    
    return result.changes > 0;
  }

  async getSubmissionsByFormId(formId: number): Promise<Submission[]> {
    const result = await this.db.prepare(`
      SELECT id, form_id, form_data, pdf_url, ai_summary, created_at
      FROM submissions
      WHERE form_id = ?
      ORDER BY created_at DESC
    `).bind(formId).all();
    
    return result.results as Submission[];
  }

  // Admin user operations
  async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const result = await this.db.prepare(`
      SELECT id, username, password_hash, created_at
      FROM admin_users
      WHERE username = ?
    `).bind(username).first();
    
    return result as AdminUser | null;
  }

  async getAdminById(userId: number): Promise<AdminUser | null> {
    const result = await this.db.prepare(`
      SELECT id, username, password_hash, created_at
      FROM admin_users
      WHERE id = ?
    `).bind(userId).first();
    
    return result as AdminUser | null;
  }

  async createAdmin(username: string, passwordHash: string): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO admin_users (username, password_hash, created_at)
      VALUES (?, ?, datetime('now'))
    `).bind(username, passwordHash).run();
    
    return result.meta.last_row_id as number;
  }

  // User operations
  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT id, username, password_hash, created_at, is_active
      FROM users
      WHERE username = ?
    `).bind(username).first();
    
    return result as User | null;
  }

  async getUserById(userId: number): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT id, username, password_hash, created_at, is_active
      FROM users
      WHERE id = ?
    `).bind(userId).first();
    
    return result as User | null;
  }

  async createUser(username: string, passwordHash: string): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO users (username, password_hash, created_at, is_active)
      VALUES (?, ?, datetime('now'), 1)
    `).bind(username, passwordHash).run();
    
    return result.meta.last_row_id as number;
  }

  async updateUserActiveStatus(userId: number, isActive: boolean): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE users
      SET is_active = ?
      WHERE id = ?
    `).bind(isActive ? 1 : 0, userId).run();
    
    return result.changes > 0;
  }

  // Session operations
  async createSession(userId: number, userType: 'admin' | 'user', sessionId: string, expiresAt: string): Promise<boolean> {
    const result = await this.db.prepare(`
      INSERT INTO sessions (id, user_id, user_type, expires_at, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(sessionId, userId, userType, expiresAt).run();
    
    return result.changes > 0;
  }

  async getSession(sessionToken: string): Promise<Session | null> {
    const result = await this.db.prepare(`
      SELECT id, user_id, user_type, expires_at, created_at
      FROM sessions
      WHERE id = ? AND expires_at > datetime('now')
    `).bind(sessionToken).first();
    
    return result as Session | null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `).bind(sessionId).run();
    
    return result.changes > 0;
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await this.db.prepare(`
      DELETE FROM sessions WHERE expires_at <= datetime('now')
    `).run();
    
    return result.changes;
  }
}

// Import Cloudflare Pages context
import { getRequestContext } from '@cloudflare/next-on-pages';

// Environment interface for Cloudflare bindings
export interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  ADMIN_COOKIE_SECRET: string;
}

// Helper function to get database instance from Cloudflare context
export function getDatabase(): DatabaseHelpers {
  const { env } = getRequestContext();
  const typedEnv = env as Env;
  if (!typedEnv.DB) {
    throw new Error('Database binding not found. Make sure D1 database is properly configured.');
  }
  return new DatabaseHelpers(typedEnv.DB);
}

// Helper function to get environment from Cloudflare context
export function getEnv(): Env {
  const { env } = getRequestContext();
  return env as Env;
}
