import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.2),transparent_32%),linear-gradient(135deg,var(--primary-dark),var(--primary),var(--primary-light))] px-4 py-10 text-center text-white sm:px-6 sm:py-16">
      <div className="relative w-full max-w-lg rounded-3xl border border-secondary/30 bg-white/[0.08] p-6 shadow-2xl shadow-primary-dark/40 backdrop-blur sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-accent text-2xl font-bold text-primary-dark shadow-lg shadow-secondary/30 sm:h-20 sm:w-20 sm:text-3xl">
          ✓
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          PayPal payment confirmed
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
          Your learning journey is open
        </h1>
        <p className="mt-4 text-white/75">
          Your PayPal payment was completed and your course access is now open.
          A confirmation email has been sent.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-lg bg-gradient-to-r from-secondary to-accent px-6 py-3 font-semibold text-primary-dark shadow-lg shadow-secondary/20 transition hover:-translate-y-0.5"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
