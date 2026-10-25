import {BookOpen} from "lucide-react";
import {SignupForm} from "./signup-form";
import {issueNewsletterForm} from "@/server/newsletter/config";
import type {newsletterSources} from "@/lib/newsletter";
export function NewsletterSection({source="home"}:{source?:typeof newsletterSources[number]}){
 let form;try{form=issueNewsletterForm(source);}catch{/* Keep the rest of the public catalogue available when newsletter configuration is missing. */}
 return <section className="newsletter-section container" id="newsletter" aria-label="The Atlas newsletter"><div><span className="newsletter-icon"><BookOpen size={24} aria-hidden="true"/></span><p className="eyebrow muted">A LITTLE SIGNAL IN YOUR INBOX</p><h2>Better ideas. Less noise.</h2><p>A practical briefing on tools worth exploring and workflows worth understanding.</p></div>{form?<SignupForm source={source} form={form}/>:<p>Newsletter signup is temporarily unavailable. Please try again later.</p>}</section>;
}
