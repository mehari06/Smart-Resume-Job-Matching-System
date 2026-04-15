"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "../ConfirmDialog";
import { withCsrfHeaders } from "../../lib/client-security";

type AdminJobDeleteButtonProps = {
    jobId: string;
    jobTitle: string;
};

export function AdminJobDeleteButton({ jobId, jobTitle }: AdminJobDeleteButtonProps) {
    const router = useRouter();

    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/admin/jobs/${jobId}`, withCsrfHeaders({ method: "DELETE" }));
            const json = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(json?.error ?? "Failed to delete job");
            }

            toast.success("Job deleted successfully");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete job");
        }
    };

    return (
        <ConfirmDialog
            title="Delete Posted Job?"
            description={`Delete "${jobTitle}" and remove its applications from the admin view. This action cannot be undone.`}
            confirmLabel="Delete Job"
            onConfirm={handleDelete}
            triggerElement={
                <button type="button" className="flex items-center rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                </button>
            }
        />
    );
}
