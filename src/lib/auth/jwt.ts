// src/lib/auth/jwt.ts
// Enterprise-Grade JWT Token Management

import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class JWTService {
  private readonly accessTokenSecret = process.env.JWT_SECRET!;
  private readonly refreshTokenSecret = process.env.JWT_SECRET!;
  private readonly accessTokenExpiry = process.env.JWT_EXPIRATION || "900"; // 15 minutes
  private readonly refreshTokenExpiry =
    process.env.REFRESH_TOKEN_EXPIRATION || "2592000"; // 30 days

  /**
   * Generate access token (short-lived)
   * Used for API authentication
   */
  generateAccessToken(payload: JWTPayload): string {
    try {
      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: parseInt(this.accessTokenExpiry),
        algorithm: "HS256",
      });
    } catch (error) {
      console.error("Error generating access token:", error);
      throw new Error("Failed to generate access token");
    }
  }

  /**
   * Generate refresh token (long-lived)
   * Used to get new access tokens
   */
  generateRefreshToken(payload: JWTPayload): string {
    try {
      return jwt.sign(payload, this.refreshTokenSecret, {
        expiresIn: parseInt(this.refreshTokenExpiry),
        algorithm: "HS256",
      });
    } catch (error) {
      console.error("Error generating refresh token:", error);
      throw new Error("Failed to generate refresh token");
    }
  }

  /**
   * Generate token pair (access + refresh)
   * Standard auth flow
   */
  generateTokenPair(payload: JWTPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ["HS256"],
      }) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error("Access token verification failed:", error);
      return null;
    }
  }

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ["HS256"],
      }) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error("Refresh token verification failed:", error);
      return null;
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error("Token decode failed:", error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Get time until token expiration (in seconds)
   */
  getTokenExpiresIn(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return 0;

    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - currentTime);
  }
}

export const jwtService = new JWTService();
