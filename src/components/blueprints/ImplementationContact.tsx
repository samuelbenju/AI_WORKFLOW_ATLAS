import Link from 'next/link';
import {legalConfiguration} from '@/lib/legal';
import {ServiceInquiryCard} from './ServiceInquiryCard';
export function ImplementationContact(){
 const legal=legalConfiguration();
 if(legal.reviewed&&legal.email)return <ServiceInquiryCard email={legal.email}/>;
 return <section className="blueprint-service" aria-label="Implementation contact availability"><h3>Need help implementing an automation?</h3><p>Implementation contact details and service availability are pending operator confirmation. No booking is available here.</p><Link className="text-link" href="/contact">Contact information &amp; availability</Link></section>;
}
