'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {openDatabase}=require('./db');
const {seed}=require('./seed');
const booking=require('./booking');
const PUBLIC=path.join(__dirname,'..','public');
function equalHex(x,y){if(!x||!y)return false;const a=Buffer.from(x,'utf8'),b=Buffer.from(y,'utf8');return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function verifyPassword(password,hash){const [salt,digest]=hash.split(':');const actual=crypto.scryptSync(password,salt,64).toString('hex');return equalHex(actual,digest);}
function readJson(req){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>12000){reject(new booking.AppError(413,'TOO_LARGE','Solicitud demasiado grande.'));req.destroy();}});req.on('end',()=>{try{resolve(data?JSON.parse(data):{});}catch{reject(new booking.AppError(400,'BAD_JSON','JSON inválido.'));}});req.on('error',reject);});}
function json(res,code,data,extra={}){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra});res.end(JSON.stringify(data));}
function cookie(req,name){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);}
function auth(db,req){const raw=cookie(req,'yf_session');if(!raw)return null;const tokenHash=crypto.createHash('sha256').update(raw).digest('hex');const rec=db.prepare('SELECT s.csrf_token, s.expires_at, u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').get(tokenHash);return rec&&rec.expires_at>new Date().toISOString()?rec:null;}
function requireAuth(user){if(!user)throw new booking.AppError(401,'UNAUTHENTICATED','Inicia sesión para continuar.');}
function csrf(req,user){requireAuth(user);if(!equalHex(req.headers['x-csrf-token'],user.csrf_token))throw new booking.AppError(403,'CSRF','Sesión de formulario no válida.');}
function handleStatic(req,res,pathName){const files={'/':'index.html','/index.html':'index.html','/app.css':'app.css','/app.js':'app.js','/agenda.js':'agenda.js'};const filename=files[pathName];if(!filename)return false;const ext=path.extname(filename);const contentType=ext==='.css'?'text/css; charset=utf-8':ext==='.js'?'application/javascript; charset=utf-8':'text/html; charset=utf-8';res.writeHead(200,{'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});fs.createReadStream(path.join(PUBLIC,filename)).pipe(res);return true;}
function createApp({db=openDatabase(),autoSeed=false,demoAccounts=process.env.NODE_ENV!=='production',secureCookies=process.env.COOKIE_SECURE==='true'}={}){
 if(autoSeed&&!demoAccounts)throw Error('El seed local está deshabilitado en producción. Usa npm run start:production.');
 if(autoSeed&&db.prepare('SELECT COUNT(*) AS n FROM users').get().n===0)seed(db);
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
   if(req.method==='GET'&&pathname==='/healthz'){db.prepare('SELECT 1').get();return json(res,200,{status:'ok'});}
   if(req.method==='GET'&&pathname==='/config.js'){
    res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
    return res.end(`globalThis.YOGAFLOW_CONFIG=${JSON.stringify({demoAccounts})};`);
   }
   if(req.method==='GET'&&handleStatic(req,res,pathname))return;
   const user=auth(db,req);
   if(req.method==='POST'&&pathname==='/api/login'){
    const payload=await readJson(req);if(typeof payload.email!=='string'||typeof payload.password!=='string')throw new booking.AppError(400,'INVALID_INPUT','Completa correo y contraseña.');
    const person=db.prepare('SELECT * FROM users WHERE email=?').get(payload.email.trim().toLowerCase());
    if(!person||!verifyPassword(payload.password,person.password_hash))throw new booking.AppError(401,'INVALID_CREDENTIALS','Correo o contraseña incorrectos.');
    const token=crypto.randomBytes(32).toString('hex'),csrfToken=crypto.randomBytes(24).toString('hex');
    db.prepare('INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'),person.id,csrfToken,new Date(Date.now()+24*3600*1000).toISOString());
    const secure=secureCookies?'; Secure':'';
    return json(res,200,{user:{id:person.id,name:person.name,role:person.role,email:person.email},csrfToken},{'set-cookie':`yf_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secure}`});
   }
   if(req.method==='POST'&&pathname==='/api/logout'){
    csrf(req,user);const raw=cookie(req,'yf_session');db.prepare('DELETE FROM sessions WHERE token_hash=?').run(crypto.createHash('sha256').update(raw).digest('hex'));return json(res,200,{ok:true},{'set-cookie':'yf_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
   }
   if(req.method==='GET'&&pathname==='/api/me'){
    requireAuth(user);return json(res,200,{user:{id:user.id,name:user.name,email:user.email,role:user.role},credits:user.role==='student'?booking.credits(db,user.id):null,csrfToken:user.csrf_token});
   }
   if(req.method==='GET'&&pathname==='/api/classes'){
    requireAuth(user);return json(res,200,{classes:booking.listClasses(db,user)});
   }
   if(req.method==='GET'&&pathname==='/api/notifications'){
    requireAuth(user);return json(res,200,{notifications:db.prepare('SELECT id,type,message,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 40').all(user.id)});
   }
   const matched=pathname.match(/^\/api\/classes\/(c[\w-]+)(?:\/(reserve|cancel))?$/);
   if(matched){requireAuth(user);const id=matched[1],action=matched[2];
    if(req.method==='GET'&&!action)return json(res,200,{class:booking.getClassDetail(db,user,id)});
    if(req.method==='POST'&&action==='reserve'){csrf(req,user);return json(res,200,booking.reserve(db,user,id));}
    if(req.method==='POST'&&action==='cancel'){csrf(req,user);const payload=await readJson(req);if(payload.userId!==undefined&&typeof payload.userId!=='string')throw new booking.AppError(400,'INVALID_INPUT','Identificador incorrecto.');return json(res,200,booking.cancel(db,user,id,payload.userId));}
   }
   json(res,404,{error:'Ruta no encontrada.',code:'NOT_FOUND'});
  }catch(err){const code=err.status||500;if(code===500)console.error('[YogaFlow]',err);json(res,code,{error:code===500?'Error interno.':err.message,code:err.code||'SERVER_ERROR'});}
 });
 return {server,db};
}
if(require.main===module){if(process.env.NODE_ENV==='production'){console.error('Usa npm run start:production para iniciar con configuración de producción.');process.exitCode=1;}else{const {server}=createApp({autoSeed:true});const port=Number(process.env.PORT||3000);server.listen(port,'0.0.0.0',()=>console.log(`YogaFlow → http://localhost:${port}`));}}
module.exports={createApp};
