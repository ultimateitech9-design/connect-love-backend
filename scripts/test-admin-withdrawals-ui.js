// Read-only live access checks; every browser payout mutation is intercepted.
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const mysql=require('mysql2/promise');
const {JwtService}=require('@nestjs/jwt');
require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(process.env.DB_HOST||'localhost'))throw new Error('Local only.');
const api=`http://localhost:${process.env.PORT||5002}`,origin='http://localhost:3009';
const jwt=new JwtService();let db,browser,page;
async function run(){
 db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 const [accounts]=await db.query("SELECT MIN(id) AS id,role FROM users WHERE status='active' AND (role='super_admin' OR (role='user' AND gender='male')) GROUP BY role");
 const admin=accounts.find(row=>row.role==='super_admin'),member=accounts.find(row=>row.role==='user');assert(admin&&member);
 const token=id=>jwt.sign({sub:id},{secret:process.env.JWT_SECRET.trim(),expiresIn:'10m'});
 const read=(id,query='')=>fetch(api+'/users/admin/withdrawals'+query,{headers:id?{Authorization:`Bearer ${token(id)}`}:{}});
 assert.equal((await read()).status,401);assert.equal((await read(member.id)).status,403);
 const allowed=await read(admin.id,'?search='+randomUUID());assert.equal(allowed.status,200);assert.equal((await allowed.json()).total,0);
 assert.equal((await read(admin.id,'?status=invalid')).status,400);
 const forbidden=await fetch(api+'/users/admin/coin-transactions/'+randomUUID()+'/withdrawal',{method:'PATCH',headers:{Authorization:`Bearer ${token(member.id)}`,'Content-Type':'application/json'},body:JSON.stringify({status:'completed'})});assert.equal(forbidden.status,403);
 const user={id:randomUUID(),name:'Referral Woman',email:'referral@example.test',phone:'9000011111',gender:'female',age:29,city:'Delhi',profession:'Designer',status:'active',photo:'/connect-love-logo.png'};
 const bank={id:randomUUID(),status:'pending',walletSource:'referral',coins:0,amountPaise:100000,amountEstimated:false,createdAt:new Date().toISOString(),user,agent:null,payout:{method:'bank',accountHolder:'Referral Woman Holder',bankName:'Test Bank',accountNumber:'123456789012',ifsc:'SBIN0001234',upiId:null}};
 const upi={...bank,id:randomUUID(),walletSource:'coins',coins:1000,user:{...user,id:randomUUID(),name:'Earnings Woman',email:'earnings@example.test'},payout:{method:'upi',upiId:'earnings-test@upi',accountHolder:null,bankName:null,accountNumber:null,ifsc:null}};
 let rows=[bank,upi,...Array.from({length:25},(_,i)=>({...bank,id:randomUUID(),status:'completed',createdAt:new Date(Date.now()-(i+1)*86400000).toISOString(),user:{...user,name:`History ${i}`}}))];let updates=[];
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 await context.addCookies(['management_token','management_client_token','management_role'].map(name=>({name,value:name==='management_role'?'super_admin':token(admin.id),domain:'localhost',path:'/'})));
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('dialog',dialog=>dialog.accept());
 await page.route('**/users/admin/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  const respond=value=>route.fulfill({json:value,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*'}});
  if(request.method()==='OPTIONS')return respond({});
  if(request.method()==='PATCH'){
   const id=url.pathname.split('/').at(-2),status=request.postDataJSON().status;updates.push({id,status});rows=rows.map(row=>row.id===id?{...row,status}:row);return respond({id,status});
  }
  const q=url.searchParams,search=(q.get('search')||'').toLowerCase(),source=q.get('source'),status=q.get('status'),current=Number(q.get('page')||1);
  let list=rows.filter(row=>(source==='all'||row.walletSource===source)&&(!search||JSON.stringify(row).toLowerCase().includes(search)));
  const summary={total:list.length,pending:list.filter(row=>row.status==='pending').length,paid:list.filter(row=>row.status==='completed').length,rejected:list.filter(row=>row.status==='rejected').length,pendingPaise:list.filter(row=>row.status==='pending').reduce((sum,row)=>sum+row.amountPaise,0)};
  if(status!=='all')list=list.filter(row=>row.status===status);
  list.sort((a,b)=>Number(a.status!=='pending')-Number(b.status!=='pending')||new Date(b.createdAt)-new Date(a.createdAt));
  return respond({items:list.slice((current-1)*25,current*25),total:list.length,page:current,limit:25,hasMore:current*25<list.length,summary});
 });
 await page.goto(origin+'/super-admin/withdrawals',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Withdrawals',exact:true}).waitFor();
 let card=page.getByRole('article',{name:`Withdrawal ${bank.id}`,exact:true});await card.waitFor();
 for(const text of ['Referral Woman','referral@example.test','9000011111','Delhi','Designer','Referral Woman Holder','Test Bank','123456789012','SBIN0001234'])await card.getByText(text,{exact:true}).waitFor();
 await card.getByRole('button',{name:'Copy payment details',exact:true}).click();const copied=await page.evaluate(()=>navigator.clipboard.readText());assert(copied.includes('123456789012')&&copied.includes(bank.id)&&copied.includes('Referral rewards'));
 await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText(/Page 2 of 2/).waitFor();
 await page.getByRole('button',{name:'Previous',exact:true}).click();await card.waitFor();
 await page.getByLabel('Withdrawal source').selectOption('referral');await card.waitFor();assert.equal(await page.getByRole('article',{name:`Withdrawal ${upi.id}`,exact:true}).count(),0);
 await page.getByLabel('Withdrawal source').selectOption('all');
 await page.getByLabel('Search withdrawals').fill('earnings-test@upi');
 const upiCard=page.getByRole('article',{name:`Withdrawal ${upi.id}`,exact:true});await upiCard.getByText('earnings-test@upi',{exact:true}).waitFor();
 await upiCard.getByRole('button',{name:'Reject',exact:true}).click();await page.getByRole('status').getByText('Withdrawal rejected. The balance has been returned to the correct wallet.',{exact:true}).waitFor();assert.deepEqual(updates[0],{id:upi.id,status:'rejected'});
 await page.getByLabel('Search withdrawals').fill('referral@example.test');await card.waitFor();
 await card.getByRole('button',{name:'Mark Paid',exact:true}).click();await card.getByText('Paid',{exact:true}).waitFor();assert.deepEqual(updates[1],{id:bank.id,status:'completed'});assert.equal(await card.getByRole('button',{name:'Mark Paid',exact:true}).count(),0);
 await page.getByLabel('Search withdrawals').fill('');await page.getByRole('button',{name:/^Pending/}).click();
 await page.getByText('No withdrawal requests found.',{exact:true}).waitFor();
 const incoming={...upi,id:randomUUID(),status:'pending',user:{...user,name:'New Incoming Request'}};rows.unshift(incoming);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 assert.equal(await page.getByText('New Incoming Request',{exact:true}).count(),0,'focus does not automatically refresh the list');
 await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('New Incoming Request',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'withdrawal details fit mobile viewport');
 console.log('PASS: live super-admin authorization, full bank/UPI and member details, copy, pagination, search/source/status filters, mocked Paid/Reject actions, manual refresh without focus reload and mobile layout. No real payout modified.');
}
run().catch(async error=>{console.error(error);if(page)console.error((await page.locator('body').innerText()).slice(-1400));process.exitCode=1}).finally(async()=>{await browser?.close();await db?.end();});
