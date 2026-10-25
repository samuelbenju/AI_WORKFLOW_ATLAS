"use client";
export default function SponsorError({reset}:{reset:()=>void}){return <section className="container error-state" role="alert"><h1>Sponsorship information is temporarily unavailable.</h1><p>Please try again shortly. No request has been saved.</p><button className="button button-primary" onClick={reset}>Try again</button></section>;}
