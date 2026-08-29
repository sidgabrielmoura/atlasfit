declare module "@abacatepay/sdk" {
  export type AbacatePayCycle = "WEEKLY" | "MONTHLY" | "SEMIANNUALLY" | "ANNUALLY";

  export interface AbacatePayClient {
    checkouts: {
      create(data: {
        methods?: Array<"PIX" | "CARD">;
        items: Array<{ id: string; quantity: number }>;
        customer: {
          name: string;
          email: string;
          cellphone?: string;
          taxId: string;
        };
        allowCoupons?: boolean;
        coupons?: string[];
        externalId?: string;
        metadata?: Record<string, any>;
        returnUrl: string;
        completionUrl: string;
      }): Promise<{
        id: string;
        url: string;
        status: string;
      }>;
      list(): Promise<any[]>;
      get(params: { id: string }): Promise<any>;
    };
    subscriptions: {
      create(data: {
        items: Array<{ id: string; quantity: number }>;
        methods?: Array<"CARD" | "PIX">;
        customer?: {
          name: string;
          email: string;
          cellphone?: string;
          taxId: string;
        };
        customerId?: string;
        allowCoupons?: boolean;
        coupons?: string[];
        externalId?: string;
        metadata?: Record<string, any>;
        returnUrl?: string;
        completionUrl?: string;
        retryPolicy?: {
          maxRetry: number;
          retryEvery: number;
        };
      }): Promise<{
        id: string;
        url: string;
        status: string;
      }>;
      list(query?: { cursor?: string; limit?: number }): Promise<any>;
      cancel?(data: { id: string }): Promise<any>;
    };
    products: {
      create(data: {
        externalId: string;
        name: string;
        price: number;
        currency: string;
        description?: string;
        cycle?: AbacatePayCycle;
      }): Promise<{
        id: string;
        externalId: string;
        name: string;
        price: number;
        cycle?: AbacatePayCycle;
      }>;
      list(query?: { page?: number; limit?: number }): Promise<any[]>;
      get(params: { id?: string; externalId?: string }): Promise<any>;
      delete(params: { id: string }): Promise<any>;
    };
    coupons: {
      create(data: {
        code: string;
        discount: number;
        discountKind: "PERCENTAGE" | "FIXED";
        notes?: string;
        maxRedeems?: number;
        metadata?: Record<string, any>;
      }): Promise<any>;
      list(query?: { page?: number; limit?: number }): Promise<any>;
      get(id: string): Promise<any>;
      delete(id: string): Promise<any>;
      toggleStatus(id: string): Promise<any>;
    };
    webhooks: {
      verify(rawBody: string, signature: string): {
        event: string;
        id: string;
        data: any;
      };
    };
  }

  export function AbacatePay(config: { secret: string }): AbacatePayClient;
}
