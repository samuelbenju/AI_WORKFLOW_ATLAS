import { parseArgs } from 'node:util';
import { checkBlueprintPackage } from '../src/server/blueprints/package-check';
async function main() {
  const {values}=parseArgs({options:{directory:{type:'string'}},strict:true});
  if (!values.directory) throw Error();
  console.log(JSON.stringify({stage:'blueprint.package.inspect',...await checkBlueprintPackage(values.directory)},null,2));
}
main().catch(()=>{console.error(JSON.stringify({stage:'blueprint.package.inspect',codes:['PRIVATE_PACKAGE_REJECTED']}));process.exitCode=1;});
