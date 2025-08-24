/*******************
 * Utilidades
 *******************/
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function showToast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2600);
}

function currency(n){ return `$${n.toFixed(2)}`; }

function saveLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function loadLS(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; }}

/*******************
 * “Base de datos” local
 *******************/
const DB_KEYS = {
  USERS: 'srdroid_users',
  SESSION: 'srdroid_session',
  CART: 'srdroid_cart',
  ORDERS: 'srdroid_orders',
  INVENTORY: 'srdroid_inventory'
};

// Inventario inicial
const DEFAULT_INVENTORY = [
  {id:'sam-pant-01', name:'Pantalla Samsung A51', brand:'Samsung', price:120, stock:8, tags:['pantalla','OLED']},
  {id:'sam-bat-02', name:'Batería Samsung S10', brand:'Samsung', price:55, stock:12, tags:['batería']},
  {id:'hua-bat-01', name:'Batería Huawei P30', brand:'Huawei', price:49, stock:10, tags:['batería']},
  {id:'hua-cam-02', name:'Cámara Huawei P40', brand:'Huawei', price:95, stock:6, tags:['cámara']},
  {id:'xia-cam-01', name:'Cámara Xiaomi Note 10', brand:'Xiaomi', price:89, stock:7, tags:['cámara']},
  {id:'xia-pant-02', name:'Pantalla Xiaomi Redmi 9', brand:'Xiaomi', price:79, stock:9, tags:['pantalla','LCD']},
  {id:'opp-alt-01', name:'Altavoz Oppo Reno 5', brand:'Oppo', price:42, stock:11, tags:['altavoz']},
  {id:'lg-con-01',  name:'Conector de carga LG K40', brand:'LG', price:29, stock:15, tags:['conector']},
  {id:'mot-mic-01', name:'Micrófono Motorola G7', brand:'Motorola', price:19, stock:18, tags:['micrófono']},
  {id:'uni-prot-01', name:'Protector Templado Universal', brand:'Universal', price:9, stock:50, tags:['protector']}
];

function ensureInventory(){
  const inv = loadLS(DB_KEYS.INVENTORY, null);
  if(!inv){ saveLS(DB_KEYS.INVENTORY, DEFAULT_INVENTORY); }
}
ensureInventory();

/*******************
 * Autenticación (localStorage demo)
 *******************/
function getUsers(){ return loadLS(DB_KEYS.USERS, []); }
function setUsers(users){ saveLS(DB_KEYS.USERS, users); }
function getSession(){ return loadLS(DB_KEYS.SESSION, null); }
function setSession(sess){ saveLS(DB_KEYS.SESSION, sess); }

function register(name, email, pass){
  const users = getUsers();
  if(users.some(u => u.email === email)) throw new Error('Ya existe una cuenta con ese email.');
  // Aviso: hash real requiere backend; aquí es demo.
  users.push({name, email, pass});
  setUsers(users);
  setSession({name, email});
}

function login(email, pass){
  const user = getUsers().find(u => u.email === email && u.pass === pass);
  if(!user) throw new Error('Credenciales incorrectas.');
  setSession({name:user.name, email:user.email});
}

function logout(){
  setSession(null);
}

/*******************
 * UI Header / Usuario
 *******************/
function renderUserArea(){
  const sess = getSession();
  const userArea = $('#userArea');
  if(sess){
    userArea.innerHTML = `
      <span class="badge">Hola, ${sess.name.split(' ')[0]}</span>
      <button class="btn" id="logoutBtn">Salir</button>
    `;
    $('#logoutBtn').onclick = () => { logout(); renderUserArea(); showToast('Sesión cerrada'); };
  } else {
    userArea.innerHTML = `<button id="loginBtn" class="btn">Iniciar Sesión</button>`;
    $('#loginBtn').onclick = () => openModal('authModal');
  }
}

/*******************
 * Tabs AUTH modal
 *******************/
function setupAuthModal(){
  $$('#authModal .tab').forEach(tab=>{
    tab.onclick = () => {
      $$('#authModal .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $$('#authModal .tab-panel').forEach(p=>{
        p.classList.toggle('active', p.id===target);
      });
    };
  });

  // Login submit
  $('#loginTab').addEventListener('submit', e=>{
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pass = $('#loginPass').value;
    try{
      login(email, pass);
      closeModal('authModal');
      renderUserArea();
      showToast('¡Bienvenido!');
    }catch(err){ showToast(err.message); }
  });

  // Register submit
  $('#registerTab').addEventListener('submit', e=>{
    e.preventDefault();
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const pass = $('#regPass').value;
    try{
      register(name, email, pass);
      closeModal('authModal');
      renderUserArea();
      showToast('Cuenta creada 🎉');
    }catch(err){ showToast(err.message); }
  });
}

/*******************
 * Carrito
 *******************/
