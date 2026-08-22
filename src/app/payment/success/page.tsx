import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div className="max-w-lg">
        <h1 className="text-3xl font-bold text-emerald-400">
          Payment successful
        </h1>
        <p className="mt-4 text-slate-300">
          Your PayPal payment was completed and your course access is now open.
          A confirmation email has been sent.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-slate-950"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
