import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

import { getTrustedUnixTimestampSeconds } from "../../../../lib/cloudinary-utils";

export async function POST(request: NextRequest) {
    try {
        const timestamp = await getTrustedUnixTimestampSeconds();
        const paramsToSign = {
            timestamp: timestamp,
            folder: "resumes",
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
        });
    } catch (error) {
        console.error("[POST /api/cloudinary/sign]", error);
        return NextResponse.json({ error: "Failed to sign upload request" }, { status: 500 });
    }
}
