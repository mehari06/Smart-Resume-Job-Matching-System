"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { User, Mail, Shield, Bell, Loader2, Save } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { toast } from "sonner";
import { withCsrfHeaders } from "../../lib/client-security";

function getInitials(name?: string | null): string {
    if (!name) return "U";
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState("");
    const [avatarFailed, setAvatarFailed] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [city, setCity] = useState("");
    const [age, setAge] = useState("");
    const [education, setEducation] = useState("");
    const [fieldOfStudy, setFieldOfStudy] = useState("");
    const [isStudent, setIsStudent] = useState(false);

    const user = session?.user as any;
    const avatarInitials = getInitials(name || user?.name);

    useEffect(() => {
        setName(user?.name ?? "");
    }, [user?.name]);

    useEffect(() => {
        setAvatarFailed(false);
    }, [user?.image]);

    useEffect(() => {
        async function loadProfileDetails() {
            try {
                const res = await fetch("/api/users/me", { cache: "no-store" });
                const json = await res.json();
                const profile = json?.data?.profile;
                if (!profile) return;

                setFirstName(profile.firstName ?? "");
                setLastName(profile.lastName ?? "");
                setCity(profile.city ?? "");
                setAge(typeof profile.age === "number" ? String(profile.age) : "");
                setEducation(profile.education ?? "");
                setFieldOfStudy(profile.fieldOfStudy ?? "");
                setIsStudent(Boolean(profile.isStudent));
            } catch {
                // Non-blocking; page still works from session data.
            }
        }

        if (status === "authenticated") {
            loadProfileDetails();
        }
    }, [status]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const res = await fetch("/api/users/me", {
                ...withCsrfHeaders({
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    firstName,
                    lastName,
                    city,
                    age: age.trim() ? Number(age) : undefined,
                    education,
                    fieldOfStudy,
                    isStudent,
                }),
                }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error ?? "Failed to update profile");
            }

            await update({ name: json.data.name });
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
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
                    <div className="space-y-6">
                        <Card className="flex flex-col items-center py-8 text-center">
                            {user?.image && !avatarFailed ? (
                                <Image
                                    src={user.image}
                                    alt={user.name ?? "User avatar"}
                                    width={96}
                                    height={96}
                                    loading="lazy"
                                    unoptimized
                                    className="h-24 w-24 rounded-full border-4 border-white shadow-md"
                                    onError={() => setAvatarFailed(true)}
                                />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white shadow-md">
                                    {avatarInitials}
                                </div>
                            )}
                            <h2 className="mt-4 text-xl font-semibold text-slate-900">{name || user?.name}</h2>
                            <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                {user?.role === "RECRUITER" ? "Recruiter" : user?.role === "ADMIN" ? "Admin" : "Job Seeker"}
                            </span>
                            <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
                        </Card>

                        <Card className="overflow-hidden p-1.5">
                            <button className="flex w-full items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
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
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
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
                                                value={user?.email ?? ""}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <input
                                            disabled
                                            type="text"
                                            value={user?.role === "RECRUITER" ? "Recruiter" : user?.role === "ADMIN" ? "Admin" : "Job Seeker"}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">First Name</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last Name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">City</label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Age</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Education</label>
                                        <input
                                            type="text"
                                            value={education}
                                            onChange={(e) => setEducation(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Field of Study</label>
                                        <input
                                            type="text"
                                            value={fieldOfStudy}
                                            onChange={(e) => setFieldOfStudy(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                    </div>
                                </div>

                                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={isStudent}
                                        onChange={(e) => setIsStudent(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Currently a student
                                </label>

                                <p className="text-sm text-slate-500">
                                    These account details help recruiters understand your background when viewing ranked candidates.
                                </p>

                                <div className="flex justify-end border-t border-slate-100 pt-4">
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
                            <Button variant="ghost" className="mt-4 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700">
                                Deactivate Account
                            </Button>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
