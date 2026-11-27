// Isolated worker failures; no database, SMTP connection or real mail.
const assert=require('node:assert/strict');
const {AdminEmailService}=require('../dist/admin-email/admin-email.service');
const service=new AdminEmailService({}, {}, {}, {});
const logs=[],ready=[];let calls=0,now=100000;
const originalNow=Date.now;
service.smtpConfigured=()=>true;
service.logger.error=message=>logs.push(message);
service.logger.log=message=>ready.push(message);
service.processQueue=async()=>{calls++;throw Object.assign(new Error('private SQL and SMTP detail'),{code:'ER_NO_SUCH_TABLE'});};
(async()=>{
 Date.now=()=>now;
 try{
  await service.runQueueCycle();assert.equal(calls,1);assert.equal(logs.length,1);assert(logs[0].includes('ER_NO_SUCH_TABLE'));assert(logs[0].includes('migrations'));assert(!logs[0].includes('private'));
  await service.runQueueCycle();assert.equal(calls,1,'the two-second timer cannot flood retries');
  now=service.nextQueueAttemptAt;await service.runQueueCycle();assert.equal(calls,2);assert.equal(service.nextQueueAttemptAt-now,8000);
  now=service.nextQueueAttemptAt;service.processQueue=async()=>{calls++;};await service.runQueueCycle();assert.equal(service.queueFailures,0);assert.equal(service.nextQueueAttemptAt,0);assert.equal(ready[0],'Email queue recovered and is ready.');
  service.stopping=true;await service.runQueueCycle();assert.equal(calls,3,'shutdown prevents further polling');
  console.log('PASS: safe schema diagnostics, bounded retry backoff, automatic recovery and shutdown guard. No mail sent.');
 }finally{Date.now=originalNow;}
})().catch(error=>{console.error(error);process.exitCode=1});
