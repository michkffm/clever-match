const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const WebSocket = require('ws');
(async () => {
 const mongo = await MongoMemoryServer.create();
 const root=require('node:path').resolve(__dirname, '../..');
 const mongoose = require(root+'/node_modules/mongoose');
 const server=spawn(process.execPath,['backend/dist/index.js'],{cwd:root,env:{...process.env,MONGODB_URI:mongo.getUri('tanzmatch_isolated_test'),JWT_SECRET:crypto.randomBytes(48).toString('hex'),NODE_ENV:'test',ENABLE_DEMO_SEED:'false',PORT:'5127'},stdio:['ignore','ignore','ignore']});
 let checks=0;const base='http://127.0.0.1:5127/api';
 async function request(path,body,token,method=body?'POST':'GET') { const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}); const data=await response.json();return {status:response.status,data}; }
 function ok(value,label){assert.ok(value,label);checks++;console.log('PASS',label);}
 try {
  for(let i=0;i<100;i++){try{if((await request('/health')).status===200)break;}catch{} await new Promise(r=>setTimeout(r,100));}
  const password='TestDance123!';
  const a=await request('/auth/register',{email:'a@example.invalid',password,firstName:'Test',lastName:'Alpha',zipCode:'60311'});
  const b=await request('/auth/register',{email:'b@example.invalid',password,firstName:'Test',lastName:'Beta',zipCode:'60311'});
  ok(a.status===201&&b.status===201,'isolated registration');
  const ta=a.data.token,tb=b.data.token,aid=a.data.user.id,bid=b.data.user.id;
  ok((await request('/auth/login',{email:'a@example.invalid',password:'wrong'})).status===401,'incorrect password rejected');
  const profile=await request('/profiles/'+bid,null,ta);
  ok(!('email'in profile.data)&&!('lastName'in profile.data),'public profile excludes private fields');
  await request('/matches',{userId:bid,type:'like'},ta);
  await request('/matches',{userId:aid,type:'like'},tb);
  const matches=await request('/matches',null,ta);ok(matches.data.data.length>0,'mutual match');
  const matchId=matches.data.data[0].id;
  ok((await request('/messages',{matchId,text:'Integration message'},ta)).status===201,'message persisted');
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
  const pref=await request('/profile',{notificationPreferences:{messages:false}},tb,'PUT');ok(pref.data.notificationPreferences.messages===false,'notification preferences persisted');
  ok(!(await request('/notifications',null,tb)).data.data.some(x=>x.type==='message'),'disabled notification category respected');
  await request('/blocks/'+bid,{},ta);
  ok((await request('/messages/'+matchId,null,tb)).status===403,'blocked chat access rejected');
  await mongoose.connect(mongo.getUri('tanzmatch_isolated_test'));
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
