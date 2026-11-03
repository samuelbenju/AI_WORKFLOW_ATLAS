import 'server-only';
import {cache} from 'react';
import type {PrismaClient} from '@/generated/prisma/client';

// A committed PostgreSQL write changes MVCC visibility, including withdrawals
// made outside this process. Do not replace this live gate with a cached TTL.
const revisionForRequest=cache(async(db:PrismaClient)=>{
 const [row]=await db.$queryRaw<{revision:string;epoch:string}[]>`SELECT pg_current_snapshot()::text AS revision, pg_postmaster_start_time()::text AS epoch`;
 if(!row?.revision||!row.epoch)throw Error('PUBLIC_REVISION_UNAVAILABLE');
 return row.epoch+'|'+row.revision;
});
type Entry={at:number;value:unknown};
type Store={entries:Map<string,Entry>;pending:Map<string,Promise<unknown>>};
const stores=new WeakMap<PrismaClient,Store>();
const capacity=32,ttl=15000,maxBytes=256*1024;
export async function cachedPublicRead<T>(db:PrismaClient,key:string,load:()=>Promise<T>):Promise<T>{
 // This SELECT must succeed even for a hit. No stale-on-error or offline fallback.
 const revision=await revisionForRequest(db);
 if(revision.length>8192)return load();
 let store=stores.get(db);if(!store){store={entries:new Map(),pending:new Map()};stores.set(db,store);}
 const id=revision+'|'+key,now=Date.now(),entry=store.entries.get(id);
 if(entry&&now>=entry.at&&now-entry.at<ttl){store.entries.delete(id);store.entries.set(id,entry);return structuredClone(entry.value) as T;}
 if(entry)store.entries.delete(id);
 const pending=store.pending.get(id);if(pending)return structuredClone(await pending) as T;
 // Bound in-flight keys as well as retained entries; no unbounded search cache.
 if(store.pending.size>=capacity)return load();
 const operation=(async()=>{
  const value=await load();
  const serialized=JSON.stringify(value);
  if(serialized!==undefined&&Buffer.byteLength(serialized)<=maxBytes){
   store.entries.set(id,{at:Date.now(),value:structuredClone(value)});
   while(store.entries.size>capacity)store.entries.delete(store.entries.keys().next().value!);
  }
  return value;
 })();
 store.pending.set(id,operation);
 try{return structuredClone(await operation);}finally{store.pending.delete(id);}
}
