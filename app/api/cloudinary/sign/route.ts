import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const [{ requireSessionUser }, { getTrustedUnixTimestampSeconds }, cloudinaryModule, { enforceRateLimit }, { serverError, validateCsrf }] =
            await Promise.all([
                import("../../../../lib/api-auth"),
                import("../../../../lib/cloudinary-utils"),
                import("../../../../lib/cloudinary"),
                import("../../../../lib/rate-limit"),
                import("../../../../lib/security"),
            ]);
        const {
            cloudinary,
            buildResumeUploadFolder,
            createResumeStorageKey,
            ensureCloudinaryConfigured,
        } = cloudinaryModule;
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(request);
        if (csrfError) {
            return csrfError;
        }

        const rateLimitError = enforceRateLimit(request, {
            bucket: "cloudinary-sign",
            userId: auth.user.id,
            limit: 20,
            windowMs: 10 * 60 * 1000,
            message: "Too many upload attempts. Please wait a few minutes.",
        });
        if (rateLimitError) {
            return rateLimitError;
        }

        const timestamp = await getTrustedUnixTimestampSeconds();
        const folder = buildResumeUploadFolder(auth.user.id);
        const publicId = createResumeStorageKey();
        const uploadType = "authenticated";
        const cloudinaryConfig = ensureCloudinaryConfigured();

        if (!cloudinaryConfig) {
            return serverError("Cloudinary upload is not configured");
        }

        const paramsToSign = {
            timestamp,
            folder,
            public_id: publicId,
            type: uploadType,
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            cloudinaryConfig.apiSecret
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: cloudinaryConfig.cloudName,
            apiKey: cloudinaryConfig.apiKey,
            folder,
            publicId,
            uploadType,
        });
    } catch (error) {
        console.error("[POST /api/cloudinary/sign]", error);
        const { serverError } = await import("../../../../lib/security");
        return serverError("Failed to sign upload request");
    }
}
