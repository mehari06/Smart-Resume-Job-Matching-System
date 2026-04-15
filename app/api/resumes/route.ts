import { NextRequest, NextResponse } from "next/server";
import { getAllResumes } from "../../../lib/data";
import { requireSessionUser, syncSessionUser } from "../../../lib/api-auth";
import { getSignedResumeAssetUrl } from "../../../lib/cloudinary";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { serverError, validateCsrf } from "../../../lib/security";
import { createResumeFromUpload } from "../../../lib/services/resume-upload-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function withSignedResumeUrl(resume: any) {
    return {
        ...resume,
        fileUrl: getSignedResumeAssetUrl(resume.filePublicId, resume.fileUrl),
    };
}

/**
 * GET /api/resumes
 * Returns resumes for the authenticated user.
 * Admin can optionally pass `?userId=...` or omit it to fetch all resumes.
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) return auth.error;

        const { searchParams } = new URL(request.url);
        const requestedUserId = searchParams.get("userId");
        const isAdmin = auth.user.role === "ADMIN";

        const resumes = await getAllResumes();
        const targetUserId = isAdmin && requestedUserId ? requestedUserId : auth.user.id;

        const visibleResumes =
            isAdmin && !requestedUserId
                ? resumes
                : resumes.filter((resume) => resume.userId === targetUserId);

        return NextResponse.json({
            data: visibleResumes.map(withSignedResumeUrl),
        });
    } catch (error) {
        console.error("[GET /api/resumes]", error);
        return serverError("Failed to fetch resumes");
    }
}

/**
 * POST /api/resumes
 * Creates a resume record from a multipart form upload.
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) return auth.error;

        const csrfError = validateCsrf(request);
        if (csrfError) return csrfError;

        const rateLimitError = enforceRateLimit(request, {
            bucket: "resume-upload",
            userId: auth.user.id,
            limit: 8,
            windowMs: 10 * 60 * 1000,
            message: "Too many resume uploads. Please wait before trying again.",
        });
        if (rateLimitError) return rateLimitError;

        let resolvedUser = auth.user;
        try {
            const syncedUser = await syncSessionUser(auth.user);
            if (syncedUser?.id) {
                resolvedUser = {
                    ...auth.user,
                    id: syncedUser.id,
                    name: syncedUser.name ?? auth.user.name,
                    email: syncedUser.email ?? auth.user.email,
                    image: syncedUser.image ?? auth.user.image,
                };
            }
        } catch (error) {
            // Keep upload flow resilient even if Prisma user sync fails.
            console.error("[POST /api/resumes] syncSessionUser failed (continuing)", error);
        }

        const result = await createResumeFromUpload({
            request,
            user: resolvedUser,
        });

        return result.response;
    } catch (error) {
        console.error("[POST /api/resumes]", error);
        return serverError("Failed to save resume");
    }
}

