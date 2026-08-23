import Link from "next/link";

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.16),transparent_32%),linear-gradient(135deg,var(--primary-dark),var(--primary),var(--primary-light))] px-4 py-10 text-center text-white sm:px-6 sm:py-16">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl shadow-primary-dark/40 backdrop-blur sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-300/30 bg-red-400/15 text-2xl font-bold text-red-200 sm:h-20 sm:w-20 sm:text-3xl">
          !
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-red-200">
          Checkout cancelled • ክፍያ ተሰርዟል
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
          Payment paused • ክፍያው አልተጠናቀቀም
        </h1>
        <p className="mt-4 text-white/75">No charge was made. • ክፍያ አልተፈጸመም።</p>
        {reason && (
          <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
            {reason}
          </p>
        )}
        <Link
          href="/courses"
          className="mt-8 inline-block rounded-lg bg-gradient-to-r from-secondary to-accent px-6 py-3 font-semibold text-primary-dark shadow-lg shadow-secondary/20 transition hover:-translate-y-0.5"
        >
          Back to courses • ወደ ኮርሶች
        </Link>
      </div>
    </main>
  );
}
