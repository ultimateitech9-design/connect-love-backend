// Real local websocket/REST flow with temporary accounts and fake media devices.
// Never contacts a real member; closes calls and removes its records afterward.
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const path=require('node:path');
const os=require('node:os');
const mysql=require('mysql2/promise');
const {JwtService}=require('@nestjs/jwt');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(process.env.DB_HOST||'localhost'))throw new Error('Local database only.');
const base=process.env.BACKEND_TEST_URL||`http://localhost:${process.env.PORT||5002}`;
const origin=process.env.FRONTEND_TEST_URL||'http://localhost:3009';
const ids=[randomUUID(),randomUUID(),randomUUID()];
const names=['Celebration Sender','Celebration Receiver','Another Match'];
let db,browser,pageA,pageB;
const jwt=new JwtService();
const token=id=>jwt.sign({sub:id},{secret:process.env.JWT_SECRET.trim(),expiresIn:'15m'});
async function api(id,path,body){const response=await fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${token(id)}`,'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await response.json();assert(response.ok,JSON.stringify(value));return value;}
async function context(index){
 const ctx=await browser.newContext({viewport:{width:1100,height:950},permissions:['camera','microphone']});
 await ctx.addCookies([{name:'sm_auth',value:'1',domain:'localhost',path:'/'}]);
 await ctx.addInitScript(value=>localStorage.setItem('sm_token',value),token(ids[index]));
 const page=await ctx.newPage();page.setDefaultTimeout(60000);
 // Freeze the REST fallback so the sender must receive the real websocket event.
 await page.route('**/matches/celebrations',route=>route.fulfill({json:{ids:[]},headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*'}}));
 await page.goto(origin+'/user/matches',{waitUntil:'domcontentloaded'});
 await page.getByRole('tab',{name:/Requests Received/}).waitFor();
 await page.waitForFunction(id=>localStorage.getItem('cl_match_celebrations_v1:'+id)!==null,ids[index]);
 return page;
}
async function run(){
 db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 for(let i=0;i<ids.length;i++)await db.execute('INSERT INTO users (id,name,email,password,birthDate,gender,role,status,onboardingCompleted,photos,notifyPush,notifyMessages) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[ids[i],names[i],`celebration-${ids[i]}@example.invalid`,'not-a-login','1995-01-01','female','user','active',true,JSON.stringify(['/connect-love-logo.png']),false,false]);
 browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'],...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
 pageA=await context(0);pageB=await context(1);
 const first=await api(ids[0],'/matches/swipe',{receiverId:ids[1],action:'like'});
 await pageB.getByRole('tab',{name:/Requests Received/}).click();
 await pageB.getByRole('button',{name:'Match',exact:true}).click();
 const a=pageA.getByRole('dialog',{name:"It's a Match!"}),b=pageB.getByRole('dialog',{name:"It's a Match!"});
 await Promise.all([a.waitFor({timeout:15000}),b.waitFor({timeout:15000})]);
 for(const dialog of [a,b]){
  await dialog.getByAltText("Celebration Sender's profile photo",{exact:true}).waitFor();
  await dialog.getByAltText("Celebration Receiver's profile photo",{exact:true}).waitFor();
  assert(await dialog.locator('img').evaluateAll(async images=>{
   await Promise.all(images.map(image=>image.decode().catch(()=>{})));
   return images.every(image=>image.complete&&image.naturalWidth>0);
  }),'both photos load successfully');
  assert((await dialog.getByRole('link',{name:'Send Message',exact:true}).getAttribute('href')).includes(first.id));
  assert.equal(await dialog.getByRole('button',{name:'Start Video Call',exact:true}).count(),1);
 }
 // The celebration card keeps its light background in both themes.
 await pageA.evaluate(()=>document.documentElement.classList.add('dark'));
 const description=a.locator('p').filter({hasText:'liked each other'});
 assert.equal(await description.evaluate(el=>getComputedStyle(el).color),'rgb(51, 65, 85)','middle text stays readable in dark mode');
 await pageA.screenshot({path:path.join(os.tmpdir(),'connect-love-match-popup.png')});
 await b.getByLabel('Close match popup').click();
 const second=await api(ids[0],'/matches/swipe',{receiverId:ids[2],action:'like'});
 await api(ids[2],'/matches/respond',{matchId:second.id,action:'accept'});
 // First card stays visible while the next match waits its turn.
 assert.equal(await a.getByAltText("Celebration Receiver's profile photo").count(),1);
 await a.getByRole('link',{name:'Send Message',exact:true}).click();
 await pageA.waitForURL(url=>url.pathname==='/user/messages'&&url.searchParams.get('id')===first.id);
 const next=pageA.getByRole('dialog',{name:"It's a Match!"});
 await next.getByAltText("Another Match's profile photo").waitFor();
 await next.getByRole('button',{name:'Start Video Call',exact:true}).click();
 await pageA.getByRole('button',{name:'End call',exact:true}).waitFor({timeout:30000});
 const [calls]=await db.execute('SELECT conversationId,callerId,receiverId,callType FROM video_calls WHERE callerId=?',[ids[0]]);
 assert(calls.some(call=>call.conversationId===second.id&&call.receiverId===ids[2]&&call.callType==='video'),'video action uses the correct match and recipient');
 await pageA.getByRole('button',{name:'End call',exact:true}).click();
 await api(ids[2],'/matches/respond',{matchId:second.id,action:'accept'});
 await pageA.evaluate(({id,userId})=>window.dispatchEvent(new CustomEvent('connect-love-new-match',{detail:{id,userId}})),{id:second.id,userId:ids[0]});
 assert.equal(await pageA.getByRole('dialog',{name:"It's a Match!"}).count(),0,'duplicate events do not reopen a dismissed match');
 console.log('PASS: real request acceptance, realtime popup for both accounts with both photos, renamed tab, queued matches, correct chat navigation, actual video-call start and duplicate suppression. Only temporary accounts and fake media used.');
}
run().catch(async error=>{console.error(error);if(pageA)console.error('Sender:',(await pageA.locator('body').innerText()).slice(-1100));if(pageB)console.error('Receiver:',(await pageB.locator('body').innerText()).slice(-900));process.exitCode=1}).finally(async()=>{
 await browser?.close();
 if(db){await db.execute('DELETE FROM plan_usage WHERE userId IN (?,?,?)',ids);await db.execute('DELETE FROM users WHERE id IN (?,?,?)',ids);await db.end();}
});
