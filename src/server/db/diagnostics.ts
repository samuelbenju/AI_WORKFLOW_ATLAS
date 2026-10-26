import 'server-only';
import {DatabaseOperationError,databaseDiagnostic,type DatabaseStage} from '@/lib/database-diagnostics';
const recorded=new WeakSet<Error>();
export function reportDatabaseError(stage:DatabaseStage,error:unknown){
  const diagnostic=databaseDiagnostic(error,stage);
  if(process.env.DATABASE_DIAGNOSTICS_ENABLED!=='false'&&(!(error instanceof Error)||!recorded.has(error))){
    console.error(JSON.stringify(diagnostic));
  }
  if(error instanceof Error)recorded.add(error);
  return diagnostic;
}
export async function databaseOperation<T>(stage:DatabaseStage,operation:()=>Promise<T>,publicMessage?:string):Promise<T>{
  try{return await operation();}
  catch(error){
    const diagnostic=reportDatabaseError(stage,error);
    if(error instanceof DatabaseOperationError&&!publicMessage)throw error;
    const safe=new DatabaseOperationError(diagnostic,publicMessage);recorded.add(safe);throw safe;
  }
}
