// Only fixed stages and allowlisted codes may leave a database failure boundary.
export const databaseStages = [
  'database.unknown', 'database.configure', 'database.pool', 'database.connection',
  'catalog.home', 'catalog.tools', 'catalog.use-cases', 'catalog.facets.tools',
  'catalog.facets.use-cases', 'catalog.tool', 'catalog.use-case',
  'readiness.connection', 'readiness.alerts', 'readiness.timeout',
] as const;
export type DatabaseStage = typeof databaseStages[number];
const stageSet = new Set<string>(databaseStages);
const permittedCodes = new Set([
  'P1000','P1001','P1002','P1003','P1008','P1009','P1010','P1011','P1013','P1014','P1017',
  'P2000','P2002','P2003','P2005','P2009','P2010','P2015','P2021','P2022','P2024','P2028','P2034','P2037',
  '08000','08001','08003','08004','08006','08007','08P01','28000','28P01','3D000','3F000',
  '42501','42P01','42703','42601','42883','42804','22P02','23503','23505','23514',
  '25001','25006','25P02','40001','40P01','53300','53400','57014','57P01','57P02','57P03',
  'ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ECONNABORTED','ETIMEDOUT',
  'ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','CERT_NOT_YET_VALID',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY','UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN',
  'TLS_CONNECTION_ERROR','DATABASE_NOT_REACHABLE','DATABASE_URL_INVALID',
  'PRISMA_INITIALIZATION_ERROR','PRISMA_VALIDATION_ERROR','READINESS_TIMEOUT',
  'UNCLASSIFIED_DATABASE_ERROR',
]);
const kindCodes: Record<string,string> = {
  AuthenticationFailed:'28P01', DatabaseAccessDenied:'28000', DatabaseDoesNotExist:'3D000',
  TableDoesNotExist:'42P01', ColumnNotFound:'42703', TooManyConnections:'53300',
  TlsConnectionError:'TLS_CONNECTION_ERROR', DatabaseNotReachable:'DATABASE_NOT_REACHABLE',
  ConnectionClosed:'ECONNRESET', SocketTimeout:'ETIMEDOUT',
  PrismaClientInitializationError:'PRISMA_INITIALIZATION_ERROR',
  PrismaClientValidationError:'PRISMA_VALIDATION_ERROR',
};
export type DatabaseDiagnostic = {stage:DatabaseStage;codes:string[]};
function field(value:object,key:string):unknown {try{return Reflect.get(value,key);}catch{return undefined;}}
export function databaseDiagnostic(error:unknown,fallback:DatabaseStage):DatabaseDiagnostic {
  let stage=stageSet.has(fallback)?fallback:'database.unknown' as DatabaseStage;
  const codes=new Set<string>(),seen=new Set<object>();
  if(error instanceof DatabaseOperationError){
    const diagnostic=error.diagnostic;
    if(stageSet.has(diagnostic.stage))stage=diagnostic.stage;
    for(const code of diagnostic.codes)if(permittedCodes.has(code))codes.add(code);
  }
  function visit(value:unknown,depth:number){
    if(!value||typeof value!=='object'||seen.has(value)||depth>6||seen.size>=32)return;
    seen.add(value);
    for(const key of ['code','originalCode','sqlState']){const code=field(value,key);if(typeof code==='string'&&permittedCodes.has(code))codes.add(code);}
    for(const key of ['kind','name']){const kind=field(value,key);if(typeof kind==='string'&&Object.hasOwn(kindCodes,kind))codes.add(kindCodes[kind]!);}
    for(const key of ['cause','meta','driverAdapterError','error'])visit(field(value,key),depth+1);
    const errors=field(value,'errors');if(Array.isArray(errors))for(const nested of errors.slice(0,3))visit(nested,depth+1);
  }
  visit(error,0);
  return {stage,codes:codes.size?[...codes].sort().slice(0,8):['UNCLASSIFIED_DATABASE_ERROR']};
}
export class DatabaseOperationError extends Error {
  constructor(public readonly diagnostic:DatabaseDiagnostic,message='The database operation could not be completed.'){
    super(message);this.name='DatabaseOperationError';
    // Never retain the original error as a cause: frameworks may serialize it.
  }
}
