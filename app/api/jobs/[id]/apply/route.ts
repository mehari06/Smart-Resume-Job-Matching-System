import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [
      { requireSessionUser },
      { enforceRateLimit },
      { serverError, validateCsrf },
      { applyJobSchema },
      { readJsonBody },
      { applyToJob },
    ] = await Promise.all([
      import("../../../../../lib/api-auth"),
      import("../../../../../lib/rate-limit"),
      import("../../../../../lib/security"),
      import("../../../../../lib/validation"),
      import("../../../../../lib/server/request-json"),
      import("../../../../../lib/services/job-apply-service"),
    ]);

    const auth = await requireSessionUser();
    if ("error" in auth) {
      return auth.error;
    }

    const csrfError = validateCsrf(request);
    if (csrfError) {
      return csrfError;
    }

    const jobId = params.id;
    const jsonResult = await readJsonBody(request);
    if (jsonResult.ok === false) {
      return jsonResult.response;
    }

    const parsed = applyJobSchema.safeParse(jsonResult.body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid application payload" }, { status: 400 });
    }

    const rateLimitError = enforceRateLimit(request, {
      bucket: parsed.data.submit ? "job-apply-submit" : "job-apply-score",
      userId: auth.user.id,
      limit: parsed.data.submit ? 10 : 30,
      windowMs: 10 * 60 * 1000,
      message: parsed.data.submit
        ? "Too many application attempts. Please wait before trying again."
        : "Too many score checks. Please wait before trying again.",
    });
    if (rateLimitError) {
      return rateLimitError;
    }

    return applyToJob({
      jobId,
      user: auth.user,
      payload: {
        applicantName: parsed.data.applicantName,
        email: parsed.data.email,
        resumeURL: parsed.data.resumeURL,
        resumeId: parsed.data.resumeId,
        submit: parsed.data.submit === true,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/jobs/[id]/apply] Fatal Error:", error);
    const { serverError } = await import("../../../../../lib/security");
    return serverError("Failed to submit application");
  }
}
