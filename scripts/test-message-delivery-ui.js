// Local end-to-end delivery checks. Only temporary accounts exchange messages.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const path = require('node:path');
const mysql = require('mysql2/promise');
const {JwtService} = require('@nestjs/jwt');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(process.env.DB_HOST||'localhost'))throw new Error('Local database only.');
const ids=[randomUUID(),randomUUID()], conversationId=randomUUID();
const base=`http://localhost:${process.env.PORT||5003}`,origin='http://localhost:3009';
const jwt=new JwtService(),token=id=>jwt.sign({sub:id},{secret:process.env.JWT_SECRET.trim(),expiresIn:'15m'});
let db,browser;const contexts=[],pages=[],failures=[];
const bubble=(page,text)=>page.locator('span.whitespace-pre-wrap').filter({hasText:text});
async function visible(page,text,timeout=8000){try{await bubble(page,text).first().waitFor({timeout});return true;}catch{return false;}}
async function send(index,text){const input=pages[index].getByPlaceholder('Type a message...',{exact:true});await input.fill(text);await input.press('Enter');}
async function check(label,fn){try{await fn();console.log('PASS: '+label);}catch(e){failures.push(label+': '+e.message);console.error('FAIL: '+label);}}
async function run(){
 db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 for(let i=0;i<2;i++)await db.execute('INSERT INTO users (id,name,email,password,birthDate,gender,role,status,plan,onboardingCompleted,photos,notifyMessages,notifyPush) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',[ids[i],`Delivery ${i}`,`${ids[i]}@example.invalid`,'not-a-login','1995-01-01',i?'female':'male','user','active','platinum',true,'[]',false,false]);
 await db.execute('INSERT INTO matches (id,senderId,receiverId,status) VALUES (?,?,?,?)',[conversationId,...ids,'MATCHED']);
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
 for(let i=0;i<2;i++){
  const ctx=await browser.newContext({viewport:{width:1200,height:950}});contexts.push(ctx);
  await ctx.addCookies([{name:'sm_auth',value:'1',domain:'localhost',path:'/'}]);
  await ctx.addInitScript(value=>localStorage.setItem('sm_token',value),token(ids[i]));
  const page=await ctx.newPage();pages.push(page);page.setDefaultTimeout(25000);
  await page.goto(`${origin}/user/messages?id=${conversationId}`,{waitUntil:'domcontentloaded'});
  await page.getByPlaceholder('Type a message...',{exact:true}).waitFor();
 }
 await check('A to B live delivery',async()=>{const start=Date.now();await send(0,'Hello from sender');assert(await visible(pages[1],'Hello from sender',2000));console.log(`A to B: ${Date.now()-start}ms`);});
 await check('B to A live reply',async()=>{const start=Date.now();await send(1,'Hello from receiver');assert(await visible(pages[0],'Hello from receiver',2000));console.log(`B to A: ${Date.now()-start}ms`);});
 await check('REST fallback reaches online receiver',async()=>{
  const start=Date.now();
  const response=await fetch(`${base}/messages/${conversationId}`,{method:'POST',headers:{Authorization:`Bearer ${token(ids[0])}`,'Content-Type':'application/json'},body:JSON.stringify({receiverId:ids[1],content:'REST fallback delivery'})});
  assert.equal(response.status,201);assert(await visible(pages[1],'REST fallback delivery',2000));
  assert(await visible(pages[0],'REST fallback delivery',2000));
  console.log(`REST fallback: ${Date.now()-start}ms`);
  assert.equal(await bubble(pages[0],'REST fallback delivery').count(),1,'sender has one copy');
 });
 await check('REST fallback delivers replies in the other direction',async()=>{
  const response=await fetch(`${base}/messages/${conversationId}`,{method:'POST',headers:{Authorization:`Bearer ${token(ids[1])}`,'Content-Type':'application/json'},body:JSON.stringify({receiverId:ids[0],content:'REST fallback reply'})});
  assert.equal(response.status,201);assert(await visible(pages[0],'REST fallback reply',2000));
 });
 await check('Repeated messages stay separate without duplicates',async()=>{
  await send(0,'Repeat delivery');await send(0,'Repeat delivery');
  await pages[1].waitForFunction(()=>[...document.querySelectorAll('span.whitespace-pre-wrap')].filter(el=>el.textContent==='Repeat delivery').length===2);
  await pages[0].waitForFunction(({id,userId})=>JSON.parse(localStorage.getItem(`connect-love-messages:${userId}:${id}`)||'[]').filter(m=>m.content==='Repeat delivery'&&!m.id.startsWith('local-')).length===2,{id:conversationId,userId:ids[0]});
  assert.equal(await bubble(pages[0],'Repeat delivery').count(),2);
 });
 await check('Messages sent while away appear on returning to chat',async()=>{
  await pages[0].goto(origin+'/user/profile',{waitUntil:'domcontentloaded'});
  await send(1,'Message while sender offline');
  await pages[1].waitForFunction(({userId,id})=>JSON.parse(localStorage.getItem(`connect-love-messages:${userId}:${id}`)||'[]').some(message=>message.content==='Message while sender offline'&&!message.id.startsWith('local-')),{userId:ids[1],id:conversationId});
  await pages[0].goto(`${origin}/user/messages?id=${conversationId}`,{waitUntil:'domcontentloaded'});
  assert(await visible(pages[0],'Message while sender offline',15000));
 });
 await check('Reload restores complete message history',async()=>{
  await pages[0].reload({waitUntil:'domcontentloaded'});
  await pages[0].getByPlaceholder('Type a message...',{exact:true}).waitFor();
  assert(await visible(pages[0],'Message while sender offline'));
 });
 const [rows]=await db.execute('SELECT content,isRead FROM messages WHERE conversationId=?',[conversationId]);
 assert.equal(rows.length,7,'each message saved exactly once');
 console.log('Database: all seven messages saved exactly once.');
 if(failures.length)throw new Error(failures.join('\n'));
 console.log('PASS: all message delivery scenarios.');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(db){await db.execute('DELETE FROM plan_usage WHERE userId IN (?,?)',ids);await db.execute('DELETE FROM users WHERE id IN (?,?)',ids);await db.end();}});
