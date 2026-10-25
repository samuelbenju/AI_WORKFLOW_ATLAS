import {NewsletterTokenAction} from "@/components/newsletter/token-action";
export const metadata={title:"Newsletter · AI Workflow Atlas",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default function ActionPage(){return <div className="container directory-page"><header className="directory-heading"><p className="eyebrow">THE ATLAS BRIEFING</p><h1>Manage your subscription.</h1></header><NewsletterTokenAction action="unsubscribe"/></div>;}
