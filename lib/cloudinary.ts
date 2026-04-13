import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export function buildResumeUploadFolder(userId: string) {
    return `resumes/${userId}`;
}

export function createResumeStorageKey() {
    return `resume_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function isOwnedResumePublicId(publicId: string, userId: string) {
    return publicId.startsWith(`${buildResumeUploadFolder(userId)}/`);
}

export function getSignedResumeAssetUrl(filePublicId?: string | null, fallbackUrl?: string | null) {
    if (!filePublicId) {
        return fallbackUrl ?? "";
    }

    return cloudinary.url(filePublicId, {
        resource_type: "raw",
        type: "authenticated",
        secure: true,
        sign_url: true,
    });
}
