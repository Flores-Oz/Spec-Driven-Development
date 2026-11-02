'use strict';
const {tx} = require('./db');
const now = () => new Date().toISOString();
class AppError extends Error {constructor(status, code, message){super(message);this.status=status;this.code=code;}}
const fail=(status,code,message)=>{throw new AppError(status,code,message)};
function countConfirmed(db,classId){return db.prepare("SELECT COUNT(*) AS total FROM reservations WHERE class_id=? AND status='confirmed'").get(classId).total;}
function packageRemaining(db,userId){return db.prepare('SELECT COALESCE(SUM(total-used),0) AS n FROM student_packages WHERE user_id=?').get(userId).n;}
function committed(db,userId){return db.prepare(`SELECT COUNT(*) AS n FROM reservations r JOIN class_sessions c ON c.id=r.class_id WHERE r.user_id=? AND r.status='confirmed' AND c.status='scheduled' AND c.start_at > ?`).get(userId,now()).n;}
function credits(db,userId){const remaining=packageRemaining(db,userId);const held=committed(db,userId);return {remaining,committed:held,available:Math.max(0,remaining-held)};}
function session(db,id){const c=db.prepare('SELECT * FROM class_sessions WHERE id=?').get(id);if(!c)fail(404,'NOT_FOUND','No se encontró la clase.');return c;}
function requireUpcoming(c){if(c.status!=='scheduled'||c.start_at<=now())fail(422,'NOT_BOOKABLE','Esta sesión ya no admite reservas.');}
function notify(db,userId,type,message){db.prepare('INSERT INTO notifications(user_id,type,message,created_at) VALUES(?,?,?,?)').run(userId,type,message,now());}
function audit(db,actorId,userId,classId,action,detail){db.prepare('INSERT INTO audit_events(actor_id,user_id,class_id,action,detail,created_at) VALUES(?,?,?,?,?,?)').run(actorId,userId,classId,action,detail,now());}
function assertStudent(db,userId){const u=db.prepare('SELECT id,role FROM users WHERE id=?').get(userId);if(!u||u.role!=='student')fail(404,'STUDENT_NOT_FOUND','Alumna no encontrada.');}
function waitPosition(db,classId,entryId){return db.prepare("SELECT COUNT(*) AS position FROM waitlist_entries WHERE class_id=? AND status='active' AND id<=?").get(classId,entryId).position;}
function confirm(db,classId,userId){const t=now();const existing=db.prepare('SELECT * FROM reservations WHERE class_id=? AND user_id=?').get(classId,userId);if(existing){if(existing.status==='confirmed')fail(409,'ALREADY_BOOKED','Ya tienes una reserva confirmada.');db.prepare("UPDATE reservations SET status='confirmed',updated_at=? WHERE id=?").run(t,existing.id);return existing.id;}
  return db.prepare("INSERT INTO reservations(class_id,user_id,status,created_at,updated_at) VALUES(?,?,'confirmed',?,?)").run(classId,userId,t,t).lastInsertRowid;}
function promote(db,classId,actorId){const c=session(db,classId);const promoted=[];
 while(countConfirmed(db,classId)<c.capacity){
   const first=db.prepare("SELECT * FROM waitlist_entries WHERE class_id=? AND status='active' ORDER BY id ASC LIMIT 1").get(classId);
   if(!first)break;
   if(credits(db,first.user_id).available<=0){db.prepare("UPDATE waitlist_entries SET status='skipped',updated_at=? WHERE id=?").run(now(),first.id);audit(db,actorId,first.user_id,classId,'waitlist_skipped','Sin créditos disponibles al promover');continue;}
   confirm(db,classId,first.user_id);
   db.prepare("UPDATE waitlist_entries SET status='promoted',updated_at=? WHERE id=?").run(now(),first.id);
   notify(db,first.user_id,'promoted',`¡Se liberó un lugar! Tu reserva para ${c.name} está confirmada.`);
   audit(db,actorId,first.user_id,classId,'promoted',`Entrada de espera #${first.id}`);
   promoted.push(first.user_id);
 }
 return promoted;
}
function reserve(db,actor,classId){if(actor.role!=='student')fail(403,'FORBIDDEN','Solo las alumnas pueden reservar.');
return tx(db,()=>{
 const c=session(db,classId);requireUpcoming(c);
 const current=db.prepare('SELECT status FROM reservations WHERE class_id=? AND user_id=?').get(classId,actor.id);
 const waiting=db.prepare("SELECT id FROM waitlist_entries WHERE class_id=? AND user_id=? AND status='active'").get(classId,actor.id);
 if(current?.status==='confirmed'||waiting)fail(409,'ALREADY_BOOKED','Ya estás reservada o en la lista de espera de esta clase.');
 if(credits(db,actor.id).available<=0)fail(422,'NO_CREDITS','No tienes créditos disponibles para otra reserva.');
 // Si hubiese un hueco y personas esperando, atender primero la cola.
 promote(db,classId,actor.id);
 if(countConfirmed(db,classId)<c.capacity){confirm(db,classId,actor.id);notify(db,actor.id,'confirmed',`Tu lugar en ${c.name} está confirmado. No se descontaron clases.`);audit(db,actor.id,actor.id,classId,'booked','Reserva confirmada');return {status:'confirmed',position:null};}
 const t=now();const id=db.prepare("INSERT INTO waitlist_entries(class_id,user_id,status,created_at,updated_at) VALUES(?,?,'active',?,?)").run(classId,actor.id,t,t).lastInsertRowid;
 const position=waitPosition(db,classId,id);notify(db,actor.id,'waitlisted',`Estás en la lista de espera de ${c.name}, posición ${position}.`);audit(db,actor.id,actor.id,classId,'waitlisted',`Posición ${position}`);
 return {status:'waitlisted',position};
 });}
