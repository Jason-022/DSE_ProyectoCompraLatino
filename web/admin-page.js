const session = JSON.parse(localStorage.getItem('compralatino-session') || 'null');
const activeSession = session || { username: '', firstName: '', lastName: '', role: '' };
const page = document.body.dataset.adminPage;
const isAdmin = session?.role === 'admin';
const isSeller = session?.role === 'seller';

if (!session || (!isAdmin && !isSeller)) window.location.replace('/');
if (isSeller && page !== 'productos') window.location.replace('/administracion/productos');

const titles = {
  panel: ['Panel ejecutivo', 'Visión operativa de la plataforma en tiempo real.'],
  usuarios: ['Usuarios y vendedores', 'Crea vendedores y administra las cuentas registradas.'],
  productos: ['Administración de productos', 'Modifica la información visible en el catálogo.'],
  analiticas: ['Analíticas', 'Resumen de rendimiento comercial y comportamiento de pujas.'],
  transacciones: ['Transacciones', 'Consulta los movimientos recientes de la plataforma.'],
  salud: ['Salud de API', 'Estado de los servicios conectados.'],
  reportes: ['Reportes', 'Prepara resúmenes operativos para el equipo.'],
  configuracion: ['Configuración', 'Preferencias generales de la plataforma.']
};

