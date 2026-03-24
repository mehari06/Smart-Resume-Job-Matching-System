import { AlertCircle } from "lucide-react";

interface Props {
    message?: string;
}

export function ErrorMessage({ message }: Props) {
    if (!message) return null;

    return (
        <div className="flex items-center gap-1.5 mt-1.5 text-red-500 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <p className="text-xs font-medium">{message}</p>
        </div>
    );
}
