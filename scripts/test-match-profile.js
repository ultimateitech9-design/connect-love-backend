// Isolated local fixture tables; never changes real member profiles or matches.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DataSource } = require('typeorm');
require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const { User } = require('../dist/users/user.entity');
const { MatchRelation, MatchStatus } = require('../dist/matches/match.entity');
const { MatchesService } = require('../dist/matches/matches.service');
const { entitlementsFor } = require('../dist/plans/plan-entitlements');
if (process.env.NODE_ENV==='production' || !['localhost','127.0.0.1'].includes(process.env.DB_HOST||'localhost')) throw new Error('Local database only.');
const prefix=`test_mp_${randomUUID().replaceAll('-','').slice(0,12)}_`;
const db=new DataSource({type:'mysql',host:process.env.DB_HOST,port:Number(process.env.DB_PORT),username:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,entityPrefix:prefix,entities:[User,MatchRelation],synchronize:false});
async function run(){
  await db.initialize();
  const schema=await db.driver.createSchemaBuilder().log();
  for(const query of schema.upQueries){
    if(!query.query.startsWith('CREATE TABLE `'+prefix) && !query.query.startsWith('ALTER TABLE `'+prefix)) throw new Error('Unexpected test schema operation.');
    await db.query(query.query,query.parameters);
  }
  const users=db.getRepository(User), matches=db.getRepository(MatchRelation);
  const fixture=(name,extra={})=>({id:randomUUID(),name,email:`${randomUUID()}@example.test`,password:'unused',gender:'female',role:'user',status:'active',...extra});
  const viewer=fixture('Viewer'), outsider=fixture('Outsider'), male=fixture('Free man',{gender:'male'});
  const peer=fixture('Detailed member',{photos:['/one.jpg','/two.jpg','/three.jpg'],city:'Jaipur',profession:'Designer',bio:'Hello',phone:'private',locationLatitude:26.9,locationLongitude:75.8,showOnlineStatus:false,showDistance:false,isOnline:true,interests:['Music'],personalityWords:['Kind'],relationshipGoal:'Long term',zodiac:'Aries'});
  const p2=fixture('Peer two'),p3=fixture('Peer three');
  await users.insert([viewer,outsider,male,peer,p2,p3].map(u=>({...u})));
  const relation=(sender,receiver,status,extra={})=>({id:randomUUID(),senderId:sender.id,receiverId:receiver.id,status,...extra});
  const active=relation(viewer,peer,MatchStatus.MATCHED);
  await matches.insert({...active});
  const service=new MatchesService(matches,{},users,{get:async id=>({limits:entitlementsFor(await users.findOneBy({id}))})});
  let result=await service.profileForMatch(active.id,viewer.id);
  assert.equal(result.relationship,'matched');assert.equal(result.profile.photos.length,3);
  assert.equal(result.profile.city,'Jaipur');assert.equal(result.profile.relationshipGoal,'Long term');
  assert.equal(result.profile.isOnline,false);assert.equal(result.profile.showOnlineStatus,false);assert.equal(result.profile.distanceKm,null);
  for(const privateField of ['email','phone','password','birthDate','locationLatitude','locationLongitude','kycLivePhoto','coinBalance']) assert(!(privateField in result.profile),privateField+' must stay private');
  await assert.rejects(service.profileForMatch(active.id,outsider.id),/not found/);
  const pending=relation(viewer,p2,MatchStatus.PENDING,{isSuperLike:true});await matches.insert({...pending});
  assert.equal((await service.profileForMatch(pending.id,viewer.id)).relationship,'pending');
  const received=await service.profileForMatch(pending.id,p2.id);assert.equal(received.relationship,'received');assert.equal(received.isSuperLike,true);
  const events=[];service.matchEvents.on('changed',event=>events.push(event));
  await assert.rejects(service.respond(pending.id,'accept',outsider.id),/Only the receiver/);
  await service.respond(pending.id,'accept',p2.id);
  assert.equal(events.length,1);assert.equal(events[0].newlyMatched,true,'acceptance announces a new match for both participants');
  await service.respond(pending.id,'accept',p2.id);assert.equal(events.length,1,'repeated acceptance is idempotent');
  assert((await service.celebrationSnapshot(viewer.id)).ids.includes(pending.id));
  await matches.update({id:pending.id},{status:MatchStatus.MATCHED});
  assert.equal((await service.profileForMatch(pending.id,viewer.id)).relationship,'matched','status comes from current relationship');
  await matches.update({id:active.id},{status:MatchStatus.BLOCKED,blockedByUserId:viewer.id,statusBeforeBlock:MatchStatus.MATCHED});
  result=await service.profileForMatch(active.id,viewer.id);assert.equal(result.relationship,'blocked');assert.equal(result.profile.showOnlineStatus,false);
  await assert.rejects(service.respond(active.id,'accept',peer.id),/no longer pending/);
  await assert.rejects(service.profileForMatch(active.id,peer.id),/unavailable/);
  await matches.update({id:pending.id},{status:MatchStatus.DECLINED});
  await assert.rejects(service.profileForMatch(pending.id,viewer.id),/no longer/);
  const privacy=relation(viewer,p3,MatchStatus.PENDING);await matches.insert({...privacy});
  await users.update({id:p3.id},{photos:['/private.jpg'],photosVisibleToNonMatches:false});
  result=await service.profileForMatch(privacy.id,viewer.id);assert.equal(result.profile.photosHidden,true);assert.deepEqual(result.profile.photos,[]);
  await matches.update({id:privacy.id},{status:MatchStatus.MATCHED});
  assert.equal((await service.profileForMatch(privacy.id,viewer.id)).profile.photos.length,1);
  const maleMatches=[peer,p2,p3].map((user,i)=>relation(male,user,MatchStatus.MATCHED,{updatedAt:new Date(Date.now()+i*10000)}));
  await matches.insert(maleMatches.map(m=>({...m})));
  assert.equal((await service.profileForMatch(maleMatches[0].id,male.id)).relationship,'matched');
  await assert.rejects(service.profileForMatch(maleMatches[2].id,male.id),/Activate a plan/);
  const lockedIncoming=relation(outsider,male,MatchStatus.PENDING);await matches.insert({...lockedIncoming});
  await assert.rejects(service.profileForMatch(lockedIncoming.id,male.id),/Activate a plan/);
  await users.update({id:peer.id},{status:'deactivated'});
  await assert.rejects(service.profileForMatch(active.id,viewer.id),/no longer available/);
  console.log('PASS: all relationship statuses, full photo gallery, public details only, ownership, block direction, current status, plan locks, photo/presence/distance privacy and unavailable accounts.');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  if(!db.isInitialized)return;
  for(const suffix of ['matches','users']){const table=prefix+suffix;if(!/^test_mp_[a-f0-9]{12}_(matches|users)$/.test(table))throw new Error('Unsafe cleanup path.');await db.query(`DROP TABLE IF EXISTS \`${table}\``);}
  await db.destroy();
});