function getCart(){ return loadLS(DB_KEYS.CART, []); }
function setCart(c){ saveLS(DB_KEYS.CART, c); }
function cartTotal(c){ return c.reduce((s,i)=> s + i.price * i.qty, 0); }

function toggleCart(){ $('#cartSidebar').classList.toggle('active'); }

function addToCart(item){
  const cart = getCart();
  const ex = cart.find(i=>i.id===item.id);
  if(ex){ ex.qty = Math.min(ex.qty+1, 99); } else { cart.push({...item, qty:1}); }
  setCart(cart);
  renderCart();
  toggleCart();
  showToast('Añadido al carrito');
}

function removeFromCart(id){
  const cart = getCart().filter(i=>i.id!==id);
  setCart(cart); renderCart(); showToast('Eliminado');
}

function changeQty(id, delta){
  const cart = getCart();
  const it = cart.find(i=>i.id===id);
  if(!it) return;
  it.qty = Math.max(1, Math.min(99, it.qty + delta));
  setCart(cart); renderCart();
}

function renderCart(){
  const cart = getCart();
  const body = $('#carrito');
  body.innerHTML = '';
  if(cart.length===0){
    body.innerHTML = `<p>Tu carrito está vacío.</p>`;
  }else{
    cart.forEach(i=>{
      const row = document.createElement('div');
      row.className='cart-item';
      row.innerHTML = `
        <div>
          <div><strong>${i.name}</strong></div>
          <div class="badge">${i.brand}</div>
          <div>${currency(i.price)} × ${i.qty}</div>
        </div>
        <div class="actions">
          <button class="icon-btn" title="Quitar" onclick="removeFromCart('${i.id}')">🗑️</button>
          <button class="icon-btn" title="Menos" onclick="changeQty('${i.id}', -1)">➖</button>
          <button class="icon-btn" title="Más" onclick="changeQty('${i.id}', 1)">➕</button>
        </div>
      `;
      body.appendChild(row);
    });
  }
  $('#cartTotal').textContent = currency(cartTotal(cart));
}

/*******************
 * Checkout simulado
 *******************/
function openCheckout(){
  const cart = getCart();
  if(cart.length===0){ showToast('Tu carrito está vacío'); return; }
  const sum = $('#checkoutSummary');
  sum.innerHTML = `
    <h4>Resumen</h4>
    <ul>
      ${cart.map(i=>`<li>${i.name} (${i.qty}) — ${currency(i.price*i.qty)}</li>`).join('')}
    </ul>
    <p><strong>Total: ${currency(cartTotal(cart))}</strong></p>
  `;
  openModal('checkoutModal');
}

function placeOrder(data){
  const orders = loadLS(DB_KEYS.ORDERS, []);
  const cart = getCart();
  const order = {
    id: 'ORD-' + Math.random().toString(36).slice(2,8).toUpperCase(),
    at: new Date().toISOString(),
    items: cart,
    total: cartTotal(cart),
    customer: data
  };
  orders.push(order);
  saveLS(DB_KEYS.ORDERS, orders);
  setCart([]);
  renderCart();
  showToast(`Pedido ${order.id} confirmado ✅`);
  closeModal('checkoutModal');
}

/*******************
 * Inventario / Catálogo
 *******************/
function getInventory(){ return loadLS(DB_KEYS.INVENTORY, DEFAULT_INVENTORY); }

function renderProducts(){
  const cont = $('#productos');
  const q = $('#searchInput').value.trim().toLowerCase();
  const b = $('#brandFilter').value;
  const inv = getInventory().filter(p=>{
    const okBrand = !b || p.brand===b;
    const okSearch = !q || [p.name,p.brand,(p.tags||[]).join(' ')].join(' ').toLowerCase().includes(q);
    return okBrand && okSearch;
  });

  cont.innerHTML = '';
  if(inv.length===0){ cont.innerHTML = `<p>No hay resultados.</p>`; return; }

  inv.forEach(p=>{
    const el = document.createElement('div');
    el.className='product';
    el.innerHTML = `
      <div class="name">${p.name}</div>
      <div class="brand">${p.brand}</div>
      <div class="row">
        ${(p.tags||[]).slice(0,3).map(t=>`<span class="badge">${t}</span>`).join('')}
      </div>
      <div class="price">${currency(p.price)}</div>
      <button class="btn btn-primary" ${p.stock<=0?'disabled':''} onclick="addToCart(${JSON.stringify({id:p.id,name:p.name,brand:p.brand,price:p.price}).replace(/"/g,'&quot;')})">
        ${p.stock>0?'Añadir al carrito':'Sin stock'}
      </button>
    `;
    cont.appendChild(el);
  });
}

/*******************
 * Diagnóstico por marca
 *******************/
