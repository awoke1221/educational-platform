/**
 * Custom Hook for Form Validation
 * Provides reusable validation logic across the application
 */

import { useState, useCallback } from "react";
import { ValidationError } from "@/lib/validators/form-validation";

interface UseFormValidationOptions {
  onValidationChange?: (isValid: boolean) => void;
}

export const useFormValidation = (
  validationFn: (data: any) => { isValid: boolean; errors: ValidationError[] },
  options?: UseFormValidationOptions,
) => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (fieldName: string, data: any) => {
      const validation = validationFn(data);
      const errors: Record<string, string> = {};

      validation.errors.forEach((err) => {
        errors[err.field] = err.message;
      });

      setFieldErrors(errors);
      options?.onValidationChange?.(validation.isValid);

      return validation.isValid;
    },
    [validationFn, options],
  );

  const handleBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const markAllTouched = useCallback(() => {
    setTouched((prev) => {
      const allTouched: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        allTouched[key] = true;
      });
      return allTouched;
    });
  }, []);

  return {
    fieldErrors,
    touched,
    validateField,
    handleBlur,
    clearFieldError,
    clearAllErrors,
    markAllTouched,
  };
};
