"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  validateRegisterForm,
  validateEmail,
  validateUsername,
  validateFullName,
  validatePhoneNumber,
  validatePassword,
  validatePasswordMatch,
  normalizeInput,
} from "@/lib/validators/form-validation";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [form, setForm] = useState({
    username: "",
    email: "",
    fullName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Real-time validation on blur
  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    validateField(field);
  };

  // Validate individual field
  const validateField = (field: string) => {
    const errors = { ...fieldErrors };

    if (field === "fullName") {
      const validation = validateFullName(form.fullName);
      if (!validation.valid) {
        errors.fullName = validation.message || "ሙሉ ስም ያስፈልጋል";
      } else {
        delete errors.fullName;
      }
    }

    if (field === "username") {
      const validation = validateUsername(form.username);
      if (!validation.valid) {
        errors.username = validation.message || "ልክ ያልሆነ የተጠቃሚ ስም";
      } else {
        delete errors.username;
      }
    }

    if (field === "email") {
      const validation = validateEmail(form.email);
      if (!validation.valid) {
        errors.email = validation.message || "ልክ ያልሆነ ኢሜይል";
      } else {
        delete errors.email;
      }
    }

    if (field === "phoneNumber" && form.phoneNumber) {
      const validation = validatePhoneNumber(form.phoneNumber);
      if (!validation.valid) {
        errors.phoneNumber = validation.message || "ልክ ያልሆነ ስልክ ቁጥር";
      } else {
        delete errors.phoneNumber;
      }
    }

    if (field === "password") {
      const validation = validatePassword(form.password);
      if (!validation.valid) {
        errors.password = validation.message || "ልክ ያልሆነ የይለፍ ቃል";
      } else {
        delete errors.password;
      }
    }

    if (field === "confirmPassword") {
      const validation = validatePasswordMatch(
        form.password,
        form.confirmPassword,
      );
      if (!validation.valid) {
        errors.confirmPassword = validation.message || "የይለፍ ቃላት አይዛመዱም";
      } else {
        delete errors.confirmPassword;
      }
    }

    setFieldErrors(errors);
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (touched[field]) {
      validateField(field);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Mark all fields as touched
    setTouched({
      fullName: true,
      username: true,
      email: true,
      phoneNumber: true,
      password: true,
      confirmPassword: true,
    });

    // Validate entire form
    const validation = validateRegisterForm(form);
    if (!validation.isValid) {
      const errors: Record<string, string> = {};
      validation.errors.forEach((err) => {
        errors[err.field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fullName: normalizeInput(form.fullName),
          username: form.username.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber?.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "መመዝገብ አልተሳካም");
        if (data.errors) {
          const errors: Record<string, string> = {};
          Object.keys(data.errors).forEach((key) => {
            errors[key] = Array.isArray(data.errors[key])
              ? data.errors[key][0]
              : data.errors[key];
          });
          setFieldErrors(errors);
        }
      } else {
        // Registration is created as pre-registration. Redirect to payment page.
        const userId = data.user?.id;
        if (userId) {
          const targetUrl = redirectTo.startsWith("/auth/register/payment")
            ? (() => {
                try {
                  const url = new URL(redirectTo, window.location.origin);
                  url.searchParams.set("userId", userId);
                  return `${url.pathname}${url.search}`;
                } catch {
                  return `/auth/register/payment?userId=${userId}&redirect=${encodeURIComponent(
                    redirectTo,
                  )}`;
                }
              })()
            : `/auth/register/payment?userId=${userId}&redirect=${encodeURIComponent(
                redirectTo,
              )}`;

          router.push(targetUrl);
        } else {
          setError("Registration created but missing user id.");
        }
      }
    } catch {
      setError("እባክዎ ደግመው ይሞክሩ");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      key: "fullName",
      label: "ሙሉ ስም",
      type: "text",
      placeholder: "ሙሉ ስምዎ",
      required: true,
    },
    {
      key: "username",
      label: "የተጠቃሚ ስም",
      type: "text",
      placeholder: "username",
      required: true,
    },
    {
      key: "email",
      label: "ኢሜይል",
      type: "email",
      placeholder: "user@example.com",
      required: true,
    },
    {
      key: "phoneNumber",
      label: "ስልክ ቁጥር",
      type: "tel",
      placeholder: "+2519XXXXXXXX",
      required: false,
    },
    {
      key: "password",
      label: "የይለፍ ቃል",
      type: "password",
      placeholder: "••••••••",
      required: true,
      hint: "ትንሽ ፊደል፣ ትልቅ ፊደል፣ ቁጥር እና ልዩ ቁምፊ ያስፈልጋል",
    },
    {
      key: "confirmPassword",
      label: "የይለፍ ቃል ድገሙት",
      type: "password",
      placeholder: "••••••••",
      required: true,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#F0FEFF] to-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border-t-4 border-[#FF1744]">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00BCD4] to-[#FF1744] bg-clip-text text-transparent text-center mb-2">
          ይመዝገቡ
        </h1>
        <p className="text-[#0D3B4A] text-center text-sm mb-8 font-medium">
          አዲስ መለያ ይፍጠሩ
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 flex items-start gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
                {f.label} {f.required && "*"}
              </label>
              <input
                type={f.type}
                className={`w-full border-2 rounded-lg p-3 transition-all focus:outline-none focus:ring-2 text-sm ${
                  touched[f.key] && fieldErrors[f.key]
                    ? "border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400"
                    : "border-[#E0F7FA] bg-[#F0FEFF] focus:ring-[#00BCD4] focus:border-[#00BCD4]"
                }`}
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onBlur={() => handleBlur(f.key)}
                disabled={loading}
                required={f.required}
              />
              {f.hint && !fieldErrors[f.key] && (
                <p className="text-[#4A7278] text-xs mt-1">{f.hint}</p>
              )}
              {touched[f.key] && fieldErrors[f.key] && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {fieldErrors[f.key]}
                </p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading || Object.keys(fieldErrors).length > 0}
            className="w-full bg-gradient-to-r from-[#00BCD4] to-[#FF1744] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "በመመዝገብ ላይ..." : "ተመዝገብ"}
          </button>
        </form>

        <p className="text-center text-sm text-[#0D3B4A] mt-6">
          መለያ አለዎት?{" "}
          <Link
            href="/auth/login"
            className="text-[#FF1744] hover:underline font-medium"
          >
            ይግቡ
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20 text-gray-500">በመጫን ላይ...</div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
