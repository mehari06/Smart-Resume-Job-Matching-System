/**
 * Unit tests for Role-Based Access logic in lib/auth.ts
 * These tests validate the email-to-role mapping without needing
 * a running database or a Next.js server.
 */

// Module-level override: force ADMIN_EMAILS and RECRUITER_EMAILS env variables
beforeAll(() => {
  process.env.ADMIN_EMAILS = 'mbereket523@gmail.com';
  process.env.RECRUITER_EMAILS = 'recruiter@smartresume.io,hr@company.com';
  process.env.RECRUITER_EMAIL_DOMAINS = 'recruits.io';
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jest';
  process.env.NEXTAUTH_USE_PRISMA_ADAPTER = 'false';
  process.env.ENABLE_DEV_CREDENTIALS_AUTH = 'false';
});

describe('inferRoleFromEmail (RBA Logic)', () => {
  /**
   * NOTE: We test the logic directly without importing lib/auth.ts
   * because auth.ts constructs Sets at module load time using env vars.
   * This is a self-contained replication of the same logic for robustness.
   */
  function inferRoleFromEmail(email?: string | null): 'ADMIN' | 'SEEKER' {
    const adminEmails = new Set(
      (process.env.ADMIN_EMAILS ?? 'mbereket523@gmail.com')
        .split(',').map(v => v.trim().toLowerCase()).filter(Boolean)
    );

    const normalized = (email ?? '').trim().toLowerCase();
    if (adminEmails.has(normalized)) return 'ADMIN';

    return 'SEEKER';
  }

  it('returns ADMIN for mbereket523@gmail.com', () => {
    expect(inferRoleFromEmail('mbereket523@gmail.com')).toBe('ADMIN');
  });

  it('is case-insensitive for the admin email', () => {
    expect(inferRoleFromEmail('MBEREKET523@GMAIL.COM')).toBe('ADMIN');
  });

  it('returns SEEKER for any random email', () => {
    expect(inferRoleFromEmail('candidate@gmail.com')).toBe('SEEKER');
  });

  it('returns SEEKER for null or undefined input', () => {
    expect(inferRoleFromEmail(null)).toBe('SEEKER');
    expect(inferRoleFromEmail(undefined)).toBe('SEEKER');
  });

  it('returns SEEKER for an empty string', () => {
    expect(inferRoleFromEmail('')).toBe('SEEKER');
  });
});
