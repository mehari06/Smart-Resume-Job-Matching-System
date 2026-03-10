import { NextRequest, NextResponse } from "next/server";
import { isOwnerOrAdmin, requireSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";
import { v2 as cloudinary } from "cloudinary";

export const dynamic = "force-dynamic";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const resume = await prisma.resume.findUnique({
            where: { id: params.id },
        });

        if (!resume) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        if (!isOwnerOrAdmin(auth.user, resume.userId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (resume.filePublicId) {
            await cloudinary.uploader.destroy(resume.filePublicId);
        }

        await prisma.resume.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Resume deleted successfully" });
    } catch (error) {
        console.error(`[DELETE /api/resumes/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
    }
}
