// src/lib/utils/common.ts
// Common Utility Functions

import crypto from "node:crypto";

// ============================================
// Generate UUID
// ============================================

export function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================
// Generate Random String
// ============================================

export function generateRandomString(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// ============================================
// Hash String with SHA256
// ============================================

export function hashString(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

// ============================================
// Generate QR Code Data
// ============================================

export function generateQRCodeData(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
}

// ============================================
// Format Currency
// ============================================

export function formatCurrency(
  amount: number,
  currency: string = "ETB",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// ============================================
// Format Date
// ============================================

export function formatDate(
  date: Date,
  format: string = "YYYY-MM-DD HH:mm:ss",
): string {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

// ============================================
// Calculate Time Until Expiration
// ============================================

export function getTimeUntilExpiration(expirationDate: Date): {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  isExpired: boolean;
} {
  const now = new Date();
  const diff = expirationDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      milliseconds: 0,
      seconds: 0,
      minutes: 0,
      hours: 0,
      days: 0,
      isExpired: true,
    };
  }

  return {
    milliseconds: diff,
    seconds: Math.floor(diff / 1000),
    minutes: Math.floor(diff / 1000 / 60),
    hours: Math.floor(diff / 1000 / 60 / 60),
    days: Math.floor(diff / 1000 / 60 / 60 / 24),
    isExpired: false,
  };
}

// ============================================
// Slugify String
// ============================================

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================
// Truncate String
// ============================================

export function truncate(
  str: string,
  length: number = 50,
  suffix: string = "...",
): string {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

// ============================================
// Get File Extension
// ============================================

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

// ============================================
// Get File Name Without Extension
// ============================================

export function getFileNameWithoutExtension(filename: string): string {
  return filename.substring(0, filename.lastIndexOf(".")) || filename;
}

// ============================================
// Check if Email is Valid
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// Check if URL is Valid
// ============================================

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Retry Function with Exponential Backoff
// ============================================

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================
// Delay Function (Sleep)
// ============================================

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Group Array by Key
// ============================================

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const group = String(item[key]);
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    },
    {} as Record<string, T[]>,
  );
}

// ============================================
// Flatten Nested Array
// ============================================

export function flatten<T>(arr: (T | T[])[]): T[] {
  return arr.reduce<T[]>((acc, val) => {
    return Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val);
  }, []);
}

// ============================================
// Remove Duplicates from Array
// ============================================

export function removeDuplicates<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ============================================
// Deep Clone Object
// ============================================

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;

  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array)
    return obj.map((item) => deepClone(item)) as unknown as T;
  if (obj instanceof Object) {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

// ============================================
// Format Duration (seconds → "X min Y sec")
// ============================================

export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return "0 min";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return secs + " sec";
  if (secs === 0) return mins + " min";
  return mins + " min " + secs + " sec";
}
