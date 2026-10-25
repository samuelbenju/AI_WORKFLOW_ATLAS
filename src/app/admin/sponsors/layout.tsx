import {requirePageActor} from "@/server/auth/request";
import {CrmNavigation} from "@/components/admin/crm-navigation";
export default async function CrmLayout({children}:{children:React.ReactNode}){await requirePageActor("commercial");return <><CrmNavigation/>{children}</>;}
