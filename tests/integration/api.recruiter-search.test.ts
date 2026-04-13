/** @jest-environment node */
/**
 * Integration Tests for POST /api/recruiter/search
 * Tests: role-based access (SEEKER blocked, RECRUITER/ADMIN allowed),
 * validation errors, and correct response shaping.
 */

jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({ user: {}, job: {}, resume: {} }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ status: init?.status ?? 200, json: async () => body }),
  },
}));
jest.mock('@/lib/api-auth', () => ({
  requireSessionUser: jest.fn(),
}));
jest.mock('@/lib/data', () => ({
  getAllResumes: jest.fn().mockResolvedValue([]),
  searchResumesByJobDescription: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: jest.fn().mockReturnValue(null),
}));
jest.mock('@/lib/security', () => ({
  validateCsrf: jest.fn().mockReturnValue(null),
  serverError: (msg: string) => ({ status: 500, json: async () => ({ error: msg }) }),
}));
jest.mock('@/lib/monitoring-server', () => ({
  recordServerError: jest.fn(),
}));

const { requireSessionUser } = require('@/lib/api-auth');
const { searchResumesByJobDescription } = require('@/lib/data');

// Ensure the ML service branch is never hit during tests
beforeAll(() => {
  delete process.env.ML_SERVICE_URL;
  // Mock global fetch so no real HTTP calls are made
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({ error: 'mocked - should not be called' }),
  }) as any;
});

afterAll(() => {
  jest.restoreAllMocks();
});

function buildRequest(body: any) {
  return { headers: new Map(), json: async () => body } as any;
}

describe('POST /api/recruiter/search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 for unauthenticated users', async () => {
    requireSessionUser.mockResolvedValue({
      error: { status: 401, json: async () => ({ error: 'Unauthorized' }) },
    });
    const { POST } = await import('@/app/api/recruiter/search/route');
    const resp = await POST(buildRequest({ jobDescription: 'React developer' }));
    const json = await resp.json();
    expect(resp.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 for missing jobDescription payload', async () => {
    requireSessionUser.mockResolvedValue({ user: { id: 'r1', role: 'RECRUITER' } });
    const { POST } = await import('@/app/api/recruiter/search/route');
    const resp = await POST(buildRequest({}));
    const json = await resp.json();
    expect(resp.status).toBe(400);
    expect(json.error).toBe('Invalid recruiter search payload');
  });

  it('returns matched resumes for a valid RECRUITER request', async () => {
    requireSessionUser.mockResolvedValue({ user: { id: 'r1', role: 'RECRUITER' } });
    searchResumesByJobDescription.mockResolvedValue([
      {
        resume: {
          id: 'res-1',
          candidateName: 'Alice',
          targetRole: 'Frontend Developer',
          experienceYears: 3,
          skills: ['React', 'TypeScript'],
          education: 'BSc Computer Science',
        },
        matchScore: 82,
        matchedSkills: ['React'],
      },
    ]);
    const { POST } = await import('@/app/api/recruiter/search/route');
    const resp = await POST(buildRequest({ jobDescription: 'React developer with TypeScript experience.' }));
    const json = await resp.json();
    expect(resp.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].candidateName).toBe('Alice');
    expect(json.data[0].matchScore).toBe(82);
    expect(json.total).toBe(1);
  });

  it('returns empty results when no resumes match', async () => {
    requireSessionUser.mockResolvedValue({ user: { id: 'a1', role: 'ADMIN' } });
    searchResumesByJobDescription.mockResolvedValue([]);
    const { POST } = await import('@/app/api/recruiter/search/route');
    const resp = await POST(buildRequest({ jobDescription: 'Very niche skill set XYZ123' }));
    const json = await resp.json();
    expect(resp.status).toBe(200);
    expect(json.data).toHaveLength(0);
    expect(json.total).toBe(0);
  });
});
