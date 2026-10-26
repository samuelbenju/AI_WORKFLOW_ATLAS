import "server-only";
import {checkoutIntegrity,transactionSchema,verifyWompiEvent} from "@/lib/payments/protocol";
import {AccessError} from "@/server/auth/policy";
import {adminConfiguration} from "@/server/auth/config";
import type {PaymentProvider,CheckoutInput} from "./provider";
export function wompiConfiguration(){
 const publicKey=process.env.WOMPI_PUBLIC_KEY??"",integrity=process.env.WOMPI_INTEGRITY_SECRET??"",events=process.env.WOMPI_EVENTS_SECRET??"";
 const sandboxKeys=/^pub_test_[A-Za-z0-9]+$/.test(publicKey)&&/^test_integrity_[A-Za-z0-9]+$/.test(integrity)&&/^test_events_[A-Za-z0-9]+$/.test(events);
 return {publicKey,integrity,events,ready:process.env.WOMPI_SANDBOX_ENABLED==="true"&&sandboxKeys};
}
export function requireWompi(){const config=wompiConfiguration();if(!config.ready)throw new AccessError(503,"Wompi Sandbox no está configurado con claves de prueba. No se inició un pago.");return config;}
export function paymentOrigin(){return adminConfiguration(process.env.PAYMENT_ORIGIN??process.env.SITE_URL).origin;}
export class WompiSandboxProvider implements PaymentProvider {
 readonly name="WOMPI";readonly environment="SANDBOX";
 constructor(private transport:typeof fetch=fetch){}
 checkout(input:CheckoutInput){const c=requireWompi();if(input.currency!=="COP"||input.amountMinor<=0n||input.amountMinor>BigInt(Number.MAX_SAFE_INTEGER)||input.expiresAt<=new Date())throw new AccessError(422,"Importe, moneda o expiración no válidos.");const expiration=input.expiresAt.toISOString();const url=new URL("https://checkout.wompi.co/p/");url.search=new URLSearchParams({"public-key":c.publicKey,currency:"COP","amount-in-cents":input.amountMinor.toString(),reference:input.reference,"expiration-time":expiration,"signature:integrity":checkoutIntegrity(input.reference,input.amountMinor.toString(),"COP",expiration,c.integrity),"redirect-url":input.returnUrl}).toString();return {url:url.toString(),expiresAt:input.expiresAt};}
 verifyEvent(input:unknown,header:string|null){return verifyWompiEvent(input,requireWompi().events,header);}
 async lookup(id:string){const c=requireWompi();if(!/^[A-Za-z0-9_-]{1,150}$/.test(id))throw new AccessError(422,"Identificador de transacción no válido.");try{const response=await this.transport(`https://sandbox.wompi.co/v1/transactions/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${c.publicKey}`},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();const result=await response.json() as {data?:unknown};const transaction=transactionSchema.parse(result.data);if(transaction.id!==id)throw new Error();return transaction;}catch{throw new AccessError(503,"No se pudo consultar Wompi Sandbox. El estado no se ha confirmado.");}}
}
