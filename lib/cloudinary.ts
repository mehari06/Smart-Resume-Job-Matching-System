import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

let hasConfiguredCloudinary = false;

function readCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
        return null;
    }

    return {
        cloudName,
        apiKey,
        apiSecret,
    };
}

export function ensureCloudinaryConfigured() {
    const config = readCloudinaryConfig();
    if (!config) {
        return null;
    }

    if (!hasConfiguredCloudinary) {
        cloudinary.config({
            cloud_name: config.cloudName,
            api_key: config.apiKey,
            api_secret: config.apiSecret,
        });
        hasConfiguredCloudinary = true;
    }

    return config;
}

ensureCloudinaryConfigured();

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

    if (!ensureCloudinaryConfigured()) {
        return fallbackUrl ?? "";
    }

    return cloudinary.url(filePublicId, {
        resource_type: "raw",
        type: "authenticated",
        secure: true,
        sign_url: true,
    });
}
