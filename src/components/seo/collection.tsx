import { absoluteUrl } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/editorial';
export function CollectionData({name,path,items,start=0}:{name:string;path:string;items:{name:string;path:string}[];start?:number}){
  if(process.env.CATALOG_DEMO_MODE==='true'||!items.length)return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd({
    '@context':'https://schema.org','@type':'CollectionPage',name,url:absoluteUrl(path),inLanguage:'en',
    mainEntity:{'@type':'ItemList',numberOfItems:items.length,itemListElement:items.map((item,index)=>({
      '@type':'ListItem',position:start+index+1,name:item.name,url:absoluteUrl(item.path),
    }))},
  })}}/>;
}
