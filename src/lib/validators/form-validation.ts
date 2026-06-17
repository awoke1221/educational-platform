/**
 * Comprehensive Form Validation Utilities
 * Validates all user input across the application
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email regex pattern (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone number pattern (international format)
const PHONE_REGEX = /^(\+\d{1,3}[- ]?)?\d{7,15}$/;

// Username pattern (alphanumeric, underscore, hyphen, 3-20 chars)
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/;

/**
 * Validate email format
 */
export const validateEmail = (
  email: string,
): { valid: boolean; message?: string } => {
  if (!email || email.trim() === "") {
    return { valid: false, message: "ኢሜይል አስገባ" };
  }
  if (email.length > 255) {
    return { valid: false, message: "ኢሜይል በጣም ረጅም ነው" };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: "ልክ ያልሆነ ኢሜይል ቅርጸት" };
  }
  return { valid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (
  password: string,
): { valid: boolean; message?: string } => {
  if (!password || password.trim() === "") {
    return { valid: false, message: "የይለፍ ቃል አስገባ" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `የይለፍ ቃል ቢያንስ ${PASSWORD_MIN_LENGTH} ቁምፊዎች መሆን አለበት`,
    };
  }
  if (password.length > 128) {
    return { valid: false, message: "የይለፍ ቃል በጣም ረጅም ነው" };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message: "የይለፍ ቃል ትንሽ ፊደል፣ ትልቅ ፊደል፣ ቁጥር እና ልዩ ቁምፊ (@$!%*?&) መያዝ አለበት",
    };
  }
  return { valid: true };
};

/**
 * Validate password confirmation
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string,
): { valid: boolean; message?: string } => {
  if (!confirmPassword || confirmPassword.trim() === "") {
    return { valid: false, message: "የይለፍ ቃል ድገሙት" };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: "የይለፍ ቃላት አይዛመዱም" };
  }
  return { valid: true };
};

/**
 * Validate username format
 */
export const validateUsername = (
  username: string,
): { valid: boolean; message?: string } => {
  if (!username || username.trim() === "") {
    return { valid: false, message: "የተጠቃሚ ስም አስገባ" };
  }
  if (username.length < 3) {
    return { valid: false, message: "የተጠቃሚ ስም ቢያንስ 3 ቁምፊዎች መሆን አለበት" };
  }
  if (username.length > 20) {
    return { valid: false, message: "የተጠቃሚ ስም 20 ቁምፊዎች ያላልበት መሆን አለበት" };
  }
  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      message: "የተጠቃሚ ስም ፊደላት፣ ቁጥሮች፣밑줄 እና ሰረዥ (-) ብቻ መያዝ ይችላል",
    };
  }
  return { valid: true };
};

/**
 * Validate full name
 */
export const validateFullName = (
  fullName: string,
): { valid: boolean; message?: string } => {
  if (!fullName || fullName.trim() === "") {
    return { valid: false, message: "ሙሉ ስም አስገባ" };
  }
  if (fullName.length < 2) {
    return { valid: false, message: "ሙሉ ስም ቢያንስ 2 ቁምፊዎች መሆን አለበት" };
  }
  if (fullName.length > 100) {
    return { valid: false, message: "ሙሉ ስም በጣም ረጅም ነው" };
  }
  // Allow letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\u1200-\u137F\s'-]+$/.test(fullName)) {
    return { valid: false, message: "ሙሉ ስም ልክ ያልሆነ ቁምፊዎች ይዟል" };
  }
  return { valid: true };
};

/**
 * Validate phone number
 */
export const validatePhoneNumber = (
  phoneNumber: string,
): { valid: boolean; message?: string } => {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return { valid: false, message: "ስልክ ቁጥር አስገባ" };
  }
  if (!PHONE_REGEX.test(phoneNumber.replace(/\s/g, ""))) {
    return {
      valid: false,
      message: "ስልክ ቁጥር ልክ ያልሆነ ቅርጸት ነው (ምሳሌ: +251912345678)",
    };
  }
  return { valid: true };
};

/**
 * Validate search query
 */
export const validateSearchQuery = (
  query: string,
): { valid: boolean; message?: string } => {
  if (!query || query.trim() === "") {
    return { valid: false, message: "ፍለጋ ጊዜ ቢያንስ 1 ቁምፊ ያስፈልጋል" };
  }
  if (query.length > 100) {
    return { valid: false, message: "ፍለጋ ጊዜ 100 ቁምፊዎች ያላልበት መሆን አለበት" };
  }
  if (/<script|javascript:/i.test(query)) {
    return { valid: false, message: "ልክ ያልሆነ ምስል በ ፍለጋ ውስጥ" };
  }
  return { valid: true };
};

/**
 * Validate course title
 */
