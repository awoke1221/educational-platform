import axios, { AxiosInstance } from "axios";

const PAYPAL_CONFIG = {
  clientId: process.env.PAYPAL_CLIENT_ID || "",
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
  baseUrl: process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com",
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/paypal/capture`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/paypal/cancel`,
};

export interface PayPalOrderParams {
  amount: number;
  currency: string;
  referenceId: string;
  description: string;
  customId: string;
}

export interface PayPalOrderResult {
  orderId: string;
  checkoutUrl: string;
  status: string;
}

export class PayPalService {
  private client: AxiosInstance;
  private static instance: PayPalService;

  private constructor() {
    this.client = axios.create({
      baseURL: PAYPAL_CONFIG.baseUrl,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });
  }

  static getInstance() {
    if (!PayPalService.instance) PayPalService.instance = new PayPalService();
    return PayPalService.instance;
  }

  private async accessToken() {
    const credentials = Buffer.from(
      `${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`,
    ).toString("base64");
    const response = await axios.post(
      `${PAYPAL_CONFIG.baseUrl}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    return response.data.access_token as string;
  }

  async createOrder(params: PayPalOrderParams): Promise<PayPalOrderResult> {
    try {
      const token = await this.accessToken();
      const response = await this.client.post(
        "/v2/checkout/orders",
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: params.referenceId,
              custom_id: params.customId,
              description: params.description,
              amount: {
                currency_code: params.currency,
                value: params.amount.toFixed(2),
              },
            },
          ],
          application_context: {
            brand_name: "Adonay TikTok Academy",
            user_action: "PAY_NOW",
            return_url: PAYPAL_CONFIG.returnUrl,
            cancel_url: PAYPAL_CONFIG.cancelUrl,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const approvalLink = response.data.links?.find(
        (link: { rel: string }) => link.rel === "approve",
      )?.href;
      if (!approvalLink)
        throw new Error("PayPal approval link was not returned");
      return {
        orderId: response.data.id,
        checkoutUrl: approvalLink,
        status: response.data.status,
      };
    } catch (error: unknown) {
      const details = error as {
        response?: { data?: unknown };
        message?: string;
      };
      console.error(
        "[PAYPAL] Order creation error:",
        details.response?.data || details.message,
      );
      throw new Error("Unable to start PayPal payment");
    }
  }

  async captureOrder(orderId: string) {
    const token = await this.accessToken();
    try {
      const response = await this.client.post(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error: unknown) {
      const details = error as {
        response?: { data?: { details?: Array<{ description?: string }> } };
        message?: string;
      };
      console.error(
        "[PAYPAL] Capture error:",
        details.response?.data || details.message,
      );
      throw new Error(
        details.response?.data?.details?.[0]?.description ||
          "PayPal could not complete the transaction",
      );
    }
  }

  static isConfigured() {
    return Boolean(PAYPAL_CONFIG.clientId && PAYPAL_CONFIG.clientSecret);
  }
}

export default PayPalService;
