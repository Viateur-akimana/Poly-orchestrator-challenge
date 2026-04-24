import crypto from 'crypto';

export interface UnitPayConfig {
  publicKey: string;
  secretKey: string;
  domain: string;
}

export class UnitPayService {
  private config: UnitPayConfig;

  constructor() {
    this.config = {
      publicKey: process.env.UNITPAY_PUBLIC_KEY || '',
      secretKey: process.env.UNITPAY_SECRET_KEY || '',
      domain: process.env.UNITPAY_DOMAIN || 'unitpay.ru',
    };
  }

  /**
   * Generate a signature for the payment form
   */
  public generatePaymentSignature(account: string, sum: number, desc: string, currency: string = 'RUB'): string {
    // sha256( account + "{up}" + currency + "{up}" + desc + "{up}" + sum + "{up}" + secretKey )
    const data = `${account}{up}${currency}{up}${desc}{up}${sum}{up}${this.config.secretKey}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate the payment redirect URL
   */
  public getPaymentUrl(account: string, sum: number, desc: string, currency: string = 'RUB', operator?: string): string {
    const signature = this.generatePaymentSignature(account, sum, desc, currency);
    const baseUrl = `https://${this.config.domain}/pay/${this.config.publicKey}`;
    
    const params: any = {
      sum: sum.toString(),
      account: account,
      desc: desc,
      currency: currency,
      signature: signature,
    };

    if (operator) {
      params.operator = operator;
    }

    const searchParams = new URLSearchParams(params);
    return `${baseUrl}?${searchParams.toString()}`;
  }

  /**
   * Verify a callback signature from UnitPay
   */
  public verifyCallbackSignature(method: string, params: any): boolean {
    const receivedSignature = params.signature || params.sign;
    if (!receivedSignature) return false;

    // 1. Filter out signature/sign
    const filteredParams = { ...params };
    delete filteredParams.signature;
    delete filteredParams.sign;

    // 2. Sort keys alphabetically
    const sortedKeys = Object.keys(filteredParams).sort();

    // 3. Extract values in sorted order
    const values = sortedKeys.map(key => filteredParams[key]);

    // 4. Construct string: method + "{up}" + values + "{up}" + secretKey
    const data = [method, ...values, this.config.secretKey].join('{up}');
    const calculatedSignature = crypto.createHash('sha256').update(data).digest('hex');

    return calculatedSignature === receivedSignature;
  }
}
