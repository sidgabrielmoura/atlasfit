declare module "@abacatepay/sdk" {
  export interface AbacatePayClient {
    checkouts: {
      create(data: {
        items: Array<{ id: string; quantity: number }>;
        customer: {
          name: string;
          email: string;
          cellphone?: string;
          taxId: string;
        };
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
    products: {
      create(data: {
        externalId: string;
        name: string;
        price: number;
        currency: string;
        description?: string;
      }): Promise<{
        id: string;
        externalId: string;
        name: string;
        price: number;
      }>;
      list(): Promise<any[]>;
      get(params: { id?: string; externalId?: string }): Promise<any>;
      delete(params: { id: string }): Promise<any>;
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
