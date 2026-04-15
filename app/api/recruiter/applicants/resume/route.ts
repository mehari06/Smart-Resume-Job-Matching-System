import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, syncSessionUser } from "../../../../../lib/api-auth";
import prisma from "../../../../../lib/prisma";
import { getSignedResumeAssetUrl } from "../../../../../lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getFileNameFromUrl(url: string, fallback: string) {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.split("/").pop();
        return pathname && pathname.trim() ? decodeURIComponent(pathname) : fallback;
    } catch {
        return fallback;
    }
}

function buildContentDisposition(mode: "view" | "download", fileName: string) {
    const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
    return `${mode === "download" ? "attachment" : "inline"}; filename="${safeName}"`;
}

async function getApplicationResume(params: {
    id: string;
    requester: { id: string; role: string };
}) {
    const application = await prisma.application.findUnique({
        where: { id: params.id },
        include: {
            job: {
                select: {
                    postedById: true,
                },
            },
        },
    });

    if (!application) {
        return { error: NextResponse.json({ error: "Application not found" }, { status: 404 }) };
    }

    if (params.requester.role !== "ADMIN" && application.job.postedById !== params.requester.id) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    return {
        url: application.resumeURL,
        fileName: getFileNameFromUrl(application.resumeURL, `application-${application.id}.pdf`),
    };
}

async function getMatchedResume(params: {
    id: string;
    requester: { id: string; role: string };
}) {
    const resume = await prisma.resume.findUnique({
        where: { id: params.id },
        include: {
            matches: {
                select: {
                    job: {
                        select: {
                            postedById: true,
                        },
                    },
                },
            },
        },
    });

    if (!resume) {
        return { error: NextResponse.json({ error: "Resume not found" }, { status: 404 }) };
    }

    const canAccess =
        params.requester.role === "ADMIN" ||
        resume.matches.some((match) => match.job.postedById === params.requester.id);

    if (!canAccess) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    return {
        url: getSignedResumeAssetUrl(resume.filePublicId, resume.fileUrl),
        fileName: resume.fileName,
    };
}

export async function GET(request: NextRequest) {
    try {
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

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
            console.error("[GET /api/recruiter/applicants/resume] syncSessionUser failed (continuing)", error);
        }

        const { searchParams } = new URL(request.url);
        const kind = searchParams.get("kind");
        const id = searchParams.get("id");
        const mode = searchParams.get("mode") === "download" ? "download" : "view";

        if (!id || (kind !== "application" && kind !== "resume")) {
            return NextResponse.json({ error: "Invalid resume request" }, { status: 400 });
        }

        const resolved =
            kind === "application"
                ? await getApplicationResume({ id, requester: resolvedUser })
                : await getMatchedResume({ id, requester: resolvedUser });

        if ("error" in resolved) {
            return resolved.error;
        }

        const upstream = await fetch(resolved.url, { cache: "no-store" });
        if (!upstream.ok) {
            return NextResponse.json({ error: "Failed to load applicant resume" }, { status: 502 });
        }

        const headers = new Headers();
        const upstreamType = upstream.headers.get("content-type");
        headers.set("Content-Type", upstreamType || "application/octet-stream");
        headers.set("Content-Disposition", buildContentDisposition(mode, resolved.fileName));
        headers.set("Cache-Control", "private, no-store, max-age=0");

        return new NextResponse(upstream.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("[GET /api/recruiter/applicants/resume]", error);
        return NextResponse.json({ error: "Failed to load applicant resume" }, { status: 500 });
    }
}
