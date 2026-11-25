// Read-only authorization checks + browser test with intercepted email APIs.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mysql = require('mysql2/promise');
const sharp = require('sharp');
const { JwtService } = require('@nestjs/jwt');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.FRONTEND_TEST_URL || 'http://localhost:3009';
const api = process.env.BACKEND_TEST_URL || `http://localhost:${process.env.PORT || 5002}`;
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost')) throw new Error('Local development only.');
let db, browser;

async function run() {
  db = await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  const [accounts] = await db.query("SELECT MIN(id) AS id,role FROM users WHERE status='active' AND role IN ('super_admin','user') GROUP BY role");
  const admin = accounts.find(row => row.role === 'super_admin'), member = accounts.find(row => row.role === 'user');
  assert(admin && member, 'requires existing active admin and member for read-only authorization tests');
  const jwt = new JwtService();
  const token = id => jwt.sign({sub:id}, {secret:process.env.JWT_SECRET.trim(), expiresIn:'10m'});
  const request = (path, id, init={}) => fetch(`${api}/api/admin-email${path}`, {...init,headers:{...(id ? {Authorization:`Bearer ${token(id)}`} : {}),'Content-Type':'application/json'}});
  for (const path of ['/recipients', '/campaigns', `/campaigns/${randomUUID()}`]) {
    assert.equal((await request(path)).status,401);
    assert.equal((await request(path,member.id)).status,403);
  }
  assert.equal((await request('/campaigns',member.id,{method:'POST',body:'{}'})).status,403);
  assert.equal((await request('/campaigns',admin.id,{method:'POST',body:'{}'})).status,400);
  const allowed=await request('/recipients?audience=female',admin.id);
  assert.equal(allowed.status,200);
  const list=await allowed.json();
  assert(list.users.every(u=>['female','woman','women','girl','ladies','f'].includes(String(u.gender).trim().toLowerCase())));
  assert.equal((await request('/recipients?audience=invalid',admin.id)).status,400);
  console.log('PASS: live API allows only super admin; validates audience and POST payload. No emails queued.');

  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE} : {})});
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  await context.addCookies(['management_token','management_client_token','management_role'].map(name=>({name,value:name==='management_role'?'super_admin':token(admin.id),domain:'localhost',path:'/'})));
  const page=await context.newPage(); page.setDefaultTimeout(60000);
  const women=Array.from({length:52},(_,i)=>({id:randomUUID(),name:`Woman ${i}`,email:`woman${i}@example.test`,gender:'female'}));
  const men=[{id:randomUUID(),name:'Test Man',email:'man@example.test',gender:'male'}];
  let submitted, mockResult;
  await page.route('**/api/admin-email/**',async route=>{
    const req=route.request(),url=new URL(req.url());
    const respond=value=>route.fulfill({json:value,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*'}});
    if(req.method()==='OPTIONS') return respond({});
    if(req.method()==='POST') {
      assert(url.pathname.endsWith('/campaigns'));
      submitted=req.postDataJSON();
      mockResult={id:randomUUID(),subject:submitted.subject,audience:submitted.audience,total:submitted.selectAll?51:submitted.userIds.length,sent:1,failed:0,pending:0,status:'completed',createdAt:new Date().toISOString(),failures:[]};
      return respond(mockResult);
    }
    if(url.pathname.endsWith('/recipients')) {
      let users=url.searchParams.get('audience')==='female'?women:url.searchParams.get('audience')==='male'?men:[...women,...men];
      const search=url.searchParams.get('search')||'';
      users=users.filter(u=>`${u.name} ${u.email}`.includes(search));
      const current=Number(url.searchParams.get('page')||1);
      return respond({users:users.slice((current-1)*50,current*50),total:users.length,page:current,limit:50,smtpConfigured:true});
    }
    if(url.pathname.endsWith('/campaigns')) return respond({campaigns:mockResult?[mockResult]:[]});
    return respond(mockResult||{});
  });
  await page.goto(`${origin}/super-admin/email-send`,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Email Send',exact:true}).waitFor();
  await page.getByRole('button',{name:'Women',exact:true}).click();
  await page.getByLabel('Select all matching users').check();
  await page.getByText('52 selected',{exact:true}).waitFor();
  await page.getByLabel('Next page',{exact:true}).click();
  await page.getByLabel(`Select ${women[50].email}`,{exact:true}).uncheck();
  await page.getByText('51 selected',{exact:true}).waitFor();
  await page.getByLabel('Subject',{exact:true}).fill('A hello from Connect Love');
  await page.getByLabel('Message',{exact:true}).fill('Hello members!\nThis is a preview.');
  const photo=await sharp({create:{width:30,height:20,channels:3,background:'pink'}}).png().toBuffer();
  await page.getByLabel('Email photo',{exact:true}).setInputFiles({name:'photo.png',mimeType:'image/png',buffer:photo});
  await page.getByAltText('Email attachment preview').waitFor();
  await page.getByRole('button',{name:'Preview message',exact:true}).click();
  await page.getByAltText('Photo in email preview').waitFor();
  await page.getByRole('button',{name:'Send Email (51)',exact:true}).click();
  await page.getByText('Email campaign completed',{exact:true}).waitFor();
  assert.equal(submitted.selectAll,true); assert.equal(submitted.audience,'female');
  assert.deepEqual(submitted.excludedUserIds,[women[50].id]);
  assert(submitted.imageDataUrl.startsWith('data:image/png;base64,'));
  await page.getByRole('button',{name:'Men',exact:true}).click();
  await page.getByLabel(`Select ${men[0].email}`,{exact:true}).check();
  await page.getByText('1 selected',{exact:true}).waitFor();
  await page.getByRole('button',{name:'All users',exact:true}).click();
  await page.getByText('0 selected',{exact:true}).waitFor();
  await page.getByLabel('Search users').fill('man@example.test');
  await page.getByLabel('Select all matching users').check();
  await page.getByText('1 selected',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth), 'mobile layout fits viewport');
  console.log('PASS: browser gender filters, all-page selection, exclusions, photo upload/preview, send payload, result, history, filter reset, search and mobile layout. All sends intercepted.');
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close();await db?.end();});
