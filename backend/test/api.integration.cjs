const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const WebSocket = require('ws');
(async () => {
 const mongo = await MongoMemoryServer.create();
 const root=require('node:path').resolve(__dirname, '../..');
 const mongoose = require(root+'/node_modules/mongoose');
 const secret=crypto.randomBytes(48).toString('hex');
 const server=spawn(process.execPath,['backend/dist/index.js'],{cwd:root,env:{...process.env,MONGODB_URI:mongo.getUri('tanzmatch_isolated_test'),JWT_SECRET:secret,NODE_ENV:'test',REFRESH_COOKIE_SAMESITE:'none',ENABLE_DEMO_SEED:'false',PORT:'5127'},stdio:['ignore','ignore','ignore']});
 let checks=0;const base='http://127.0.0.1:5127/api';
 async function request(path,body,token,method=body?'POST':'GET') { const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}); const data=await response.json();return {status:response.status,data,cookie:response.headers.get('set-cookie')}; }
 function ok(value,label){assert.ok(value,label);checks++;console.log('PASS',label);}
 try {
  for(let i=0;i<100;i++){try{if((await request('/health')).status===200)break;}catch{} await new Promise(r=>setTimeout(r,100));}
  const password='TestDance123!';
  const a=await request('/auth/register',{email:'a@example.invalid',password,firstName:'Test',lastName:'Alpha',zipCode:'60311',isGuest:true,emailVerifiedAt:new Date().toISOString()});
  const b=await request('/auth/register',{email:'b@example.invalid',password,firstName:'Test',lastName:'Beta',zipCode:'60311'});
  ok(a.status===201&&b.status===201,'isolated registration');
  ok(a.data.verificationRequired&&!a.data.token&&!a.data.user,'registration does not issue a session');
  ok((await request('/auth/login',{email:'a@example.invalid',password})).status===403,'unverified login rejected');
  ok((await request('/auth/register',{email:'guest-forged@tanzmatch.local',password,firstName:'Test',lastName:'Spoof',zipCode:'60311',isGuest:true})).status===400,'reserved guest domain cannot be registered');
  await mongoose.connect(mongo.getUri('tanzmatch_isolated_test'));
  const users=mongoose.connection.collection('users');
  const ua=await users.findOne({email:'a@example.invalid'}),ub=await users.findOne({email:'b@example.invalid'});
  const aid=ua._id.toString(),bid=ub._id.toString();
  const legacy=require(root+'/node_modules/jsonwebtoken').sign({sub:aid,email:ua.email,version:'',tokenUse:'access'},secret,{expiresIn:'5m'});
  ok((await request('/profile',null,legacy)).status===403,'old access token cannot bypass confirmation');
  await new Promise((resolve,reject)=>{
    const ws=new WebSocket('ws://127.0.0.1:5127/ws/chat?token='+legacy);
    const timer=setTimeout(()=>{ws.terminate();reject(new Error('Unverified WS timeout'));},4000);
    ws.on('open',()=>{clearTimeout(timer);ws.terminate();reject(new Error('Unverified WebSocket opened'));});
    ws.on('error',()=>{clearTimeout(timer);resolve();});
  });
  ok(true,'unverified WebSocket rejected');
  const oldRefresh=require(root+'/node_modules/jsonwebtoken').sign({sub:aid,email:ua.email,tokenUse:'refresh'},secret,{expiresIn:'5m'});
  await users.updateOne({_id:ua._id},{$set:{refreshToken:crypto.createHash('sha256').update(oldRefresh).digest('hex'),refreshTokenExpiresAt:new Date(Date.now()+60000)}});
  const refreshAttempt=await fetch(base+'/auth/refresh',{method:'POST',headers:{Cookie:'refreshToken='+oldRefresh,Origin:'http://localhost:5173'}});
  ok(refreshAttempt.status===403,'unverified refresh rejected');
  const guest=await request('/auth/guest',{});
  ok(guest.status===201||guest.status===200,'server-created guest access preserved');
  const gt=guest.data.token;
  ok((await request('/profiles/'+aid,null,gt)).status===404,'unverified target profile hidden');
  ok((await request('/matches',{userId:aid,type:'like'},gt)).status===404,'direct match against unverified target rejected');
  const pending=await request('/profiles',null,gt);ok(!pending.data.data.some(p=>p.id===aid),'unverified profiles excluded from discovery');
  ok((await request('/auth/verify-email',{token:{$ne:null}})).status===400,'verification rejects object token');
  for(const user of [ua,ub]){
    const verification=crypto.randomBytes(32).toString('hex');
    await users.updateOne({_id:user._id},{$set:{emailVerificationToken:crypto.createHash('sha256').update(verification).digest('hex'),emailVerificationExpiresAt:new Date(Date.now()-1000)}});
    if(user===ua)ok((await request('/auth/verify-email',{token:verification})).status===400,'expired confirmation rejected');
    await users.updateOne({_id:user._id},{$set:{emailVerificationExpiresAt:new Date(Date.now()+60000)}});
    ok((await request('/auth/verify-email',{token:verification})).status===200,'confirmation activates account');
    if(user===ua)ok((await request('/auth/verify-email',{token:verification})).status===400,'confirmation token is single use');
  }
  const loginA=await request('/auth/login',{email:'a@example.invalid',password}),loginB=await request('/auth/login',{email:'b@example.invalid',password});
  ok(loginA.status===200&&loginB.status===200,'verified users can sign in');
  ok(loginA.cookie.includes('Partitioned')&&loginA.cookie.includes('Secure')&&loginA.cookie.includes('HttpOnly'),'cross-site session cookie is secure and partitioned');
  const ta=loginA.data.token,tb=loginB.data.token;
  ok((await request('/auth/login',{email:'a@example.invalid',password:'wrong'})).status===401,'incorrect password rejected');
  const profile=await request('/profiles/'+bid,null,ta);
  ok(!('email'in profile.data)&&!('lastName'in profile.data),'public profile excludes private fields');
  const dating=await request('/profile',{hobbies:['Hiking','Music'],datingGoals:['relationship']},ta,'PUT');
  ok(dating.data.hobbies?.includes('Hiking')&&dating.data.datingGoals?.includes('relationship'),'dating fields persisted');
  const publicDating=await request('/profiles/'+aid,null,tb);
  ok(publicDating.data.hobbies?.includes('Music'),'public profile exposes hobbies');
  ok((await request('/profile',{hobbies:[123]},ta,'PUT')).status===400,'invalid hobbies rejected');
  await request('/matches',{userId:bid,type:'like'},ta);
  await request('/matches',{userId:aid,type:'like'},tb);
  const matches=await request('/matches',null,ta);ok(matches.data.data.length===1,'mutual match appears once');
  const otherMatches=await request('/matches',null,tb);
  ok(otherMatches.data.data.length===1&&otherMatches.data.data[0].id===matches.data.data[0].id,'both participants receive the same conversation');
  const matchId=matches.data.data[0].id;
  ok((await request('/messages',{matchId,text:'Integration message'},ta)).status===201,'message persisted');
  const aliases=await mongoose.connection.collection('matches').find({actorUserId:{$in:[aid,bid]}}).sort({_id:-1}).toArray();
  const oldMatchId=aliases[1]._id.toString();
  await mongoose.connection.collection('messages').insertOne({matchId:oldMatchId,senderId:aid,text:'Existing message on old conversation ID',read:false,deletedFor:[],createdAt:new Date(),updatedAt:new Date()});
  const history=await request('/messages/'+matchId,null,tb);
  ok(history.data.data.some(message=>message.text==='Existing message on old conversation ID'),'old conversation history remains accessible');
  const aliasSocket=new WebSocket('ws://127.0.0.1:5127/ws/chat?token='+tb);
  await new Promise((resolve,reject)=>{aliasSocket.on('open',()=>aliasSocket.send(JSON.stringify({type:'join',matchId:oldMatchId})));aliasSocket.once('message',resolve);aliasSocket.once('error',reject);});
  const received=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Live message timeout')),4000);aliasSocket.once('message',data=>{clearTimeout(timeout);resolve(JSON.parse(data));});});
  await request('/messages',{matchId,text:'Live message across alias'},ta);
  ok((await received).type==='messages:new','legacy and canonical chat IDs share live messages');
  aliasSocket.close();
  for (const path of ['/ws/chat', '/ws/calls']) {
    await new Promise((resolve,reject) => {
      const socket = new WebSocket('ws://127.0.0.1:5127'+path+'?token='+ta);
      const timer=setTimeout(()=>{socket.terminate();reject(new Error('WebSocket timeout'));},4000);
      socket.on('open',()=>socket.send(JSON.stringify({type:'join',matchId})));
      socket.on('message',()=>{clearTimeout(timer);socket.close();resolve();});
      socket.on('error',reject);
    });
    ok(true, 'authorized WebSocket '+path);
  }
  const notices=await request('/notifications',null,tb);ok(notices.data.data.some(x=>x.type==='message'),'unread message notification');
  ok(notices.data.data.filter(item=>item.type==='match').length===1,'match notification is not duplicated');
  await request('/messages/'+oldMatchId+'/read',{},tb);
  ok((await request('/notifications',null,tb)).data.unreadMessages===0,'reading either conversation ID marks all history read');
  await request('/messages',{matchId,text:'Preference check message'},ta);
  const pref=await request('/profile',{notificationPreferences:{messages:false}},tb,'PUT');ok(pref.data.notificationPreferences.messages===false,'notification preferences persisted');
  ok(!(await request('/notifications',null,tb)).data.data.some(x=>x.type==='message'),'disabled notification category respected');
  await request('/blocks/'+bid,{},ta);
  ok((await request('/messages/'+matchId,null,tb)).status===403,'blocked chat access rejected');
  const reset=crypto.randomBytes(32).toString('hex');
  await mongoose.connection.collection('users').updateOne({_id:new mongoose.Types.ObjectId(aid)},{$set:{passwordResetToken:crypto.createHash('sha256').update(reset).digest('hex'),passwordResetExpiresAt:new Date(Date.now()+60000)}});
  ok((await request('/auth/reset-password',{token:reset,password:'NewDance456!'})).status===200,'reset consumes valid token');
  ok((await request('/auth/reset-password',{token:reset,password:'OtherDance789!'})).status===400,'reset token cannot be reused');
  ok((await request('/profile',null,ta)).status===401,'password reset revokes existing access token');
  ok((await request('/auth/login',{email:'a@example.invalid',password:'NewDance456!'})).status===200,'new password works');
  ok((await request('/auth/login',{email:'a@example.invalid',password})).status===401,'old password rejected');
  ok((await request('/notifications')).status===401,'notifications require authentication');
  console.log(`${checks} integration checks passed`);
 } finally {await mongoose.disconnect();server.kill('SIGTERM');await mongo.stop();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
