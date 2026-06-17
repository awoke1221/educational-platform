# Form Validation Implementation Guide

This guide explains how to use the comprehensive form validation system in the AD LMS project.

## Overview

The validation system includes:

- **Validation Utilities** (`lib/validators/form-validation.ts`) - Core validation functions
- **Custom Hook** (`lib/hooks/useFormValidation.ts`) - Reusable validation logic
- **FormField Component** (`components/FormField.tsx`) - Consistent form input display
- **Alert Component** (`components/Alert.tsx`) - Error/success messaging

## Quick Start

### 1. Using Validation Utilities Directly

```tsx
import {
  validateEmail,
  validatePassword,
  validateRegisterForm,
} from "@/lib/validators/form-validation";

// Validate single field
const emailValidation = validateEmail(email);
if (!emailValidation.valid) {
  console.log(emailValidation.message); // Error message
}

// Validate entire form
const result = validateRegisterForm({
  fullName: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  phoneNumber: "+251912345678",
  password: "SecurePass123!",
  confirmPassword: "SecurePass123!",
});

if (!result.isValid) {
  result.errors.forEach((error) => {
    console.log(`${error.field}: ${error.message}`);
  });
}
```

### 2. Using FormField Component

```tsx
import { FormField } from "@/components/FormField";

export function MyForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  return (
    <FormField
      label="Email"
      type="email"
      placeholder="user@example.com"
      value={email}
      onChange={setEmail}
      onBlur={() => setTouched({ ...touched, email: true })}
      error={fieldErrors.email}
      touched={touched.email}
      required
      hint="We'll never share your email"
      successMessage="Email looks good!"
    />
  );
}
```

### 3. Using Alert Component

```tsx
import { Alert } from "@/components/Alert";

export function LoginPage() {
  const [error, setError] = useState("");

  return (
    <>
      {error && (
        <Alert
          type="error"
          title="Login Failed"
          message={error}
          onClose={() => setError("")}
          dismissible
        />
      )}

      {/* Form fields... */}
    </>
  );
}
```

## Available Validators

### Email Validation

```tsx
validateEmail(email: string)
// Returns: { valid: boolean, message?: string }
```

### Password Validation

```tsx
validatePassword(password: string)
// Requires: Min 8 chars, uppercase, lowercase, number, special char
```

### Username Validation

```tsx
validateUsername(username: string)
// Allows: Letters, numbers, underscore, hyphen (3-20 chars)
```

### Full Name Validation

```tsx
validateFullName(fullName: string)
// Allows: Letters (Amharic & English), spaces, hyphens, apostrophes
```

### Phone Number Validation

```tsx
validatePhoneNumber(phoneNumber: string)
// Format: International (e.g., +251912345678)
```

### Password Match

```tsx
validatePasswordMatch(password: string, confirmPassword: string)
```

### Search Query

```tsx
validateSearchQuery(query: string)
// Prevents XSS attacks, checks length
```

### Course Information

```tsx
validateCourseTitle(title: string)
validateCourseDescription(description: string)
validatePrice(price: string | number)
```

### URL Validation

```tsx
validateUrl(url: string)
// Validates proper URL format
```

## Complete Form Example

```tsx
"use client";
import { useState } from "react";
import { FormField } from "@/components/FormField";
import { Alert } from "@/components/Alert";
import {
  validateLoginForm,
  validateEmail,
  normalizeInput,
} from "@/lib/validators/form-validation";

export function LoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validate single field in real-time
  const validateField = (field: string) => {
    const errors = { ...fieldErrors };

    if (field === "email") {
      const validation = validateEmail(form.email);
      if (!validation.valid) {
        errors.email = validation.message || "";
      } else {
        delete errors.email;
      }
    }

    if (field === "password") {
      if (!form.password) {
        errors.password = "Password is required";
      } else if (form.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      } else {
        delete errors.password;
      }
    }

    setFieldErrors(errors);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate entire form
    const validation = validateLoginForm(form);
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeInput(form.email),
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
      } else {
        // Success handling
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert type="error" message={error} onClose={() => setError("")} />
      )}

      <FormField
        label="Email"
        type="email"
        placeholder="user@example.com"
        value={form.email}
        onChange={(email) => {
          setForm({ ...form, email });
          if (touched.email) validateField("email");
        }}
        onBlur={() => {
          setTouched({ ...touched, email: true });
          validateField("email");
        }}
        error={fieldErrors.email}
        touched={touched.email}
        required
      />

      <FormField
        label="Password"
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={(password) => {
          setForm({ ...form, password });
          if (touched.password) validateField("password");
        }}
        onBlur={() => {
          setTouched({ ...touched, password: true });
          validateField("password");
        }}
        error={fieldErrors.password}
        touched={touched.password}
        required
      />

      <button
        type="submit"
        disabled={loading || Object.keys(fieldErrors).length > 0}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```

## Utility Functions

### sanitizeInput

Prevents XSS attacks by escaping HTML characters:

```tsx
import { sanitizeInput } from "@/lib/validators/form-validation";

const safeInput = sanitizeInput(userInput);
```

### normalizeInput

Trims whitespace and normalizes spaces:

```tsx
import { normalizeInput } from "@/lib/validators/form-validation";

const clean = normalizeInput(form.fullName); // "John  Doe" → "John Doe"
```

### getFieldError & hasFieldError

Helper functions for error lookup:

```tsx
import { getFieldError, hasFieldError } from "@/lib/validators/form-validation";

const errorMsg = getFieldError(errors, "email");
const hasError = hasFieldError(errors, "email");
```

## Validation Messages (Amharic)

All validation messages are in Amharic for better user experience:

- "ኢሜይል አስገባ" - Enter email
- "ልክ ያልሆነ ኢሜይል ቅርጸት" - Invalid email format
- "የይለፍ ቃል አስገባ" - Enter password
- "የይለፍ ቃላት አይዛመዱም" - Passwords don't match
- And more...

## Best Practices

1. **Real-time Validation**: Validate on blur for better UX
2. **Clear Errors**: Show specific, helpful error messages
3. **Disable Submit**: Disable submit button while form has errors
4. **Sanitize Input**: Always sanitize user input before sending to API
5. **Normalize Input**: Trim and normalize whitespace
6. **Provide Hints**: Help users understand field requirements

## Integration with Forms

The validation system works seamlessly with:

- Login form (implemented)
- Registration form (implemented)
- Course creation form (ready to implement)
- Search/filter forms (ready to implement)
- Admin forms (ready to implement)

## Adding New Validators

To add a new validator:

```tsx
// In form-validation.ts
export const validateCustomField = (
  value: string,
): { valid: boolean; message?: string } => {
  if (!value) {
    return { valid: false, message: "ሚዲያ አስገባ" };
  }
  // Add your validation logic
  return { valid: true };
};
```

Then use it in your form:

```tsx
import { validateCustomField } from "@/lib/validators/form-validation";

const validation = validateCustomField(customValue);
if (!validation.valid) {
  // Handle error
}
```

---

**Questions?** Check the implemented login and register forms for complete examples!
