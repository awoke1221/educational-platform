import Link from "next/link";

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div className="max-w-lg">
        <h1 className="text-3xl font-bold text-red-400">
          Payment not completed
        </h1>
        <p className="mt-4 text-slate-300">
          Your PayPal transaction was not completed. No course access was
          granted.
        </p>
        {reason && (
          <p className="mt-3 text-sm text-red-300">Details: {reason}</p>
        )}
        <Link
          href="/courses"
          className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-slate-950"
        >
          Return to courses
        </Link>
      </div>
    </main>
  );
}
