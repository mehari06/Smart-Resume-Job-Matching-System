"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import React from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
    title: string;
    description: string;
    onConfirm: () => void;
    triggerElement: React.ReactNode;
    confirmLabel?: string;
}

export function ConfirmDialog({ title, description, onConfirm, triggerElement, confirmLabel = "Delete" }: ConfirmDialogProps) {
    return (
        <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
                {triggerElement}
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in" />
                <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl focus:outline-none animate-in zoom-in-95 fade-in duration-200">
                    <AlertDialog.Title className="text-lg font-semibold text-slate-900">
                        {title}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-sm text-slate-600">
                        {description}
                    </AlertDialog.Description>
                    <div className="mt-6 flex justify-end gap-3">
                        <AlertDialog.Cancel asChild>
                            <Button variant="secondary">Cancel</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <Button onClick={(e) => { e.preventDefault(); onConfirm(); }} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">
                                {confirmLabel}
                            </Button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
