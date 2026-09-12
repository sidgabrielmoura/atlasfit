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
        image?: string;
        imageUrl?: string;
      }): Promise<{
        id: string;
        externalId: string;
        name: string;
        price: number;
        cycle?: AbacatePayCycle;
        image?: string;
      }>;
      update?(
        id: string,
        data: {
          name?: string;
          description?: string;
          price?: number;
          image?: string;
          imageUrl?: string;
        }
      ): Promise<any>;
      list(query?: { page?: number; limit?: number }): Promise<any[]>;
      get(params: { id?: string; externalId?: string }): Promise<any>;
      delete(params: { id: string } | string): Promise<any>;
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
    store: {
      get(): Promise<{
        id: string;
        name: string;
        balance: {
          available: number;
          pending: number;
          blocked: number;
        };
      }>;
    };
    mrr: {
      get(): Promise<{
        mrr: number;
        totalActiveSubscriptions: number;
      }>;
      revenue(query?: { startDate?: string; endDate?: string }): Promise<{
        totalRevenue: number;
        totalTransactions: number;
        transactionsPerDay: Record<string, { amount: number; count: number }>;
      }>;
      merchant(): Promise<{
        name: string;
        website: string;
        createdAt: string;
      }>;
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