function navLink(key, label, href, icon) { return `<a href="${href}" class="${page === key ? 'active' : ''}"><span>${icon}</span>${label}</a>`; }
function navigation() {
  const adminItems = [
    navLink('panel', 'Panel', '/administracion', '▦'), navLink('usuarios', 'Usuarios y vendedores', '/administracion/usuarios', '♙'),
    navLink('analiticas', 'Analíticas', '/administracion/analiticas', '⌁'), navLink('transacciones', 'Transacciones', '/administracion/transacciones', '▤'),
    navLink('salud', 'Salud de API', '/administracion/salud-api', '♡'), navLink('reportes', 'Reportes', '/administracion/reportes', '▥'),
    navLink('configuracion', 'Configuración', '/administracion/configuracion', '⚙'), navLink('productos', 'Administrar productos', '/administracion/productos', '□')
  ];
  const sellerItems = [navLink('productos', 'Administrar productos', '/administracion/productos', '□')];
  return `<aside class="dashboard-sidebar"><a class="brand" href="/"><span class="brand-mark">CL</span><span>Compra<span>Latino</span></span></a><nav>${(isAdmin ? adminItems : sellerItems).join('')}</nav><section class="sidebar-account"><span>Sesión activa</span><b>${activeSession.firstName} ${activeSession.lastName}</b><button id="logoutButton" class="sidebar-logout">Cerrar sesión</button><a class="sidebar-home" href="/">← Volver al catálogo</a></section></aside>`;
}
function dashboardContent() {
  return `<section class="metrics" id="dashboardMetrics"><article class="metric"><p>Cargando datos</p><strong>—</strong><span>Actualizando</span></article></section>
  <section class="dashboard-panels"><article class="trend-panel"><div class="panel-title"><h3>Tendencia de pujas diarias</h3><span><i></i> Últimos 7 días</span></div><div class="chart-wrap"><span class="axis a1">250</span><span class="axis a2">200</span><span class="axis a3">150</span><span class="axis a4">100</span><span class="axis a5">50</span><svg viewBox="0 0 560 165" preserveAspectRatio="none" aria-label="Gráfica de pujas"><path class="chart-grid" d="M0 8H560M0 43H560M0 78H560M0 113H560M0 148H560"/><polyline class="chart-primary" points="0,119 93,92 186,106 280,57 373,77 466,29 560,47"/><polyline class="chart-secondary" points="0,140 93,131 186,113 280,121 373,94 466,103 560,74"/></svg><div class="chart-days"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div></div></article><article class="health-panel"><div class="panel-title"><h3>Monitor de salud</h3><span class="healthy">● Operativo</span></div><div class="health-item"><div><b>API principal</b><span>99.98%</span></div><i><em style="width:99%"></em></i></div><div class="health-item"><div><b>Base de datos</b><span>99.94%</span></div><i><em style="width:96%"></em></i></div><div class="health-item"><div><b>Servicio de pagos</b><span>99.91%</span></div><i><em style="width:92%"></em></i></div></article></section>
  <section class="transactions"><div class="panel-title"><h3>Transacciones recientes</h3><span>Ver todas →</span></div><div class="transactions-table"><div class="transaction-row header"><span>ID</span><span>Usuario</span><span>Artículo</span><span>Total</span><span>Estado</span><span>Fecha</span></div><div class="transaction-row"><span>TXN-1023</span><span>clienteDemo</span><span>Reloj Seiko vintage</span><span>$236</span><b class="completed">Completada</b><span>Hoy</span></div><div class="transaction-row"><span>TXN-1024</span><span>maria88</span><span>Consola retro</span><span>$142</span><b class="pending">Pendiente</b><span>Hoy</span></div><div class="transaction-row"><span>TXN-1025</span><span>carlos_vega</span><span>Cámara Fujifilm</span><span>$896</span><b class="completed">Completada</b><span>Ayer</span></div></div></section>`;
}
function productsContent() { return `<section class="page-card page-card-wide"><p class="eyebrow">CATÁLOGO</p><h3>Editar producto</h3><p>Selecciona un artículo y guarda los cambios que se mostrarán en el catálogo.</p><form id="productForm" class="form-stack admin-form"><label for="productSelect">Producto</label><select id="productSelect"></select><label for="productTitle">Título</label><input id="productTitle" required><label for="productCategory">Categoría</label><input id="productCategory" required><label for="productBid">Oferta actual (USD)</label><input id="productBid" type="number" min="1" required><label for="productBadge">Etiqueta</label><input id="productBadge" required><button class="primary-button" type="submit">Guardar cambios</button><p id="productFeedback" class="form-feedback"></p></form></section>`; }
function usersContent() { return `<section class="admin-content-grid"><section class="page-card"><p class="eyebrow">GESTIÓN DE CUENTAS</p><h3 id="userFormTitle">Crear usuario</h3><p id="userFormDescription">Registra usuarios, vendedores y administradores.</p><form id="userForm" class="form-stack admin-form"><div class="split-fields"><span><label for="newUsername">Nombre de usuario</label><input id="newUsername" minlength="4" required></span><span><label for="newEmail">Correo</label><input id="newEmail" type="email" required></span></div><div class="split-fields"><span><label for="newFirstName">Nombre</label><input id="newFirstName" required></span><span><label for="newLastName">Apellidos</label><input id="newLastName" required></span></div><div class="split-fields"><span><label for="newPhone">Número celular</label><input id="newPhone"></span><span><label for="newBirthDate">Fecha de nacimiento</label><input id="newBirthDate" type="date"></span></div><label for="newRole">Rol</label><select id="newRole"><option value="seller">Vendedor</option><option value="customer">Usuario</option><option value="admin">Administrador</option></select><p id="protectedPasswordNotice" class="protected-password-notice" hidden>La contraseña está protegida y nunca se muestra. Solo cambiará si escribes una nueva durante la edición.</p><section id="userPasswordEditor" class="user-password-editor"><label id="newPasswordLabel" for="newPassword">Contraseña</label><div class="password-field"><input id="newPassword" type="password" autocomplete="new-password" minlength="8" required><button type="button" class="password-toggle" data-user-password="newPassword">Mostrar</button></div><label id="repeatPasswordLabel" for="repeatPassword">Repetir contraseña</label><div class="password-field"><input id="repeatPassword" type="password" autocomplete="new-password" minlength="8" required><button type="button" class="password-toggle" data-user-password="repeatPassword">Mostrar</button></div><small id="userPasswordHint">Usa al menos 8 caracteres.</small></section><button id="userSubmit" class="primary-button" type="button">Crear usuario</button><button id="cancelUserEdit" class="text-button" type="button" hidden>Cancelar edición</button><p id="userFeedback" class="form-feedback" aria-live="polite"></p></form></section><section class="page-card user-directory"><p class="eyebrow">DIRECTORIO</p><h3>Usuarios registrados</h3><p>Selecciona directamente una cuenta para consultar o actualizar su información.</p><label class="user-search" for="userSearch"><span>Buscar usuario</span><input id="userSearch" type="search" placeholder="Nombre, usuario o correo" autocomplete="off"></label><p id="userSearchStatus" class="user-search-status" aria-live="polite"></p><div id="userList" class="user-list"></div></section></section>`; }
function infoContent() { const content = { analiticas:['Rendimiento de pujas','Las pujas activas crecieron 8.2% frente al período anterior.'], transacciones:['Historial de transacciones','Consulta las operaciones procesadas, pendientes y completadas.'], salud:['Servicios disponibles','Todos los servicios principales están operativos.'], reportes:['Reportes operativos','Genera el corte mensual de ventas y actividad.'], configuracion:['Preferencias de plataforma','Las preferencias de notificaciones y operaciones se administrarán desde aquí.'] }[page]; return `<section class="page-card info-card"><p class="eyebrow">${titles[page][0].toUpperCase()}</p><h3>${content[0]}</h3><p>${content[1]}</p><div class="info-stat"><strong>${page === 'salud' ? '99.98%' : page === 'analiticas' ? '+12.5%' : 'Listo'}</strong><span>${page === 'salud' ? 'Disponibilidad de servicios' : 'Información actualizada'}</span></div></section>`; }
function mainContent() { if (page === 'panel') return dashboardContent(); if (page === 'productos') return productsContent(); if (page === 'usuarios') return usersContent(); return infoContent(); }

