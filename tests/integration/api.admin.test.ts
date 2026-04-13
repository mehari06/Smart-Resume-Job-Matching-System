/** @jest-environment node */
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  user: { findMany: jest.fn(), update: jest.fn() },
}));
import { GET } from '@/app/api/admin/users/route';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// Mock the NextAuth library
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock NextResponse for primitive Node environment
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: any, init?: any) => {
        return {
          status: init?.status || 200,
          json: async () => body
        };
      }
    }
  };
});

// Mock the Prisma DB client
jest.mock('@/lib/prisma', () => ({
  user: {
    findMany: jest.fn()
  }
}));

describe('Admin Users API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 Unauthorized for non-admin users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { role: 'SEEKER' }
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns a list of users for valid admins', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { role: 'ADMIN' }
    });

    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: '1', email: 'test@admin.com', role: 'ADMIN', banned: false }
    ]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.users).toHaveLength(1);
    expect(json.users[0].email).toBe('test@admin.com');
  });
});
