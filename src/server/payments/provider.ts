import "server-only";
import type {ProviderTransaction} from "@/lib/payments/protocol";
export type CheckoutInput={reference:string;amountMinor:bigint;currency:"COP";expiresAt:Date;returnUrl:string};
export interface PaymentProvider {
 readonly name:string;
 readonly environment:"SANDBOX";
 checkout(input:CheckoutInput):{url:string;expiresAt:Date};
 verifyEvent(input:unknown,header:string|null):{transaction:ProviderTransaction;eventId:string;digest:string;timestamp:number};
 lookup(transactionId:string):Promise<ProviderTransaction>;
}
