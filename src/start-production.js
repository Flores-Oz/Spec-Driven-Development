'use strict';
const path=require('node:path');
const crypto=require('node:crypto');
const {openDatabase,tx}=require('./db');
const {seed}=require('./seed');
const {createApp}=require('./server');

function validateProduction(env){
 if(typeof env.DB_PATH!=='string'||!path.isAbsolute(env.DB_PATH))throw Error('DB_PATH debe ser una ruta absoluta en un disco persistente.');
 if(typeof env.DEMO_PASSWORD!=='string'||env.DEMO_PASSWORD.trim().length<16||env.DEMO_PASSWORD.trim()==='DemoYoga#2026')throw Error('DEMO_PASSWORD debe tener al menos 16 caracteres y ser distinta de la contraseña local.');
}

function usesLocalPassword(hash){
 const [salt,digest]=hash.split(':');
 if(!salt||!digest)return false;
 const stored=Buffer.from(digest,'hex');
 const local=crypto.scryptSync('DemoYoga#2026',salt,64);
 return stored.length===local.length&&crypto.timingSafeEqual(stored,local);
}

// Crear la aplicación no abre puertos. La contraseña se usa solo en una base nueva.
function createProductionApp({env=process.env}={}){
 validateProduction(env);
 env.NODE_ENV='production';
 env.COOKIE_SECURE='true';
 const db=openDatabase(env.DB_PATH);
 try {
  if(db.prepare('SELECT COUNT(*) AS n FROM users').get().n===0){
   tx(db,()=>seed(db,{password:env.DEMO_PASSWORD}));
  }
  if(db.prepare('SELECT password_hash FROM users').all().some(user=>usesLocalPassword(user.password_hash))){
   throw Error('La base contiene credenciales de demostración local y no puede publicarse. Usa una base vacía en el disco de producción; los datos existentes se conservaron.');
  }
  return createApp({db,autoSeed:false,demoAccounts:false,secureCookies:true});
 } catch(error){db.close();throw error;}
}

function startProduction({env=process.env}={}){
 const port=Number(env.PORT||3000);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT debe ser un puerto entre 1 y 65535.');
 const app=createProductionApp({env});
 app.server.once('error',()=>{app.db.close();console.error('No se pudo abrir el puerto del servidor de producción.');process.exitCode=1;});
 app.server.listen(port,'0.0.0.0',()=>console.log(`YogaFlow en producción · puerto ${port}`));
 const shutdown=()=>app.server.close(()=>app.db.close());
 process.once('SIGTERM',shutdown);
 process.once('SIGINT',shutdown);
 return app;
}

if(require.main===module){
 try{startProduction();}
 catch(error){console.error(`No se pudo iniciar YogaFlow: ${error.message}`);process.exitCode=1;}
}

module.exports={createProductionApp,startProduction};
