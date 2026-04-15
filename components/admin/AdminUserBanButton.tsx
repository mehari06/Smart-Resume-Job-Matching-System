"use client";

import { Ban, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "../ConfirmDialog";
import { withCsrfHeaders } from "../../lib/client-security";

type AdminUserBanButtonProps = {
    userId: string;
    userName: string;
    banned: boolean;
};

export function AdminUserBanButton({ userId, userName, banned }: AdminUserBanButtonProps) {
    const router = useRouter();
    const actionLabel = banned ? "Unban" : "Ban";

    const handleToggle = async () => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/ban`, withCsrfHeaders({
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ banned: !banned }),
            }));
            const json = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(json?.error ?? `Failed to ${actionLabel.toLowerCase()} user`);
            }

            toast.success(json?.message ?? `User ${actionLabel.toLowerCase()}ned successfully`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : `Failed to ${actionLabel.toLowerCase()} user`);
        }
    };

    return (
        <ConfirmDialog
            title={`${actionLabel} User?`}
            description={`${actionLabel} ${userName || "this user"} ${banned ? "and restore access" : "to stop account access"} until an admin changes it again.`}
            confirmLabel={actionLabel}
            onConfirm={handleToggle}
            triggerElement={
                <button
                    type="button"
                    className={`flex items-center rounded px-3 py-1 text-white ${banned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                >
                    {banned ? <CheckCircle className="mr-1 h-4 w-4" /> : <Ban className="mr-1 h-4 w-4" />}
                    {actionLabel}
                </button>
            }
        />
    );
}
