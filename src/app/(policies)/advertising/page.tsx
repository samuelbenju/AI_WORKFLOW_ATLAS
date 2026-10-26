import {PolicyPage,policyMetadata} from "@/components/layout/policy-page";
export const dynamic="force-dynamic";
export function generateMetadata(){return policyMetadata("advertising");}
export default function Page(){return <PolicyPage slug="advertising"/>;}
