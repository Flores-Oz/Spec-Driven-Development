'use strict';
const crypto=require('node:crypto');
const {openDatabase}=require('./db');
const LOCAL_PASSWORD='DemoYoga#2026';
function hashPassword(pass){const salt=crypto.randomBytes(16).toString('hex');return `${salt}:${crypto.scryptSync(pass,salt,64).toString('hex')}`;}
const demos=[
 ['admin','Andrea Morales','andrea@yogaflow.demo','admin'],
 ['teacher','Camila Ruiz','camila@yogaflow.demo','instructor'],
 ['s01','Ana Pérez','ana@yogaflow.demo','student'],
 ['s02','Sofía López','sofia@yogaflow.demo','student'],
 ['s03','Lucía García','lucia@yogaflow.demo','student'],
 ['s04','Valentina Gómez','valentina@yogaflow.demo','student'],
 ['s05','Elena Castillo','elena@yogaflow.demo','student'],
 ['s06','Isabel Torres','isabel@yogaflow.demo','student'],
 ['s07','Paula Méndez','paula@yogaflow.demo','student'],
 ['s08','Daniela Ríos','daniela@yogaflow.demo','student'],
 ['s09','Andrea Soto','andrea.s@yogaflow.demo','student'],
 ['s10','Mariana Reyes','mariana@yogaflow.demo','student'],
 ['s11','Clara Fuentes','clara@yogaflow.demo','student'],
 ['s12','Gabriela Ortiz','gabriela@yogaflow.demo','student'],
 ['s13','María Herrera','maria@yogaflow.demo','student'],
 ['s14','Teresa Salazar','teresa@yogaflow.demo','student'],
 ['s15','Julia Méndez','julia@yogaflow.demo','student']
];
function nextDayAt(offsetDays,hour){const d=new Date();d.setUTCDate(d.getUTCDate()+offsetDays);d.setUTCHours(hour,0,0,0);return d.toISOString();}
function seed(db,{password=LOCAL_PASSWORD}={}){
 if(typeof password!=='string'||password.length===0)throw Error('La contraseña de demostración debe ser un texto no vacío.');
 if(process.env.NODE_ENV==='production'&&(password===LOCAL_PASSWORD||password.length<16))throw Error('En producción configura DEMO_PASSWORD e inicia con npm run start:production.');
 const total=db.prepare('SELECT COUNT(*) AS n FROM users').get().n;if(total>0)throw Error('La base de datos ya tiene usuarios. Para regenerar use una base vacía.');
 const insert=db.prepare('INSERT INTO users(id,name,email,role,password_hash) VALUES(?,?,?,?,?)');for(const u of demos)insert.run(...u,hashPassword(password));
 const pkg=db.prepare('INSERT INTO student_packages(user_id,total,used) VALUES(?,10,?)');for(const u of demos.filter(x=>x[3]==='student'))pkg.run(u[0],u[0]==='s13'?0:2);
 const cls=db.prepare('INSERT INTO class_sessions(id,name,instructor,start_at,end_at,capacity,status) VALUES(?,?,?,?,?,12,\'scheduled\')');
 cls.run('c1','Yoga suave','Camila Ruiz',nextDayAt(2,14),nextDayAt(2,15));
 cls.run('c2','Vinyasa flow','Valeria León',nextDayAt(3,16),nextDayAt(3,17));
 cls.run('c3','Respira & restaura','Camila Ruiz',nextDayAt(4,14),nextDayAt(4,15));
 cls.run('c4','Movilidad consciente','Valeria León',nextDayAt(5,17),nextDayAt(5,18));
 const t=new Date().toISOString();
 for(let i=1;i<=12;i++){let id=`s${String(i).padStart(2,'0')}`;db.prepare("INSERT INTO reservations(class_id,user_id,status,created_at,updated_at) VALUES('c1',?,'confirmed',?,?)").run(id,t,t);}
 for(const id of ['s14','s15'])db.prepare("INSERT INTO waitlist_entries(class_id,user_id,status,created_at,updated_at) VALUES('c1',?,'active',?,?)").run(id,t,t);
 db.prepare("INSERT INTO reservations(class_id,user_id,status,created_at,updated_at) VALUES('c2','s13','confirmed',?,?)").run(t,t);
 db.prepare("INSERT INTO notifications(user_id,type,message,created_at) VALUES('s13','confirmed','Tu lugar en Vinyasa flow está confirmado. No se descontaron clases.',?)").run(t);
}
if(require.main===module){
 if(process.env.NODE_ENV==='production'){console.error('El seed local está deshabilitado en producción. Usa npm run start:production con DEMO_PASSWORD.');process.exitCode=1;}
 else {const db=openDatabase();try{seed(db);console.log('Datos ficticios de demostración local listos. Consulta el acceso local en README.md.');}finally{db.close();}}
}
module.exports={seed,hashPassword,demos};
