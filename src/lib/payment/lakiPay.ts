// src/lib/payment/lakiPay.ts
// Laki Pay Payment Gateway Integration

import axios, { AxiosInstance } from "axios";
import crypto from "node:crypto";

// ============================================
// Laki Pay Configuration
// ============================================

const LAKI_PAY_CONFIG = {
  apiKey: process.env.LAKI_PAY_API_KEY || "",
  apiSecret: process.env.LAKI_PAY_API_SECRET || "",
  baseUrl: process.env.LAKI_PAY_BASE_URL || "https://api.lakipay.com",
  webhookSecret: process.env.LAKI_PAY_WEBHOOK_SECRET || "",
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/cancel`,
};

// ============================================
// Types
// ============================================

export interface LakiPayInitParams {
  amount: number;
  currency: string;
  merchantReference: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface LakiPayInitResponse {
  success: boolean;
  transactionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  status: string;
}

export interface LakiPayVerifyResponse {
  success: boolean;
  transactionId: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  amount: number;
  currency: string;
  paymentMethod?: string;
  paidAt?: string;
  metadata?: Record<string, any>;
}

export interface LakiPayWebhookPayload {
  event: string;
  transactionId: string;
  merchantReference: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  paidAt?: string;
  signature: string;
  metadata?: Record<string, any>;
}

// ============================================
// Laki Pay Service
// ============================================

export class LakiPayService {
  private client: AxiosInstance;
  private static instance: LakiPayService;

  private constructor() {
    this.client = axios.create({
      baseURL: LAKI_PAY_CONFIG.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LAKI_PAY_CONFIG.apiKey,
        "X-API-Secret": LAKI_PAY_CONFIG.apiSecret,
      },
      timeout: 30000,
    });
  }

  static getInstance(): LakiPayService {
    if (!LakiPayService.instance) {
      LakiPayService.instance = new LakiPayService();
    }
    return LakiPayService.instance;
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(
    params: LakiPayInitParams,
  ): Promise<LakiPayInitResponse> {
    try {
      const response = await this.client.post("/payments/initialize", {
        amount: params.amount,
        currency: params.currency || "USD",
        merchant_reference: params.merchantReference,
        customer: {
          email: params.customerEmail,
          name: params.customerName,
          phone: params.customerPhone,
        },
        description: params.description,
        return_url: LAKI_PAY_CONFIG.returnUrl,
        cancel_url: LAKI_PAY_CONFIG.cancelUrl,
        metadata: params.metadata,
      });

      console.log(
        `[LAKI PAY] Payment initialized: ${response.data.transaction_id}`,
      );

      return {
        success: true,
        transactionId: response.data.transaction_id,
        checkoutUrl: response.data.checkout_url,
        amount: response.data.amount,
        currency: response.data.currency,
        status: response.data.status,
      };
    } catch (error: any) {
      console.error(
        "[LAKI PAY] Initialization error:",
        error?.response?.data || error.message,
      );
      throw new Error(
        error?.response?.data?.message || "Failed to initialize payment",
      );
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string): Promise<LakiPayVerifyResponse> {
    try {
      const response = await this.client.get(
        `/payments/${transactionId}/verify`,
      );

      return {
        success: response.data.status === "completed",
        transactionId: response.data.transaction_id,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        paymentMethod: response.data.payment_method,
        paidAt: response.data.paid_at,
        metadata: response.data.metadata,
      };
    } catch (error: any) {
      console.error(
        "[LAKI PAY] Verification error:",
        error?.response?.data || error.message,
      );
      throw new Error("Failed to verify payment");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: Record<string, any>,
    signature: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", LAKI_PAY_CONFIG.webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return signature === expectedSignature;
  }

  /**
   * Process refund
   */
  async refundPayment(
    transactionId: string,
    amount?: number,
  ): Promise<boolean> {
    try {
      await this.client.post(`/payments/${transactionId}/refund`, {
        amount,
      });

      console.log(`[LAKI PAY] Refund processed: ${transactionId}`);
      return true;
    } catch (error: any) {
      console.error(
        "[LAKI PAY] Refund error:",
        error?.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Check if Laki Pay is configured
   */
  static isConfigured(): boolean {
    return !!(LAKI_PAY_CONFIG.apiKey && LAKI_PAY_CONFIG.apiSecret);
  }

  /**
   * Get configuration status for debugging
   */
  static getConfigStatus(): Record<string, boolean> {
    return {
      hasApiKey: !!LAKI_PAY_CONFIG.apiKey,
      hasApiSecret: !!LAKI_PAY_CONFIG.apiSecret,
      hasWebhookSecret: !!LAKI_PAY_CONFIG.webhookSecret,
      hasBaseUrl: !!LAKI_PAY_CONFIG.baseUrl,
      isFullyConfigured: LakiPayService.isConfigured(),
    };
  }
}

export default LakiPayService;
