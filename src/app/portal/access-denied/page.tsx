import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccessDeniedPage() {
  const session = await getSession();

  if (!session) {
    redirect("/portal/login");
  }

  const portalHref = session.role === "ADMIN" ? "/portal/admin" : "/portal/worker";
  const portalLabel = session.role === "ADMIN" ? "Admin Command Center" : "Worker Operations";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-zinc-100 to-stone-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 shadow-xl text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 uppercase tracking-wider">
            Permission Required
          </span>
          <h1 className="text-2xl font-extrabold text-zinc-900">Access Denied</h1>
          <p className="text-sm text-zinc-600">
            You do not have permission to access this page. This area requires different privileges.
          </p>
        </div>

        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-600 space-y-1">
          <p>
            Logged in as: <strong className="text-zinc-900">{session.name || session.username}</strong>
          </p>
          <p>
            Current Role:{" "}
            <span className="inline-block rounded bg-zinc-200 px-2 py-0.5 font-mono font-bold text-zinc-800">
              {session.role}
            </span>
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <Link
            href={portalHref}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-700 active:scale-[0.99]"
          >
            Go to My Portal ({portalLabel})
          </Link>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.99]"
            >
              Log Out & Switch Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
