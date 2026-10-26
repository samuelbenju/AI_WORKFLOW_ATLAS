import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {databaseDiagnostic,DatabaseOperationError} from '../../src/lib/database-diagnostics';

test('database diagnostics retain nested Prisma and SQLSTATE codes without copying private fields',()=>{
 const sensitive='postgresql://private_user:private_password@private-host.invalid/private_database';
 const error={code:'P2010',message:sensitive,meta:{driverAdapterError:{cause:{originalCode:'42501',originalMessage:sensitive,detail:'private@example.invalid',query:sensitive}}}};
 assert.deepEqual(databaseDiagnostic(error,'catalog.home'),{stage:'catalog.home',codes:['42501','P2010']});
 assert.ok(!JSON.stringify(databaseDiagnostic(error,'catalog.home')).includes('private'));
});
test('database diagnostics classify authentication, TLS, DNS, pool and schema errors without reading messages',()=>{
 for(const [error,code] of [[{code:'28P01'},'28P01'],[{kind:'TlsConnectionError'},'TLS_CONNECTION_ERROR'],[{code:'ENOTFOUND'},'ENOTFOUND'],[{code:'53300'},'53300'],[{code:'42P01'},'42P01'],[{name:'PrismaClientValidationError'},'PRISMA_VALIDATION_ERROR']] as const){
  Object.defineProperty(error,'message',{get(){throw Error('Message must never be read');}});
  assert.deepEqual(databaseDiagnostic(error,'catalog.tools').codes,[code]);
 }
});
test('database diagnostics reject arbitrary codes, hostile getters and cyclic metadata',()=>{
 const error:{code:string;cause?:unknown}={code:'private_token'};error.cause=error;
 Object.defineProperty(error,'meta',{get(){throw Error('private data');}});
 assert.deepEqual(databaseDiagnostic(error,'catalog.home'),{stage:'catalog.home',codes:['UNCLASSIFIED_DATABASE_ERROR']});
});
test('safe database exceptions preserve approved stage/codes without retaining the original error',()=>{
 const safe=new DatabaseOperationError({stage:'database.configure',codes:['DATABASE_URL_INVALID']});
 assert.equal(safe.cause,undefined);
 assert.deepEqual(databaseDiagnostic(safe,'catalog.home'),{stage:'database.configure',codes:['DATABASE_URL_INVALID']});
});
