export default function JobsLoading() {
    return (
        <div className="main-gradient min-h-screen">
            <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 space-y-2">
                    <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
                    <div className="h-5 w-72 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                            <div className="space-y-2">
                                <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
                                <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((j) => (
                                    <div key={j} className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
