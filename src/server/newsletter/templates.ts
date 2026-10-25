import "server-only";
import {escapeEmail as e,type NewsletterBody,type EmailMessage} from "@/lib/newsletter";
export function confirmationEmail(to:string,from:string,confirmUrl:string,unsubscribeUrl:string):EmailMessage {
 const text=`Confirm your AI Workflow Atlas subscription\n\nConfirm: ${confirmUrl}\n\nThis link expires in 24 hours. If you did not request this, ignore this message or cancel: ${unsubscribeUrl}`;
 return {to,from,subject:"Confirm your AI Workflow Atlas subscription",text,html:`<!doctype html><html lang="en"><body><h1>One more step.</h1><p>Confirm that you want practical AI workflows and clearly labeled sponsorships from AI Workflow Atlas.</p><p><a href="${e(confirmUrl)}">Confirm my subscription</a></p><p>This link expires in 24 hours. If you did not request this, ignore this email or <a href="${e(unsubscribeUrl)}">cancel this request</a>.</p></body></html>`};
}
export function campaignEmail(to:string,from:string,subject:string,preheader:string,body:NewsletterBody,articles:{title:string;url:string}[],unsubscribeUrl:string,sponsor?:{name:string;headline:string;message:string;url:string}):EmailMessage {
 const sponsored=sponsor?`\n\nSPONSORED · ${sponsor.name}\n${sponsor.headline}\n${sponsor.message}\n${sponsor.url}`:"";
 const text=[subject,preheader,...body.paragraphs,...articles.map(article=>`${article.title}\n${article.url}`),sponsored,`You subscribed to AI Workflow Atlas. Unsubscribe: ${unsubscribeUrl}`].filter(Boolean).join("\n\n");
 const html=`<!doctype html><html lang="en"><body><p>${e(preheader)}</p><h1>${e(subject)}</h1>${body.paragraphs.map(text=>`<p>${e(text).replace(/\n/g,"<br>")}</p>`).join("")}${articles.map(article=>`<p><a href="${e(article.url)}">${e(article.title)}</a></p>`).join("")}${sponsor?`<aside><p>SPONSORED · ${e(sponsor.name)}</p><h2>${e(sponsor.headline)}</h2><p>${e(sponsor.message)}</p><a href="${e(sponsor.url)}" rel="sponsored noopener noreferrer">Visit sponsor</a></aside>`:""}<hr><p>You subscribed to AI Workflow Atlas. <a href="${e(unsubscribeUrl)}">Unsubscribe</a> at any time.</p></body></html>`;
 return {to,from,subject,html,text,unsubscribeUrl};
}
