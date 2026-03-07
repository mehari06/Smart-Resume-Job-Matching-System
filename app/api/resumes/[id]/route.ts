import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const resume = await prisma.resume.findUnique({
            where: { id },
        });

        if (!resume) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        // Delete from Cloudinary if publicId exists
        if (resume.filePublicId) {
            await cloudinary.uploader.destroy(resume.filePublicId);
        }

        // Delete from database
        await prisma.resume.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Resume deleted successfully" });
    } catch (error) {
        console.error(`[DELETE /api/resumes/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
    }
}
