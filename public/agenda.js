(function(raiz, crearAgenda){
  'use strict';
  const agenda=crearAgenda();
  if(typeof module==='object'&&module.exports)module.exports=agenda;
  else raiz.AgendaYogaFlow=agenda;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const zonaDelEstudio='America/Guatemala';
  const formatoFecha=new Intl.DateTimeFormat('en-US',{timeZone:zonaDelEstudio,year:'numeric',month:'2-digit',day:'2-digit'});
  const formatoEtiqueta=new Intl.DateTimeFormat('es-GT',{timeZone:zonaDelEstudio,weekday:'short',day:'numeric',month:'short',year:'numeric'});

  function fechaGuatemala(iso){
    const fecha=new Date(iso);
    if(Number.isNaN(fecha.getTime()))return '';
    const partes=Object.fromEntries(formatoFecha.formatToParts(fecha).map(parte=>[parte.type,parte.value]));
    return `${partes.year}-${partes.month}-${partes.day}`;
  }

  function opcionesAgenda(clases){
    const dias=new Map();
    const instructoras=new Set();
    for(const clase of clases){
      const dia=fechaGuatemala(clase.start_at);
      if(dia&&!dias.has(dia))dias.set(dia,{valor:dia,etiqueta:formatoEtiqueta.format(new Date(clase.start_at))});
      if(clase.instructor)instructoras.add(clase.instructor);
    }
    return {
      dias:[...dias.values()].sort((a,b)=>a.valor.localeCompare(b.valor)),
      instructoras:[...instructoras].sort((a,b)=>a.localeCompare(b,'es'))
    };
  }

  function normalizarFiltros(clases,filtros={}){
    const opciones=opcionesAgenda(clases);
    return {
      dia:opciones.dias.some(dia=>dia.valor===filtros.dia)?filtros.dia:'',
      instructora:opciones.instructoras.includes(filtros.instructora)?filtros.instructora:''
    };
  }

  function filtrarAgenda(clases,filtros={}){
    return clases.filter(clase=>(!filtros.dia||fechaGuatemala(clase.start_at)===filtros.dia)&&(!filtros.instructora||clase.instructor===filtros.instructora));
  }

  function resumenResultados(coincidencias,total){
    return coincidencias===total?`${total} ${total===1?'clase':'clases'}`:`${coincidencias} de ${total} clases`;
  }

  return {fechaGuatemala,opcionesAgenda,normalizarFiltros,filtrarAgenda,resumenResultados};
});
