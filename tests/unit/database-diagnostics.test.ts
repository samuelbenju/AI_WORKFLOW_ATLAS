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

test('P2028 start timeout retains only a fixed subtype from its exact known suffix',()=>{
 const privateText='Bearer fixture-only-private-material';
 const error={code:'P2028',message:`${privateText}\nTransaction API error: Unable to start a transaction in the given time.`,meta:{modelName:privateText}};
 const diagnostic=databaseDiagnostic(error,'catalog.home');
 assert.deepEqual(diagnostic,{stage:'catalog.home',codes:['P2028','TRANSACTION_START_TIMEOUT']});
 assert.ok(!JSON.stringify(diagnostic).includes(privateText));
 assert.deepEqual(databaseDiagnostic(new DatabaseOperationError(diagnostic),'readiness.connection'),diagnostic);
});
test('P2028 execution expiry uses validated timing metadata without reading the message',()=>{
 const error={code:'P2028',meta:{operation:'rollback',timeout:5000,timeTaken:6004}};
 Object.defineProperty(error,'message',{get(){throw Error('Do not read message when metadata identifies expiry');}});
 assert.deepEqual(databaseDiagnostic(error,'catalog.home').codes,['P2028','TRANSACTION_EXECUTION_TIMEOUT']);
});
test('unknown P2028 reasons and untrusted timing metadata remain unclassified and safe',()=>{
 for(const meta of [{operation:'private',timeout:5000,timeTaken:6004},{operation:'query',timeout:-1,timeTaken:6004},{operation:'query',timeout:5000,timeTaken:100},{operation:'query',timeout:5000,timeTaken:Infinity}]){
  assert.deepEqual(databaseDiagnostic({code:'P2028',meta,message:'Unrecognized private transaction error'},'catalog.home').codes,['P2028']);
 }
 const hostile={code:'P2028'};Object.defineProperty(hostile,'message',{get(){throw Error('private');}});
 assert.deepEqual(databaseDiagnostic(hostile,'catalog.home').codes,['P2028']);
 assert.deepEqual(databaseDiagnostic({code:'P2010',message:'Transaction API error: Unable to start a transaction in the given time.'},'catalog.home').codes,['P2010']);
});
