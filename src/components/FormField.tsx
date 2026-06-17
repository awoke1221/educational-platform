/**
 * Reusable Form Field Component
 * Displays input with validation errors and hints
 */

import React from "react";

interface FormFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  icon?: React.ReactNode;
  successMessage?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled,
  required,
  hint,
  icon,
  successMessage,
}) => {
  const hasError = touched && error;
  const isValid = touched && !error && value;

  return (
    <div>
      <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
        {label} {required && "*"}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A7278]">
            {icon}
          </div>
        )}

        <input
          type={type}
          className={`w-full border-2 rounded-lg p-3 transition-all focus:outline-none focus:ring-2 text-sm ${
            icon ? "pl-10" : ""
          } ${
            hasError
              ? "border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400"
              : isValid
                ? "border-green-400 bg-green-50 focus:ring-green-300 focus:border-green-400"
                : "border-[#E0F7FA] bg-[#F0FEFF] focus:ring-[#00BCD4] focus:border-[#00BCD4]"
          }`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
        />

        {isValid && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {hint && !error && <p className="text-[#4A7278] text-xs mt-1">{hint}</p>}

      {hasError && (
        <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {successMessage && isValid && (
        <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {successMessage}
        </p>
      )}
    </div>
  );
};

export default FormField;