const infoMarcas = {
  Huawei: [
    'Actualiza EMUI y apps Huawei; usa “Gestor del teléfono”.',
    'Desactiva optimizaciones agresivas si las notificaciones se retrasan.',
    'Restablece configuración de red para problemas de datos.'
  ],
  Samsung: [
    'Usa “Cuidado del dispositivo” y optimiza el almacenamiento.',
    'Desactiva 120Hz temporalmente si hay sobrecalentamiento.',
    'Actualiza desde Galaxy Store controladores de cámara.'
  ],
  Oppo: [
    'Activa el modo alto rendimiento sólo cuando lo necesites.',
    'Gestiona inicio automático desde Seguridad.',
    'Borra caché de la app Cámara si hay bugs.'
  ],
  Xiaomi: [
    'En MIUI, desactiva animaciones y “Ahorro de MIUI” para apps críticas.',
    'Limpia caché desde la app Seguridad.',
    'Revisa permisos y autoinicio en Ajustes > Apps.'
  ],
  LG: [
    'Actualiza firmware; revisa apps que drenan batería.',
    'Usa diagnóstico de hardware (menú oculto) si el táctil falla.',
    'Haz calibración de batería tras cambio de repuesto.'
  ],
  Motorola: [
    'Revisa Moto Actions; desactiva gestos si consumen batería.',
    'Modo seguro para detectar apps conflictivas.',
    'Actualiza Play Services y restablece APN si no hay datos.'
  ]
};

function mostrarMarca(marca){
  const div = $('#marcaInfo');
  const tips = infoMarcas[marca]||[];
  div.innerHTML = `
    <h3>${marca}</h3>
    <ol>${tips.map(t=>`<li>${t}</li>`).join('')}</ol>
  `;
  div.scrollIntoView({behavior:'smooth', block:'start'});
}

/*******************
 * Chat simulado
 *******************/
let chatOpen = false;
function toggleChat(){
  const body = $('#chatBody');
  chatOpen = !chatOpen; body.style.display = chatOpen ? 'block':'none';
}
function enviarMensaje(){
  const input = $('#chatInput');
  const mensajes = $('#chatMensajes');
  const txt = input.value.trim(); if(!txt) return;
  mensajes.innerHTML += `<p><strong>Tú:</strong> ${txt}</p>`;
  input.value='';
  setTimeout(()=>{
    // Respuesta simple basada en palabras clave
    let resp = 'Estoy analizando tu problema… prueba reiniciar, actualizar y limpiar caché.';
    if(/bater/i.test(txt)) resp = 'Si tu batería dura poco, activa ahorro, baja brillo, revisa apps en segundo plano y considera cambio de batería.';
    if(/pantall/i.test(txt)) resp = 'Para pantallas congeladas: fuerza reinicio y verifica actualizaciones; si está rota, revisa repuestos en la tienda.';
    mensajes.innerHTML += `<p><strong>IA:</strong> ${resp}</p>`;
    mensajes.scrollTop = mensajes.scrollHeight;
  }, 600);
}

/*******************
 * Modales genéricos
 *******************/
function openModal(id){ $('#modalOverlay').classList.add('active'); $('#'+id).classList.add('show'); }
function closeModal(id){ $('#modalOverlay').classList.remove('active'); $('#'+id).classList.remove('show'); }

/*******************
 * Animaciones on-scroll
 *******************/
function onScrollReveal(){
  $$('.reveal').forEach(el=>{
    const rect = el.getBoundingClientRect();
    if(rect.top < window.innerHeight - 80){ el.classList.add('visible'); }
  });
}

/*******************
 * Eventos iniciales
 *******************/
window.addEventListener('DOMContentLoaded', ()=>{
  // Header buttons
  $('#cartBtn').addEventListener('click', toggleCart);
  $('#checkoutBtn').addEventListener('click', openCheckout);

  // Search / filter
  $('#searchInput').addEventListener('input', renderProducts);
  $('#brandFilter').addEventListener('change', renderProducts);

  // Contact form
  $('#contactForm').addEventListener('submit', e=>{
    e.preventDefault(); showToast('Gracias por contactarnos. Te responderemos pronto.'); e.target.reset();
  });

  // Auth modal setup
  setupAuthModal();

  // Checkout submit
  $('#checkoutForm').addEventListener('submit', e=>{
    e.preventDefault();
    const data = {
      name: $('#chkName').value.trim(),
      doc: $('#chkDoc').value.trim(),
      addr: $('#chkAddr').value.trim(),
      city: $('#chkCity').value.trim(),
      phone: $('#chkPhone').value.trim(),
      pay: $('#chkPay').value
    };
    placeOrder(data);
  });

  // Render UI
  renderUserArea();
  renderCart();
  renderProducts();
  onScrollReveal();
});

window.addEventListener('scroll', onScrollReveal);