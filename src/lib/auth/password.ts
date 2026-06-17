// src/lib/auth/password.ts
// Enterprise-Grade Password Security

import bcrypt from "bcryptjs";
import crypto from "crypto";

interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-5
  errors: string[];
  suggestions: string[];
}

class PasswordService {
  private readonly SALT_ROUNDS = 12;
  private readonly MIN_LENGTH = 8;
  private readonly PASSWORD_HISTORY_LIMIT = 3;

  /**
   * Hash password with bcrypt
   * Uses salt rounds of 12 for enterprise security
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      console.error("Error hashing password:", error);
      throw new Error("Failed to hash password");
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  /**
   * Validate password strength
   * Returns comprehensive validation report
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    const result: PasswordValidationResult = {
      isValid: true,
      score: 0,
      errors: [],
      suggestions: [],
    };

    // Length check
    if (password.length < this.MIN_LENGTH) {
      result.errors.push(
        `Password must be at least ${this.MIN_LENGTH} characters`,
      );
      result.isValid = false;
    } else if (password.length >= 16) {
      result.score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      result.errors.push("Must contain uppercase letter (A-Z)");
      result.isValid = false;
      result.suggestions.push("Add an uppercase letter");
    } else {
      result.score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      result.errors.push("Must contain lowercase letter (a-z)");
      result.isValid = false;
      result.suggestions.push("Add a lowercase letter");
    } else {
      result.score += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      result.errors.push("Must contain number (0-9)");
      result.isValid = false;
      result.suggestions.push("Add a number");
    } else {
      result.score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      result.errors.push("Must contain special character (!@#$%^&* etc)");
      result.isValid = false;
      result.suggestions.push("Add a special character");
    } else {
      result.score += 1;
    }

    // Check for common patterns
    if (this.hasCommonPatterns(password)) {
      result.suggestions.push(
        'Avoid common patterns like "123", "abc", "password"',
      );
      result.score = Math.max(0, result.score - 1);
    }

    // Check for sequential characters
    if (this.hasSequentialCharacters(password)) {
      result.suggestions.push("Avoid sequential characters");
    }

    // Check for repeated characters
    if (this.hasRepeatedCharacters(password)) {
      result.suggestions.push("Avoid repeating characters");
    }

    return result;
  }

  /**
   * Generate password reset token
   */
  generateResetToken(): { token: string; hash: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return { token, hash, expiresAt };
  }

  /**
   * Generate OTP (One-Time Password)
   */
  generateOTP(length: number = 6): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Generate secure random password
   * Useful for temporary passwords
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|:;<>?,./";

    const allChars = uppercase + lowercase + numbers + special;
    let password = "";

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Check for common password patterns
   */
  private hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      "password",
      "123456",
      "qwerty",
      "admin",
      "111111",
      "000000",
      "abc123",
      "password123",
    ];

    return commonPatterns.some((pattern) =>
      password.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  /**
   * Check for sequential characters (e.g., "abc", "123")
   */
  private hasSequentialCharacters(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);

      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for repeated characters (e.g., "aaa", "111")
   */
  private hasRepeatedCharacters(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      if (
        password[i] === password[i + 1] &&
        password[i + 1] === password[i + 2]
      ) {
        return true;
      }
    }
    return false;
  }
}

export const passwordService = new PasswordService();
