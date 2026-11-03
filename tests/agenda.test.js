'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fechaGuatemala, opcionesAgenda, filtrarAgenda, normalizarFiltros, resumenResultados
} = require('../public/agenda');

// Fechas fijas: los primeros minutos UTC todavía pertenecen al día anterior en Guatemala.
const clases = Object.freeze([
  Object.freeze({id:'c1', start_at:'2099-11-03T01:30:00.000Z', instructor:'Zoe Pérez', myStatus:'confirmed', occupied:12}),
  Object.freeze({id:'c2', start_at:'2099-11-03T15:00:00.000Z', instructor:'Ángela Ruiz', myStatus:null, occupied:4}),
  Object.freeze({id:'c3', start_at:'2099-11-04T02:00:00.000Z', instructor:'Zoe Pérez', myStatus:'waitlisted', occupied:12}),
  Object.freeze({id:'c4', start_at:'2099-11-04T17:00:00.000Z', instructor:'Camila Soto', myStatus:null, occupied:0}),
  Object.freeze({id:'c5', start_at:'2099-11-04T18:00:00.000Z', instructor:'Ángela Ruiz', myStatus:null, occupied:1})
]);
const ids = lista => lista.map(clase => clase.id);

test('CA-F01 · sin filtros conserva todas las sesiones y su orden sin modificar la agenda', () => {
  const original = JSON.stringify(clases);
  assert.deepEqual(ids(filtrarAgenda(clases)), ['c1','c2','c3','c4','c5']);
  assert.deepEqual(ids(filtrarAgenda(clases, {dia:'', instructora:''})), ['c1','c2','c3','c4','c5']);
  assert.equal(JSON.stringify(clases), original);
});

test('CA-F01 · opciones únicas, fechas ascendentes y nombres en orden español desde la agenda completa', () => {
  // La API ya ordena las sesiones; las opciones también deben ordenar si cambia el orden de entrada.
  const opciones = opcionesAgenda([...clases].reverse());
  assert.deepEqual(opciones.dias.map(dia => dia.valor), ['2099-11-02','2099-11-03','2099-11-04']);
  assert.ok(opciones.dias.every(dia => typeof dia.etiqueta === 'string' && dia.etiqueta.length > 0));
  assert.deepEqual(opciones.instructoras, ['Ángela Ruiz','Camila Soto','Zoe Pérez']);
  filtrarAgenda(clases, {dia:'2099-11-02', instructora:'Zoe Pérez'});
  assert.deepEqual(opcionesAgenda(clases), opciones);
});

test('CA-F02 · fecha de clase usa Guatemala cuando UTC y la zona del dispositivo difieren', () => {
  assert.equal(fechaGuatemala('2099-11-03T01:30:00.000Z'), '2099-11-02');
  assert.equal(fechaGuatemala('2099-11-03T05:59:59.000Z'), '2099-11-02');
  assert.equal(fechaGuatemala('2099-11-03T06:00:00.000Z'), '2099-11-03');
  assert.equal(fechaGuatemala('2099-11-03T15:00:00+09:00'), '2099-11-03');
  assert.deepEqual(ids(filtrarAgenda(clases, {dia:'2099-11-02'})), ['c1']);
  assert.deepEqual(ids(filtrarAgenda(clases, {dia:'2099-11-03'})), ['c2','c3']);
});

test('CA-F02 · filtra instructora y combina día e instructora con AND', () => {
  assert.deepEqual(ids(filtrarAgenda(clases, {instructora:'Zoe Pérez'})), ['c1','c3']);
  assert.deepEqual(ids(filtrarAgenda(clases, {dia:'2099-11-03', instructora:'Zoe Pérez'})), ['c3']);
  assert.deepEqual(ids(filtrarAgenda(clases, {dia:'2099-11-02', instructora:'Camila Soto'})), []);
});

test('CA-F03 · contador distingue resultado único, parcial, vacío y agenda vacía', () => {
  assert.equal(resumenResultados(5, 5), '5 clases');
  assert.equal(resumenResultados(1, 1), '1 clase');
  assert.equal(resumenResultados(1, 5), '1 de 5 clases');
  assert.equal(resumenResultados(0, 5), '0 de 5 clases');
  assert.equal(resumenResultados(0, 0), '0 clases');
  assert.deepEqual(opcionesAgenda([]), {dias:[], instructoras:[]});
  assert.deepEqual(filtrarAgenda([], {dia:'', instructora:''}), []);
});

test('CA-F04 · actualización conserva filtros válidos y reinicia únicamente la selección ausente', () => {
  const filtros = Object.freeze({dia:'2099-11-02', instructora:'Zoe Pérez'});
  assert.deepEqual(normalizarFiltros(clases, filtros), filtros);
  assert.deepEqual(normalizarFiltros(clases.slice(1), filtros), {dia:'', instructora:'Zoe Pérez'});
  assert.deepEqual(normalizarFiltros(clases.filter(c => c.instructor !== 'Zoe Pérez'), {dia:'2099-11-03', instructora:'Zoe Pérez'}), {dia:'2099-11-03', instructora:''});
  assert.deepEqual(normalizarFiltros([], filtros), {dia:'', instructora:''});
  assert.deepEqual(normalizarFiltros(clases, {}), {dia:'', instructora:''});
});

test('CA-F05 · filtrar no altera estados propios, ocupación ni compromisos de la agenda completa', () => {
  const antes = clases.filter(clase => clase.myStatus);
  const visibles = filtrarAgenda(clases, {instructora:'Camila Soto'});
  assert.deepEqual(ids(visibles), ['c4']);
  assert.deepEqual(ids(clases.filter(clase => clase.myStatus)), ['c1','c3']);
  assert.deepEqual(clases.filter(clase => clase.myStatus), antes);
  assert.equal(clases.find(clase => clase.id === 'c1').occupied, 12);
  assert.equal(clases.find(clase => clase.id === 'c3').myStatus, 'waitlisted');
});