document.querySelector('#adminRoot').innerHTML = `<section class="executive-dashboard admin-page">${navigation()}<section class="dashboard-main"><header class="dashboard-topbar"><div><h2>${titles[page][0]}</h2><p>${titles[page][1]}</p></div></header>${mainContent()}</section></section>`;

function headers(json = false) { const value = { 'x-compralatino-user': activeSession.username }; if (json) value['Content-Type'] = 'application/json'; return value; }
document.querySelector('#logoutButton').addEventListener('click', () => { localStorage.removeItem('compralatino-session'); window.location.assign('/'); });

async function loadDashboard() { const response = await fetch('/api/dashboard', { headers: headers() }); if (!response.ok) return; const data = await response.json(); document.querySelector('#dashboardMetrics').innerHTML = data.metrics.map((metric) => `<article class="metric"><p>${metric.label}</p><strong>${metric.value}</strong><span>↑ ${metric.delta}</span></article>`).join(''); }
async function loadProducts() { const response = await fetch('/api/products'); const products = await response.json(); const select = document.querySelector('#productSelect'); select.innerHTML = products.map((product) => `<option value="${product.id}">${product.title}</option>`).join(''); function fill() { const product = products.find((item) => item.id === select.value); if (!product) return; document.querySelector('#productTitle').value = product.title; document.querySelector('#productCategory').value = product.category; document.querySelector('#productBid').value = product.currentBid; document.querySelector('#productBadge').value = product.badge; } select.addEventListener('change', fill); fill(); document.querySelector('#productForm').addEventListener('submit', async (event) => { event.preventDefault(); const payload = { title: document.querySelector('#productTitle').value, category: document.querySelector('#productCategory').value, currentBid: Number(document.querySelector('#productBid').value), badge: document.querySelector('#productBadge').value }; const result = await fetch(`/api/products/${select.value}`, { method: 'PATCH', headers: headers(true), body: JSON.stringify(payload) }); document.querySelector('#productFeedback').textContent = result.ok ? 'Producto actualizado correctamente.' : 'No fue posible guardar los cambios.'; }); }
const userFieldIds = ['newUsername', 'newEmail', 'newFirstName', 'newLastName', 'newPhone', 'newBirthDate', 'newRole'];
let userMode = 'create';
let selectedUser = null;
let usersCache = [];

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function roleLabel(role) { return role === 'seller' ? 'Vendedor' : role === 'admin' ? 'Administrador' : 'Usuario'; }
function normalizeUserSearch(value) { return String(value || '').trim().toLocaleLowerCase('es'); }
function clearUserPasswords() { ['newPassword', 'repeatPassword'].forEach((id) => { const input = document.querySelector(`#${id}`); input.value = ''; input.type = 'password'; }); document.querySelectorAll('[data-user-password]').forEach((button) => { button.textContent = 'Mostrar'; }); }
function fillUser(user) { document.querySelector('#newUsername').value = user?.username || ''; document.querySelector('#newEmail').value = user?.email || ''; document.querySelector('#newFirstName').value = user?.firstName || ''; document.querySelector('#newLastName').value = user?.lastName || ''; document.querySelector('#newPhone').value = user?.phone || ''; document.querySelector('#newBirthDate').value = user?.birthDate || ''; document.querySelector('#newRole').value = user?.role || 'seller'; clearUserPasswords(); }
function setUserMode(mode) {
  userMode = mode;
  const creating = mode === 'create';
  const editing = mode === 'editing';
  const selected = mode === 'selected';
  userFieldIds.forEach((id) => { document.querySelector(`#${id}`).disabled = selected; });
  document.querySelector('#userPasswordEditor').hidden = selected;
  document.querySelector('#protectedPasswordNotice').hidden = !selected;
  document.querySelector('#newPassword').required = creating;
  document.querySelector('#repeatPassword').required = creating;
  document.querySelector('#newPasswordLabel').textContent = creating ? 'Contraseña' : 'Nueva contraseña';
  document.querySelector('#repeatPasswordLabel').textContent = creating ? 'Repetir contraseña' : 'Repetir nueva contraseña';
  document.querySelector('#userPasswordHint').textContent = creating ? 'Usa al menos 8 caracteres.' : 'Déjala vacía para conservar la contraseña actual.';
  document.querySelector('#userFormTitle').textContent = creating ? 'Crear usuario' : selected ? 'Detalle del usuario' : 'Editar usuario';
  document.querySelector('#userFormDescription').textContent = creating ? 'Registra usuarios, vendedores y administradores.' : selected ? 'Revisa la información y elige Editar usuario para habilitar los campos.' : 'Actualiza los datos necesarios. La contraseña solo cambia si escribes una nueva.';
  const submit = document.querySelector('#userSubmit');
  submit.textContent = creating ? 'Crear usuario' : selected ? 'Editar usuario' : 'Guardar cambios';
  const cancel = document.querySelector('#cancelUserEdit');
  cancel.hidden = creating;
  cancel.textContent = editing ? 'Cancelar edición' : 'Crear nuevo usuario';
  document.querySelector('#userFeedback').textContent = '';
  document.querySelectorAll('.user-item').forEach((item) => item.classList.toggle('selected', Boolean(selectedUser) && item.dataset.user === selectedUser.username));
  if (editing) document.querySelector('#newUsername').focus();
}
function resetUserForm() { selectedUser = null; document.querySelector('#userForm').reset(); fillUser(null); setUserMode('create'); }
function selectUser(user) { selectedUser = user; fillUser(user); setUserMode('selected'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function renderUserList() {
  const query = normalizeUserSearch(document.querySelector('#userSearch').value);
  const visibleUsers = usersCache.filter((user) => !query || normalizeUserSearch(`${user.firstName} ${user.lastName} ${user.username} ${user.email} ${roleLabel(user.role)}`).includes(query));
  document.querySelector('#userSearchStatus').textContent = query ? `${visibleUsers.length} resultado${visibleUsers.length === 1 ? '' : 's'}` : `${visibleUsers.length} usuario${visibleUsers.length === 1 ? '' : 's'} registrado${visibleUsers.length === 1 ? '' : 's'}`;
  document.querySelector('#userList').innerHTML = visibleUsers.length ? visibleUsers.map((user) => `<button class="user-item${selectedUser?.username === user.username ? ' selected' : ''}" type="button" data-user="${escapeHtml(user.username)}"><span><b>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</b><span>@${escapeHtml(user.username)} · ${roleLabel(user.role)}</span></span><span class="user-item-arrow" aria-hidden="true">→</span></button>`).join('') : '<p class="user-empty">No se encontraron usuarios con ese criterio.</p>';
  document.querySelectorAll('.user-item').forEach((item) => item.addEventListener('click', () => selectUser(usersCache.find((user) => user.username === item.dataset.user))));
}
async function loadUsers(usernameToSelect) {
  const response = await fetch('/api/users', { headers: headers() });
  if (!response.ok) return;
  usersCache = await response.json();
  renderUserList();
  if (usernameToSelect) {
    const user = usersCache.find((item) => item.username === usernameToSelect);
    if (user) selectUser(user);
  }
}
function setupUsers() {
  document.querySelector('#userSearch').addEventListener('input', renderUserList);
  document.querySelectorAll('[data-user-password]').forEach((button) => button.addEventListener('click', () => { const input = document.querySelector(`#${button.dataset.userPassword}`); const visible = input.type === 'text'; input.type = visible ? 'password' : 'text'; button.textContent = visible ? 'Mostrar' : 'Ocultar'; }));
  document.querySelector('#userSubmit').addEventListener('click', () => { if (userMode === 'selected') setUserMode('editing'); else document.querySelector('#userForm').requestSubmit(); });
  document.querySelector('#cancelUserEdit').addEventListener('click', () => { if (userMode === 'editing' && selectedUser) { fillUser(selectedUser); setUserMode('selected'); } else resetUserForm(); });
  document.querySelector('#userForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (userMode === 'selected') return;
    const password = document.querySelector('#newPassword').value;
    const passwordConfirmation = document.querySelector('#repeatPassword').value;
    if (password !== passwordConfirmation) { document.querySelector('#userFeedback').textContent = 'Las contraseñas no coinciden.'; return; }
    const payload = { username: document.querySelector('#newUsername').value, email: document.querySelector('#newEmail').value, firstName: document.querySelector('#newFirstName').value, lastName: document.querySelector('#newLastName').value, phone: document.querySelector('#newPhone').value, birthDate: document.querySelector('#newBirthDate').value, role: document.querySelector('#newRole').value };
    if (password) { payload.password = password; payload.passwordConfirmation = passwordConfirmation; }
    const originalUsername = selectedUser?.username;
    const response = await fetch(originalUsername ? `/api/users/${encodeURIComponent(originalUsername)}` : '/api/users', { method: originalUsername ? 'PATCH' : 'POST', headers: headers(true), body: JSON.stringify(payload) });
    const result = await response.json();
    const successMessage = originalUsername ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.';
    document.querySelector('#userFeedback').textContent = response.ok ? successMessage : result.error;
    if (!response.ok) return;
    if (originalUsername === activeSession.username) localStorage.setItem('compralatino-session', JSON.stringify(result.user));
    selectedUser = result.user;
    await loadUsers(result.user.username);
    document.querySelector('#userFeedback').textContent = successMessage;
  });
  resetUserForm();
  loadUsers();
}
if (page === 'panel') loadDashboard(); if (page === 'productos') loadProducts(); if (page === 'usuarios') setupUsers();