function cancel(db,actor,classId,targetUserId){const userId=actor.role==='admin'?(targetUserId||actor.id):actor.id;
 if(actor.role==='instructor')fail(403,'FORBIDDEN','No tienes permiso para cancelar reservas.');
 if(actor.role==='student'&&targetUserId&&targetUserId!==actor.id)fail(403,'FORBIDDEN','Solo puedes cancelar tus propias reservas.');
 return tx(db,()=>{
 const c=session(db,classId);requireUpcoming(c);assertStudent(db,userId);
 const current=db.prepare("SELECT * FROM reservations WHERE class_id=? AND user_id=? AND status='confirmed'").get(classId,userId);
 const waiting=db.prepare("SELECT * FROM waitlist_entries WHERE class_id=? AND user_id=? AND status='active'").get(classId,userId);
 if(current){db.prepare("UPDATE reservations SET status='cancelled',updated_at=? WHERE id=?").run(now(),current.id);audit(db,actor.id,userId,classId,'cancelled','Reserva confirmada cancelada');notify(db,userId,'cancelled',`Se canceló tu reserva para ${c.name}.`);return {status:'cancelled',promoted:promote(db,classId,actor.id)};}
 if(waiting){db.prepare("UPDATE waitlist_entries SET status='withdrawn',updated_at=? WHERE id=?").run(now(),waiting.id);audit(db,actor.id,userId,classId,'withdrawn','Salida de lista de espera');return {status:'withdrawn',promoted:[]};}
 fail(404,'NO_ACTIVE_BOOKING','La alumna no tiene una reserva ni una entrada en espera activas.');
 });}
function listClasses(db,actor){return db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM reservations r WHERE r.class_id=c.id AND r.status='confirmed') AS occupied,
 (SELECT COUNT(*) FROM waitlist_entries w WHERE w.class_id=c.id AND w.status='active') AS waiting
 FROM class_sessions c WHERE c.start_at>? AND c.status='scheduled' ORDER BY c.start_at ASC`).all(now()).map(c=>{
 const mine=actor.role==='student'?db.prepare("SELECT status FROM reservations WHERE class_id=? AND user_id=? AND status='confirmed'").get(c.id,actor.id):null;
 const entry=actor.role==='student'?db.prepare("SELECT id FROM waitlist_entries WHERE class_id=? AND user_id=? AND status='active'").get(c.id,actor.id):null;
 return {...c,available:c.capacity-c.occupied,myStatus:mine?'confirmed':entry?'waitlisted':null,position:entry?waitPosition(db,c.id,entry.id):null};
 });}
function getClassDetail(db,actor,id){const c=session(db,id);
 const occupied=countConfirmed(db,id);
 const waiting=db.prepare("SELECT COUNT(*) AS n FROM waitlist_entries WHERE class_id=? AND status='active'").get(id).n;
 const base={...c,occupied,waiting,available:c.capacity-occupied};
 if(actor.role==='admin'||actor.role==='instructor'){
  const participants=db.prepare("SELECT u.id,u.name,u.email FROM reservations r JOIN users u ON u.id=r.user_id WHERE r.class_id=? AND r.status='confirmed' ORDER BY r.id").all(id);
  const waitList=db.prepare("SELECT u.id,u.name,w.id AS entry_id FROM waitlist_entries w JOIN users u ON u.id=w.user_id WHERE w.class_id=? AND w.status='active' ORDER BY w.id").all(id).map((w,i)=>({...w,position:i+1}));
  return {...base,participants,waitList};
 }
 const mine=db.prepare("SELECT status FROM reservations WHERE class_id=? AND user_id=? AND status='confirmed'").get(id,actor.id);
 const entry=db.prepare("SELECT id FROM waitlist_entries WHERE class_id=? AND user_id=? AND status='active'").get(id,actor.id);
 return {...base,myStatus:mine?'confirmed':entry?'waitlisted':null,position:entry?waitPosition(db,id,entry.id):null};
}
module.exports={AppError,reserve,cancel,credits,listClasses,getClassDetail,countConfirmed,promote};
