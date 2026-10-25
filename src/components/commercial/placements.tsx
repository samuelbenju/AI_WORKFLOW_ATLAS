import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import type {PackageKind} from "@/generated/prisma/client";
import {activePlacements} from "@/server/commercial/placements";
export async function SponsoredPlacements({kind,targetId}:{kind:PackageKind;targetId?:string}) {
 const rows=await activePlacements(kind,targetId);if(!rows.length)return null;
 return <aside className="sponsored-placements" aria-label="Sponsored placements">{rows.map(row=><article className="sponsored-placement" key={row.id} data-testid="sponsored-placement"><p className="eyebrow">SPONSORED · {row.sponsorName}</p><h2>{row.headline}</h2><p>{row.message}</p><a className="text-link" href={row.destinationUrl} target="_blank" rel="sponsored noopener noreferrer">Visit sponsor <ArrowUpRight size={15} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>{row.contentHref&&<Link className="text-link" href={row.contentHref}>Read the related listing →</Link>}</article>)}</aside>;
}
