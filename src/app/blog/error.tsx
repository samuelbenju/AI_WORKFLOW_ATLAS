"use client";
import Link from "next/link";
export default function BlogError({reset}:{reset:()=>void}) {return <section className="container error-state" role="alert"><h1>The journal is temporarily unavailable.</h1><p>We couldn’t load the articles. Please try again shortly.</p><button className="button button-primary" onClick={reset}>Try again</button><Link className="text-link" href="/blog">Back to the journal</Link></section>;}
