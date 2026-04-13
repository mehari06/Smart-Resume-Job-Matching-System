import { NextRequest, NextResponse } from "next/server";
import { getTrustedUnixTimestampSeconds } from "../../../../lib/cloudinary-utils";
import { requireSessionUser } from "../../../../lib/api-auth";
import { cloudinary, buildResumeUploadFolder, createResumeStorageKey } from "../../../../lib/cloudinary";
import { enforceRateLimit } from "../../../../lib/rate-limit";
import { serverError, validateCsrf } from "../../../../lib/security";

export async function POST(request: NextRequest) {
    try {
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
        const paramsToSign = {
            timestamp,
            folder,
            public_id: publicId,
            type: uploadType,
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET!
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder,
            publicId,
            uploadType,
        });
    } catch (error) {
        console.error("[POST /api/cloudinary/sign]", error);
        return serverError("Failed to sign upload request");
    }
}
