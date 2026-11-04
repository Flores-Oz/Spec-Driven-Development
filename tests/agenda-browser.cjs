'use strict';
// Verificación opcional con un navegador Chromium instalado, sin dependencias npm.
// Ejecutar: node tests/agenda-browser.cjs (o definir CHROME_PATH).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {openDatabase} = require('../src/db');
const {seed} = require('../src/seed');
const {createApp} = require('../src/server');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(read, description, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await read();
    if (value) return value;
    await delay(50);
  }
  throw new Error(`Tiempo agotado: ${description}`);
}

async function main() {
  const executable = [process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'
  ].find(candidate => candidate && fs.existsSync(candidate));
  if (!executable) throw new Error('No se encontró Chromium/Edge/Chrome. Define CHROME_PATH; esta prueba no se ejecutó.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'yogaflow-browser-'));
  const db = openDatabase(':memory:');
  seed(db);
  const starts = ['2099-11-03T01:30:00.000Z','2099-11-03T15:00:00.000Z','2099-11-04T02:00:00.000Z','2099-11-04T17:00:00.000Z'];
  starts.forEach((date, i) => db.prepare('UPDATE class_sessions SET start_at=?,end_at=? WHERE id=?')
    .run(date, new Date(Date.parse(date) + 3600000).toISOString(), `c${i+1}`));
  const {server} = createApp({db});
  let browser, ws, browserErrors = '';
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const js = await fetch(base + '/agenda.js');
    assert.equal(js.status, 200, 'El servidor debe servir el módulo de agenda');
    await js.arrayBuffer();
    browser = spawn(executable, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
      '--disable-features=RendererCodeIntegrity','--in-process-gpu',
      '--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1280,1000','about:blank'],
    {windowsHide:true, stdio:['ignore','ignore','pipe']});
    browser.stderr.on('data', chunk => { browserErrors = (browserErrors + chunk).slice(-4000); });
    const portFile = path.join(profile, 'DevToolsActivePort');
    await until(() => {
      if (browser.exitCode !== null) throw new Error(`El navegador terminó: ${browserErrors}`);
      return fs.existsSync(portFile);
    }, 'inicio del navegador');
    const port = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = pages.find(target => target.type === 'page');
    assert.ok(page, 'Chromium debe exponer una pestaña');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`No abrió WebSocket de Chromium: ${browserErrors}`)), 15000);
      ws.addEventListener('open', () => {clearTimeout(timer);resolve();}, {once:true});
      ws.addEventListener('error', error => {clearTimeout(timer);reject(error);}, {once:true});
    });
    console.log('Navegador conectado; comprobando la interfaz contra el servidor y SQLite temporales.');
    let sequence = 0;
    const pending = new Map();
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const {resolve,reject,timer} = pending.get(message.id);
      pending.delete(message.id);clearTimeout(timer);
      if (message.error) reject(new Error(JSON.stringify(message.error)));else resolve(message.result);
    });
    const command = (method, params = {}) => new Promise((resolve,reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {pending.delete(id);reject(new Error(`CDP sin respuesta: ${method} ${String(params.expression || '').slice(0,180)}\n${browserErrors}`));}, 15000);
      pending.set(id, {resolve,reject,timer});
      ws.send(JSON.stringify({id,method,params}));
    });
    const evaluate = async expression => {
      const result = await command('Runtime.evaluate', {expression,awaitPromise:true,returnByValue:true});
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const exists = selector => evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    const waitFor = (selector, description = selector) => until(() => exists(selector), description);
    const click = async selector => {
      assert.ok(await exists(selector), `Existe ${selector}`);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    };
    const select = async (selector, value) => {
      await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      assert.equal(await evaluate(`document.activeElement?.id`), selector.slice(1), 'El selector conserva el foco');
    };
    const snapshot = () => evaluate(`(() => ({
      dia:document.querySelector('#filtro-dia')?.value,
      instructora:document.querySelector('#filtro-instructora')?.value,
      ids:[...document.querySelectorAll('#lista-clases [data-detail]')].map(el=>el.dataset.detail),
      dias:[...document.querySelector('#filtro-dia').options].map(el=>el.value),
      instructoras:[...document.querySelector('#filtro-instructora').options].map(el=>el.value),
      resumen:document.querySelector('#agenda-resultados')?.textContent.trim()
    }))()`);
    const login = async email => {
      await waitFor('#login-form');
      await evaluate(`(() => {document.querySelector('#email').value=${JSON.stringify(email)};document.querySelector('#password').value='DemoYoga#2026';document.querySelector('#login-form').requestSubmit();})()`);
      await waitFor('#filtro-dia');
    };
    const logout = async () => {await click('[data-action="logout"]');await waitFor('#login-form');};
    const noOverflow = async width => {
      await command('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width<600});
      const sizes = await evaluate(`({viewport:document.documentElement.clientWidth,body:document.body.scrollWidth,document:document.documentElement.scrollWidth})`);
      assert.ok(sizes.body <= sizes.viewport + 1 && sizes.document <= sizes.viewport + 1, `Sin desbordamiento a ${width}px: ${JSON.stringify(sizes)}`);
    };
    const screenshot = async (name, viewport = false) => {
      if (!process.env.AGENDA_SCREENSHOT_DIR) return;
      await until(() => evaluate(`document.getElementById('toast').textContent.trim()===''`), 'aviso de bienvenida terminado antes de capturar', 5000);
      await evaluate(viewport
        ? `document.querySelector('.agenda-panel').scrollIntoView({block:'start',behavior:'instant'})`
        : `window.scrollTo({top:0,behavior:'instant'})`);
      await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const directory = path.resolve(process.env.AGENDA_SCREENSHOT_DIR);
      fs.mkdirSync(directory, {recursive:true});
      const {cssContentSize:size} = await command('Page.getLayoutMetrics');
      const options = viewport ? {format:'png',captureBeyondViewport:false}
        : {format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:size.width,height:size.height,scale:1}};
      const result = await command('Page.captureScreenshot', options);
      fs.writeFileSync(path.join(directory, name), Buffer.from(result.data, 'base64'));
    };
    assert.equal(await evaluate('1+1'), 2, 'CDP evalúa JavaScript');
    await command('Page.navigate', {url:base});
    await noOverflow(360);
    await screenshot('rediseno-acceso-movil.png');
    await noOverflow(1280);
    await screenshot('rediseno-acceso.png');
    await login('maria@yogaflow.demo');
    assert.ok(await evaluate(`document.querySelector('.next-class').textContent.includes('Vinyasa flow')`), 'Próxima reserva confirmada visible');
    await click('.next-class [data-detail]');
    await waitFor('[data-action="close"]');
    assert.ok(await evaluate(`document.querySelector('.drawer h2').textContent.includes('Vinyasa flow')`), 'Próxima reserva abre su detalle');
    await click('[data-action="close"]');
    let current = await snapshot();
    assert.deepEqual(current.ids, ['c1','c2','c3','c4']);
    assert.deepEqual(current.dias, ['', '2099-11-02','2099-11-03','2099-11-04']);
    assert.deepEqual(current.instructoras, ['', 'Camila Ruiz','Valeria León']);
    assert.equal(current.resumen, '4 clases');
    console.log('CA-F01: agenda inicial y opciones completas, únicas y ordenadas comprobadas en navegador.');

    const accessible = await evaluate(`(() => {
      const ids=['filtro-dia','filtro-instructora'];
      return {labels:ids.map(id=>Boolean(document.querySelector('label[for="'+id+'"]')?.textContent.trim())),
      alturas:ids.map(id=>document.getElementById(id).getBoundingClientRect().height),
      limpiar:document.querySelector('[data-action="limpiar-filtros"]').getBoundingClientRect().height,
      role:document.getElementById('agenda-resultados').getAttribute('role'),
      live:document.getElementById('agenda-resultados').getAttribute('aria-live')};
    })()`);
    assert.deepEqual(accessible.labels, [true,true]);
    assert.ok(accessible.alturas.every(height => height >= 44));
    assert.ok(accessible.limpiar >= 44);
    assert.equal(accessible.role, 'status');
    assert.equal(accessible.live, 'polite');
    await noOverflow(360);
    await screenshot('rediseno-alumna-movil.png');
    await screenshot('filtros-movil.png', true);
    await noOverflow(1280);
    await screenshot('filtros-escritorio.png');
    await select('#filtro-dia', '2099-11-02');
    assert.deepEqual((await snapshot()).ids, ['c1'], 'El día UTC diferente filtra según Guatemala');
    await select('#filtro-instructora', 'Valeria León');
    current = await snapshot();
    assert.deepEqual(current.ids, []);
    assert.equal(current.resumen, '0 de 4 clases');
    assert.ok(await evaluate(`document.querySelector('#lista-clases').textContent.includes('No hay clases con estos filtros')`));
    assert.deepEqual(current.dias, ['', '2099-11-02','2099-11-03','2099-11-04'], 'Las opciones no dependen del subconjunto');
    assert.ok(await evaluate(`document.querySelector('.content').textContent.includes('Vinyasa flow')`), 'Mis reservas conserva una sesión oculta por los filtros');
    await click('[data-action="limpiar-filtros"]');
    current = await snapshot();
    assert.equal(current.dia, '');assert.equal(current.instructora, '');
    assert.deepEqual(current.ids, ['c1','c2','c3','c4']);
    console.log('CA-F02/03: fecha Guatemala, AND, contador, cero resultados y limpieza comprobados.');

    await select('#filtro-dia', '2099-11-03');
    await select('#filtro-instructora', 'Camila Ruiz');
    assert.deepEqual((await snapshot()).ids, ['c3']);
    await click('[data-view="notifications"]');
    await click('[data-view="classes"]');
    assert.deepEqual((await snapshot()).ids, ['c3'], 'Navegar conserva los filtros');
    await click('[data-detail="c3"]');
    await waitFor('[data-action="close"]');
    await click('[data-action="close"]');
    assert.deepEqual((await snapshot()).ids, ['c3'], 'Cerrar el detalle conserva los filtros');
    await click('[data-detail="c3"]');
    await waitFor('[data-reserve="c3"]');
    await click('[data-reserve="c3"]');
    await waitFor('[data-cancel="c3"]', 'reserva confirmada');
    current = await snapshot();
    assert.equal(current.dia, '2099-11-03');assert.equal(current.instructora, 'Camila Ruiz');
    let me = await evaluate(`fetch('/api/me').then(r=>r.json())`);
    assert.deepEqual(me.credits, {remaining:10,committed:2,available:8});
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM reservations WHERE class_id='c3' AND user_id='s13' AND status='confirmed'").get().n, 1);
    assert.ok(await evaluate(`document.querySelector('.content').textContent.includes('Vinyasa flow')`));
    // Aceptar la confirmación nativa mediante CDP, sin sustituir window.confirm.
    const dialogAccepted = new Promise(resolve => {
      const listener = event => {
        const message = JSON.parse(event.data);
        if (message.method === 'Page.javascriptDialogOpening') {
          ws.removeEventListener('message', listener);
          command('Page.handleJavaScriptDialog', {accept:true}).then(resolve);
        }
      };
      ws.addEventListener('message', listener);
    });
    await command('Page.enable');
    const cancelClick = click('[data-cancel="c3"]');
    await dialogAccepted;
    await cancelClick;
    await waitFor('[data-reserve="c3"]', 'cancelación terminada');
    me = await evaluate(`fetch('/api/me').then(r=>r.json())`);
    assert.deepEqual(me.credits, {remaining:10,committed:1,available:9});
    await click('[data-action="close"]');
    assert.deepEqual((await snapshot()).ids, ['c3']);
    // Eliminar solo la fecha seleccionada conserva la instructora todavía presente.
    db.prepare("UPDATE class_sessions SET start_at='2099-11-05T14:00:00.000Z',end_at='2099-11-05T15:00:00.000Z' WHERE id IN ('c2','c3')").run();
    await click('[data-detail="c3"]');
    await waitFor('[data-reserve="c3"]');
    await click('[data-reserve="c3"]');
    await waitFor('[data-cancel="c3"]');
    current = await snapshot();
    assert.equal(current.dia, '');assert.equal(current.instructora, 'Camila Ruiz');
    await click('[data-action="close"]');
    await logout();
    await login('maria@yogaflow.demo');
    current = await snapshot();
    assert.equal(current.dia, '');assert.equal(current.instructora, '');
    console.log('CA-F04/05: detalle, navegación, reservar/cancelar, saldo íntegro, actualización y reinicio al salir comprobados.');

    await select('#filtro-instructora', 'Camila Ruiz');
    await command('Page.reload');
    await waitFor('#filtro-dia');
    assert.equal((await snapshot()).instructora, '', 'Recargar la página reinicia los filtros');
    await logout();
    await login('andrea@yogaflow.demo');
    await screenshot('rediseno-administradora.png');
    await select('#filtro-instructora', 'Valeria León');
    assert.deepEqual((await snapshot()).ids, ['c4','c2']);
    assert.ok(await evaluate(`document.querySelector('.hero-side').textContent.includes('4')`), 'Resumen administrativo completo');
    await click('[data-view="classes"]');
    assert.equal((await snapshot()).instructora, 'Valeria León');
    await noOverflow(360);
    await logout();
    await login('camila@yogaflow.demo');
    await select('#filtro-instructora', 'Camila Ruiz');
    assert.ok((await snapshot()).ids.every(id => ['c1','c3'].includes(id)));
    await click('[data-detail="c3"]');
    await waitFor('[data-action="close"]');
    assert.equal(await exists('[data-reserve]'), false, 'Instructora no recibe acción para reservar');
    assert.equal(await exists('[data-cancel]'), false, 'Instructora no recibe acción para cancelar');
    await click('[data-action="close"]');
    await noOverflow(360);
    console.log('CA-F06: labels, anuncios, foco, targets 44px, móvil 360px y los tres roles comprobados en Edge/Chromium.');

    // Vaciar la agenda devuelve un estado diferente al de cero coincidencias.
    await logout();
    db.prepare("UPDATE class_sessions SET status='cancelled'").run();
    await login('maria@yogaflow.demo');
    assert.equal((await snapshot()).resumen, '0 clases');
    assert.ok(await evaluate(`document.querySelector('.next-class').textContent.includes('Tu mat te espera.')`), 'Próxima reserva vacía tiene un mensaje claro');
    assert.ok(await evaluate(`document.querySelector('#lista-clases').textContent.includes('No hay clases próximas')`));
    assert.equal(await evaluate(`document.querySelector('#lista-clases').textContent.includes('No hay clases con estos filtros')`), false);
    console.log('CA-F03: agenda sin sesiones tiene su mensaje propio. Verificación de navegador terminada.');
  } finally {
    ws?.close();
    if (browser && browser.exitCode === null) {
      browser.kill();
      await Promise.race([new Promise(resolve => browser.once('exit', resolve)), delay(5000)]);
    }
    if (server.listening) await new Promise(resolve => server.close(resolve));
    db.close();
    // Solo borrar el directorio temporal creado en este script, validando antes su raíz.
    const resolved = path.resolve(profile);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('yogaflow-browser-')) {
      try { fs.rmSync(resolved, {recursive:true,force:true,maxRetries:5,retryDelay:200}); }
      catch (error) {console.warn(`Perfil temporal pendiente de limpiar: ${resolved} (${error.code}).`);}
    }
  }
}

main().catch(error => {console.error(error.stack);process.exitCode = 1;});
