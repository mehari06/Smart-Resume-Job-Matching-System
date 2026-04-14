import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

function getHandler() {
    return NextAuth(authOptions);
}

export async function GET(request: Request, context: { params: { nextauth: string[] } }) {
    return getHandler()(request, context);
}

export async function POST(request: Request, context: { params: { nextauth: string[] } }) {
    return getHandler()(request, context);
}
