// src/app/verify/[code]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface CertData {
  certificateNumber: string;
  recipientName: string;
  courseTitle: string;
  courseLevel: string;
  issuedDate: string;
  verificationUrl: string;
}

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [cert, setCert] = useState<CertData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/certificates/verify?code=${code}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.isValid) setCert(d.data.certificate);
        else setError(d.data?.error || "የምስክር ወረቀት አልተገኘም");
      })
      .catch(() => setError("ማረጋገጥ አልተሳካም"))
      .finally(() => setLoading(false));
  }, [code]);

  const levelLabels: Record<string, string> = {
    beginner: "ጀማሪ",
    intermediate: "መካከለኛ",
    advanced: "ከፍተኛ",
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Image
            src="/logo adlms.jpg"
            alt="AD LMS"
            width={100}
            height={40}
            className="h-10 w-auto mx-auto"
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">በመፈተሽ ላይ...</div>
        ) : error ? (
          <div className="bg-surface rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <h1 className="text-xl font-bold text-red-600 mb-2">ልክ ያልሆነ</h1>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        ) : cert ? (
          <div className="bg-surface rounded-2xl shadow-sm p-8 text-center border-2 border-secondary">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h1 className="text-xl font-bold text-green-600 mb-4">ልክ ነው ✓</h1>

            <div className="border-t border-gray-100 pt-4 space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">የምስክር ወረቀት ቁጥር</span>
                <span className="font-medium text-sm">
                  {cert.certificateNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">የተማሪ ስም</span>
                <span className="font-medium text-sm">
                  {cert.recipientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">ኮርስ</span>
                <span className="font-medium text-sm">{cert.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">ደረጃ</span>
                <span className="font-medium text-sm">
                  {levelLabels[cert.courseLevel] || cert.courseLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">የተሰጠበት ቀን</span>
                <span className="font-medium text-sm">
                  {new Date(cert.issuedDate).toLocaleDateString("am-ET")}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
