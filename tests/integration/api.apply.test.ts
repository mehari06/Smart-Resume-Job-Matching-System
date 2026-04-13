/** @jest-environment node */
/**
 * Integration Tests for POST /api/jobs/[id]/apply
 * Tests: unauthorized access, validation errors, successful submission.
 */

jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({ user: {}, job: {}, application: {} }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
  },
}));
jest.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: jest.fn().mockReturnValue(null),
}));
jest.mock('@/lib/security', () => ({
  validateCsrf: jest.fn().mockReturnValue(null),
  serverError: (msg: string) => ({ status: 500, json: async () => ({ error: msg }) }),
}));
jest.mock('@/lib/api-auth', () => ({
  requireSessionUser: jest.fn(),
}));
jest.mock('@/lib/services/job-apply-service', () => ({
  applyToJob: jest.fn(),
}));
jest.mock('@/lib/server/request-json', () => ({
  readJsonBody: jest.fn(),
}));
// Mock validation so we control parse results
jest.mock('@/lib/validation', () => ({
  applyJobSchema: {
    safeParse: jest.fn((body: any) => {
      // Return success only when all required fields are present
      if (body?.applicantName && body?.email && body?.resumeURL) {
        return { success: true, data: body };
      }
      return { success: false, error: { message: 'Invalid' } };
    }),
  },
  jobCreateSchema: { safeParse: jest.fn(() => ({ success: false })) },
  recruiterSearchSchema: { safeParse: jest.fn(() => ({ success: false })) },
}));

const { requireSessionUser } = require('@/lib/api-auth');
const { applyToJob } = require('@/lib/services/job-apply-service');
const { readJsonBody } = require('@/lib/server/request-json');

describe('POST /api/jobs/[id]/apply', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no session exists', async () => {
    requireSessionUser.mockResolvedValue({ error: { status: 401, json: async () => ({ error: 'Unauthorized' }) } });

    const { POST } = await import('@/app/api/jobs/[id]/apply/route');
    const mockReq = { headers: new Map() } as any;
    const resp = await POST(mockReq, { params: { id: 'job-1' } });
    const json = await resp.json();

    expect(resp.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid or missing application payload', async () => {
    requireSessionUser.mockResolvedValue({ user: { id: 'user-1', role: 'SEEKER' } });
    readJsonBody.mockResolvedValue({ ok: true, body: {} });

    const { POST } = await import('@/app/api/jobs/[id]/apply/route');
    const mockReq = { headers: new Map() } as any;
    const resp = await POST(mockReq, { params: { id: 'job-1' } });
    const json = await resp.json();

    expect(resp.status).toBe(400);
    expect(json.error).toBe('Invalid application payload');
  });

  it('calls applyToJob service when payload is valid', async () => {
    const mockUser = { id: 'user-1', role: 'SEEKER', email: 'candidate@gmail.com', name: 'Test User' };
    requireSessionUser.mockResolvedValue({ user: mockUser });

    const validBody = {
      applicantName: 'Test User',
      email: 'candidate@gmail.com',
      resumeURL: 'https://example.com/resume.pdf',
      resumeId: 'resume-123',
      submit: true,
    };

    readJsonBody.mockResolvedValue({ ok: true, body: validBody });
    applyToJob.mockResolvedValue({ status: 201, json: async () => ({ message: 'Application submitted' }) });

    const { POST } = await import('@/app/api/jobs/[id]/apply/route');
    const mockReq = { headers: new Map() } as any;
    const resp = await POST(mockReq, { params: { id: 'job-1' } });
    const json = await resp.json();

    expect(applyToJob).toHaveBeenCalledWith({
      jobId: 'job-1',
      user: mockUser,
      payload: expect.objectContaining({ email: 'candidate@gmail.com', submit: true }),
    });
    expect(json.message).toBe('Application submitted');
  });
});
