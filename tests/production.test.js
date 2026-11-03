'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createProductionApp}=require('../src/start-production');
const {openDatabase}=require('../src/db');
const {seed}=require('../src/seed');

const runtimePassword='PruebaTemporal!SoloTest2026';
function temporaryDatabase(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'yogaflow-production-'));
 return {directory,file:path.join(directory,'production.sqlite')};
}
async function listen(app){
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 return `http://127.0.0.1:${app.server.address().port}`;
}
async function close(app){
 if(app.server.listening)await new Promise(resolve=>app.server.close(resolve));
 app.db.close();
}
async function login(base,password){
 return fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'maria@yogaflow.demo',password})});
}

test('CA-D01 · producción rechaza rutas relativas y contraseñas incompletas o locales',()=>{
 const tmp=temporaryDatabase();
 try {
  for(const env of [
   {},
   {DB_PATH:'data/production.sqlite',DEMO_PASSWORD:runtimePassword},
   {DB_PATH:':memory:',DEMO_PASSWORD:runtimePassword},
   {DB_PATH:tmp.file},
   {DB_PATH:tmp.file,DEMO_PASSWORD:'corta'},
   {DB_PATH:tmp.file,DEMO_PASSWORD:'DemoYoga#2026'},
   {DB_PATH:tmp.file,DEMO_PASSWORD:'    DemoYoga#2026    '},
   {DB_PATH:tmp.file,DEMO_PASSWORD:'                '}
  ])assert.throws(()=>createProductionApp({env}),/DB_PATH|DEMO_PASSWORD/);
  assert.equal(fs.existsSync(tmp.file),false);
 } finally {fs.rmSync(tmp.directory,{recursive:true,force:true});}
});

test('CA-D01 · contraseña runtime funciona, acceso local falla y cookie es segura',async()=>{
 const tmp=temporaryDatabase();
 const env={DB_PATH:tmp.file,DEMO_PASSWORD:runtimePassword};
 const app=createProductionApp({env});
 try {
  assert.equal(app.server.listening,false);
  assert.equal(env.NODE_ENV,'production');
  assert.equal(env.COOKIE_SECURE,'true');
  const base=await listen(app);
  const rejected=await login(base,'DemoYoga#2026');
  assert.equal(rejected.status,401);
  assert.equal((await rejected.json()).code,'INVALID_CREDENTIALS');
  const accepted=await login(base,runtimePassword);
  assert.equal(accepted.status,200);
  assert.equal((await accepted.json()).user.id,'s13');
  const cookie=accepted.headers.get('set-cookie');
  assert.match(cookie,/; Secure(?:;|$)/);
  assert.match(cookie,/; HttpOnly(?:;|$)/);
  assert.match(cookie,/; SameSite=Lax(?:;|$)/);
  const configuration=await fetch(base+'/config.js');
  assert.equal(configuration.status,200);
  assert.match(await configuration.text(),/"demoAccounts":false/);
  assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM users WHERE email NOT LIKE '%@yogaflow.demo'").get().n,0);
 } finally {await close(app);fs.rmSync(tmp.directory,{recursive:true,force:true});}
});

test('CA-D01 · rechaza una base local existente sin cambiar contraseñas ni reservas',()=>{
 const tmp=temporaryDatabase();
 let db=openDatabase(tmp.file);
 try {
  seed(db);
  const oldHash=db.prepare("SELECT password_hash FROM users WHERE id='s13'").get().password_hash;
  const oldReservations=db.prepare('SELECT * FROM reservations ORDER BY id').all();
  const oldUsers=db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const oldNotifications=db.prepare('SELECT * FROM notifications ORDER BY id').all();
  db.close();
  db=undefined;
  assert.throws(()=>createProductionApp({env:{DB_PATH:tmp.file,DEMO_PASSWORD:runtimePassword}}),/credenciales de demostración local/);
  db=openDatabase(tmp.file);
  assert.equal(db.prepare("SELECT password_hash FROM users WHERE id='s13'").get().password_hash,oldHash);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n,oldUsers);
  assert.deepEqual(db.prepare('SELECT * FROM reservations ORDER BY id').all(),oldReservations);
  assert.deepEqual(db.prepare('SELECT * FROM notifications ORDER BY id').all(),oldNotifications);
 } finally {if(db)db.close();fs.rmSync(tmp.directory,{recursive:true,force:true});}
});

test('CA-D01 · reiniciar conserva contraseña, sesión, reservas y notificaciones',async()=>{
 const tmp=temporaryDatabase();
 let app;
 try {
  app=createProductionApp({env:{DB_PATH:tmp.file,DEMO_PASSWORD:runtimePassword}});
  let base=await listen(app);
  const authenticated=await login(base,runtimePassword);
  const credentials=await authenticated.json();
  const cookie=authenticated.headers.get('set-cookie').split(';')[0];
  const reserved=await fetch(base+'/api/classes/c3/reserve',{
   method:'POST',headers:{'content-type':'application/json',cookie,'x-csrf-token':credentials.csrfToken},body:'{}'
  });
  assert.equal(reserved.status,200);
  assert.equal((await reserved.json()).status,'confirmed');
  const oldHash=app.db.prepare("SELECT password_hash FROM users WHERE id='s13'").get().password_hash;
  await close(app);
  app=undefined;
  app=createProductionApp({env:{DB_PATH:tmp.file,DEMO_PASSWORD:'OtraConfiguracion!SoloTest2026'}});
  assert.equal(app.db.prepare("SELECT password_hash FROM users WHERE id='s13'").get().password_hash,oldHash);
  assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM reservations WHERE class_id='c3' AND user_id='s13' AND status='confirmed'").get().n,1);
  assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id='s13' AND type='confirmed'").get().n,2);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,17);
  base=await listen(app);
  const me=await fetch(base+'/api/me',{headers:{cookie}});
  assert.equal(me.status,200);
  assert.equal((await me.json()).user.id,'s13');
  const original=await login(base,runtimePassword);
  assert.equal(original.status,200);
  await original.json();
  const replacement=await login(base,'OtraConfiguracion!SoloTest2026');
  assert.equal(replacement.status,401);
  await replacement.json();
 } finally {if(app)await close(app);fs.rmSync(tmp.directory,{recursive:true,force:true});}
});

test('CA-D01 · seed de consola se bloquea en producción sin crear archivos ni imprimir contraseñas',()=>{
 const tmp=temporaryDatabase();
 try {
  const result=spawnSync(process.execPath,[path.join(__dirname,'../src/seed.js')],{
   env:{...process.env,NODE_ENV:'production',DB_PATH:tmp.file,DEMO_PASSWORD:runtimePassword},encoding:'utf8'
  });
  assert.equal(result.status,1);
  assert.match(result.stderr,/seed local está deshabilitado/);
  assert.equal(result.stdout.includes(runtimePassword),false);
  assert.equal(result.stderr.includes(runtimePassword),false);
  assert.equal(result.stdout.includes('DemoYoga#2026'),false);
  assert.equal(fs.existsSync(tmp.file),false);
 } finally {fs.rmSync(tmp.directory,{recursive:true,force:true});}
});
