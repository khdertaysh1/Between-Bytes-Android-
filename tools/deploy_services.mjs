// Run in the authenticated deployment environment. Secrets travel through stdin,
// never command arguments, source files, or public web configuration.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const name of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','ACADEMY_D1_DATABASE_ID','ACADEMY_ADMIN_KEY','ACADEMY_RATE_SALT','ACADEMY_SERVICE_URL'])if(!process.env[name])throw Error('Missing deployment configuration: '+name);
for(const name of ['ACADEMY_ADMIN_KEY','ACADEMY_RATE_SALT'])if(process.env[name].length<32)throw Error(name+' must contain at least 32 random characters');
if(process.env.ACADEMY_ADMIN_KEY===process.env.ACADEMY_RATE_SALT)throw Error('Admin key and rate salt must be different');
if(!/^[0-9a-f-]{36}$/i.test(process.env.ACADEMY_D1_DATABASE_ID))throw Error('Invalid D1 database ID');
const origin=new URL(process.env.ACADEMY_SERVICE_URL);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.username||origin.password||origin.search||origin.hash)throw Error('Invalid public API origin');
const config=JSON.parse(await readFile(new URL('../services/academy-api/wrangler.jsonc',import.meta.url),'utf8'));config.d1_databases[0].database_id=process.env.ACADEMY_D1_DATABASE_ID;
const filename=fileURLToPath(new URL('../services/academy-api/wrangler.deploy.json',import.meta.url));await writeFile(filename,JSON.stringify(config,null,2));
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
function run(args,input){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[wrangler,...args,'--config',filename],{cwd:root,env:process.env,stdio:['pipe','inherit','inherit']});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Deployment step failed ('+code+')')));child.stdin.end(input?input+'\n':'');});}
try{await run(['d1','migrations','apply','DB','--remote']);await run(['deploy']);await run(['secret','put','ADMIN_KEY'],process.env.ACADEMY_ADMIN_KEY);await run(['secret','put','RATE_LIMIT_SALT'],process.env.ACADEMY_RATE_SALT);let ready=false;for(let i=0;i<5;i++){try{const response=await fetch(origin.origin+'/health',{signal:AbortSignal.timeout(15000)});const data=await response.json();if(response.ok&&data.configured){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,2000));}if(!ready)throw Error('Deployment finished but configured health check did not pass');console.log('Service ready. Run the GitHub Pages workflow to connect the public site.');}finally{await unlink(filename).catch(()=>{});}
