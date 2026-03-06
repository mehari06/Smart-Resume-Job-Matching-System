"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { User, Mail, Shield, Building2, Bell, MapPin, Loader2, Save } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { toast } from "sonner";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [isSaving, setIsSaving] = useState(false);

    const user = session?.user as any;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API update
        await new Promise((r) => setTimeout(r, 1000));
        setIsSaving(false);
        toast.success("Profile updated successfully!");
    };

    if (status === "loading") {
        return (
            <div className="main-gradient min-h-screen">
                <Navbar />
                <main className="mx-auto max-w-4xl px-4 py-32 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
                    <p className="mt-4 text-slate-500">Loading your profile...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Your Profile</h1>
                    <p className="mt-2 text-slate-600">Manage your account settings and preferences.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                    {/* Avatar side */}
                    <div className="space-y-6">
                        <Card className="flex flex-col items-center py-8 text-center">
                            {user?.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.image} alt={user.name} className="h-24 w-24 rounded-full border-4 border-white shadow-md" />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white shadow-md">
                                    {user?.name?.[0] ?? "U"}
                                </div>
                            )}
                            <h2 className="mt-4 text-xl font-semibold text-slate-900">{user?.name}</h2>
                            <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                {user?.role === "RECRUITER" ? "Recruiter" : "Job Seeker"}
                            </span>
                            <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
                        </Card>

                        <Card className="p-1.5 overflow-hidden">
                            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 bg-slate-100">
                                <User className="h-4 w-4 text-indigo-600" /> Personal Info
                            </button>
                            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                                <Bell className="h-4 w-4 text-slate-400" /> Notifications
                            </button>
                            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                                <Shield className="h-4 w-4 text-slate-400" /> Security
                            </button>
                        </Card>
                    </div>

                    {/* Form side */}
                    <div className="space-y-6">
                        <Card>
                            <h3 className="mb-6 text-lg font-semibold text-slate-900">Personal Information</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                defaultValue={user?.name ?? ""}
                                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <input
                                                disabled
                                                type="email"
                                                defaultValue={user?.email ?? ""}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Location (City, Country)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="e.g. Addis Ababa, Ethiopia"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Headline / Current Title</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="e.g. Senior Software Engineer"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <Button type="submit" disabled={isSaving} loading={isSaving}>
                                        <Save className="h-4 w-4" />
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        <Card className="border-red-100">
                            <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
                            <p className="mt-1 text-sm text-slate-600">Detele your account and all associated resumes and match history.</p>
                            <Button variant="ghost" className="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                                Deactivate Account
                            </Button>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