export const validateCourseTitle = (
  title: string,
): { valid: boolean; message?: string } => {
  if (!title || title.trim() === "") {
    return { valid: false, message: "ኮርሱ ርዕስ አስገባ" };
  }
  if (title.length < 5) {
    return { valid: false, message: "ኮርሱ ርዕስ ቢያንስ 5 ቁምፊዎች መሆን አለበት" };
  }
  if (title.length > 200) {
    return { valid: false, message: "ኮርሱ ርዕስ 200 ቁምፊዎች ያላልበት መሆን አለበት" };
  }
  return { valid: true };
};

/**
 * Validate course description
 */
export const validateCourseDescription = (
  description: string,
): { valid: boolean; message?: string } => {
  if (!description || description.trim() === "") {
    return { valid: false, message: "ኮርሱ መግለጫ አስገባ" };
  }
  if (description.length < 20) {
    return { valid: false, message: "ኮርሱ መግለጫ ቢያንስ 20 ቁምፊዎች መሆን አለበት" };
  }
  if (description.length > 5000) {
    return { valid: false, message: "ኮርሱ መግለጫ 5000 ቁምፊዎች ያላልበት መሆን አለበት" };
  }
  return { valid: true };
};

/**
 * Validate price
 */
export const validatePrice = (
  price: string | number,
): { valid: boolean; message?: string } => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { valid: false, message: "ዋጋ ቁጥር መሆን አለበት" };
  }
  if (numPrice < 0) {
    return { valid: false, message: "ዋጋ አሉታዊ ሊሆን አይችልም" };
  }
  if (numPrice > 999999) {
    return { valid: false, message: "ዋጋ በጣም ትልቅ ነው" };
  }
  return { valid: true };
};

/**
 * Validate URL format
 */
export const validateUrl = (
  url: string,
): { valid: boolean; message?: string } => {
  if (!url || url.trim() === "") {
    return { valid: false, message: "URL አስገባ" };
  }
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, message: "ልክ ያልሆነ URL ቅርጸት" };
  }
};

/**
 * Validate login form
 */
export const validateLoginForm = (data: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.push({ field: "email", message: emailValidation.message || "" });
  }

  if (!data.password || data.password.trim() === "") {
    errors.push({ field: "password", message: "የይለፍ ቃል አስገባ" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate registration form
 */
export const validateRegisterForm = (data: {
  fullName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  const fullNameValidation = validateFullName(data.fullName);
  if (!fullNameValidation.valid) {
    errors.push({
      field: "fullName",
      message: fullNameValidation.message || "",
    });
  }

  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.valid) {
    errors.push({
      field: "username",
      message: usernameValidation.message || "",
    });
  }

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.push({ field: "email", message: emailValidation.message || "" });
  }

  if (data.phoneNumber) {
    const phoneValidation = validatePhoneNumber(data.phoneNumber);
    if (!phoneValidation.valid) {
      errors.push({
        field: "phoneNumber",
        message: phoneValidation.message || "",
      });
    }
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.push({
      field: "password",
      message: passwordValidation.message || "",
    });
  }

  const passwordMatchValidation = validatePasswordMatch(
    data.password,
    data.confirmPassword,
  );
  if (!passwordMatchValidation.valid) {
    errors.push({
      field: "confirmPassword",
      message: passwordMatchValidation.message || "",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate course form
 */
export const validateCourseForm = (data: {
  title: string;
  description: string;
  price: string | number;
  category: string;
  level: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  const titleValidation = validateCourseTitle(data.title);
  if (!titleValidation.valid) {
    errors.push({ field: "title", message: titleValidation.message || "" });
  }

  const descriptionValidation = validateCourseDescription(data.description);
  if (!descriptionValidation.valid) {
    errors.push({
      field: "description",
      message: descriptionValidation.message || "",
    });
  }

  const priceValidation = validatePrice(data.price);
  if (!priceValidation.valid) {
    errors.push({ field: "price", message: priceValidation.message || "" });
  }

  if (!data.category || data.category.trim() === "") {
    errors.push({ field: "category", message: "ምድብ ምረጥ" });
  }

  if (!data.level || data.level.trim() === "") {
    errors.push({ field: "level", message: "ደረጃ ምረጥ" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

/**
 * Trim and normalize whitespace
 */
export const normalizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, " ");
};

/**
 * Get field error message (for quick lookup)
 */
export const getFieldError = (
  errors: ValidationError[],
  fieldName: string,
): string | null => {
  const error = errors.find((e) => e.field === fieldName);
  return error?.message || null;
};

/**
 * Check if field has error
 */
export const hasFieldError = (
  errors: ValidationError[],
  fieldName: string,
): boolean => {
  return errors.some((e) => e.field === fieldName);
};
