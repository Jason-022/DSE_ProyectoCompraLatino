const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID, createHash } = require('crypto');
const { products, dashboard, users } = require('./mock-data');
const { viewFor, redirectForLegacyView } = require('./controllers/page-controller');
const { databaseEnabled } = require('./config/database');

const publicDirectory = path.join(__dirname, '..', 'web');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    request.on('data', (chunk) => { rawBody += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(rawBody || '{}')); } catch { reject(new Error('Solicitud inválida.')); }
    });
  });
}

function hashPassword(password) { return createHash('sha256').update(String(password)).digest('hex'); }

function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function requestingUser(request) {
  const username = request.headers['x-compralatino-user'];
  return users.find((user) => user.username === username);
}

function requireRole(request, response, roles) {
  const user = requestingUser(request);
  if (!user || !roles.includes(user.role)) {
    json(response, 403, { error: 'No tienes permisos para realizar esta acción.' });
    return null;
  }
  return user;
}

function serveFile(requestPath, response) {
  const requested = viewFor(requestPath);
  const safePath = path.normalize(requested).replace(/^([.][.][\\/])+/, '');
  const filePath = path.join(publicDirectory, safePath);

  if (!filePath.startsWith(publicDirectory)) return json(response, 403, { error: 'Acceso no permitido' });

  fs.readFile(filePath, (error, content) => {
    if (error) return json(response, 404, { error: 'Recurso no encontrado' });
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  const legacyLocation = request.method === 'GET' ? redirectForLegacyView(url.pathname) : null;
  if (legacyLocation) {
    response.writeHead(302, { Location: legacyLocation });
    return response.end();
  }

  if (request.method === 'GET' && url.pathname === '/api/products') {
    const query = (url.searchParams.get('q') || '').toLowerCase();
    const category = url.searchParams.get('category');
    const result = products.filter((product) =>
      (!query || `${product.title} ${product.category}`.toLowerCase().includes(query)) &&
      (!category || category === 'Todos' || product.category === category)
    );
    return json(response, 200, result);
  }

  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    if (!requireRole(request, response, ['admin'])) return;
    return json(response, 200, dashboard);
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    return readJson(request).then(({ username, password }) => {
      const user = users.find((item) => item.username.toLowerCase() === String(username).trim().toLowerCase() && item.passwordHash === hashPassword(password));
      if (!user) return json(response, 401, { error: 'Usuario o contraseña incorrectos.' });
      return json(response, 200, { user: publicUser(user) });
    }).catch((error) => json(response, 400, { error: error.message }));
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    return readJson(request).then((body) => {
      const fields = ['username', 'email', 'firstName', 'lastName', 'phone', 'birthDate', 'password'];
      if (fields.some((field) => !String(body[field] || '').trim())) return json(response, 422, { error: 'Completa todos los campos requeridos.' });
      if (users.some((user) => user.username.toLowerCase() === body.username.trim().toLowerCase())) return json(response, 409, { error: 'Ese nombre de usuario ya está en uso.' });
      if (users.some((user) => user.email.toLowerCase() === body.email.trim().toLowerCase())) return json(response, 409, { error: 'Ese correo ya está registrado.' });
      if (String(body.password).length < 8) return json(response, 422, { error: 'La contraseña debe tener al menos 8 caracteres.' });
      const user = { id: randomUUID(), username: body.username.trim(), passwordHash: hashPassword(body.password), email: body.email.trim(), firstName: body.firstName.trim(), lastName: body.lastName.trim(), phone: body.phone.trim(), birthDate: body.birthDate, role: 'customer' };
      users.push(user);
      return json(response, 201, { user: publicUser(user) });
    }).catch((error) => json(response, 400, { error: error.message }));
  }

  if (request.method === 'PATCH' && url.pathname === '/api/profile') {
    const user = requestingUser(request);
    if (!user) return json(response, 401, { error: 'Debes iniciar sesión para actualizar tu perfil.' });
    return readJson(request).then((body) => {
      const fields = ['email', 'firstName', 'lastName', 'phone', 'birthDate'];
      if (fields.some((field) => !String(body[field] || '').trim())) return json(response, 422, { error: 'Completa todos los campos del perfil.' });
      if (users.some((item) => item.username !== user.username && item.email.toLowerCase() === body.email.trim().toLowerCase())) return json(response, 409, { error: 'Ese correo ya está registrado.' });
      fields.forEach((field) => { user[field] = String(body[field]).trim(); });
      if (body.password) {
        if (String(body.password).length < 8) return json(response, 422, { error: 'La contraseña debe tener al menos 8 caracteres.' });
        user.passwordHash = hashPassword(body.password);
      }
      return json(response, 200, { user: publicUser(user) });
    }).catch((error) => json(response, 400, { error: error.message }));
  }

  if (request.method === 'GET' && url.pathname === '/api/users') {
    if (!requireRole(request, response, ['admin'])) return;
    return json(response, 200, users.map(publicUser));
  }

  if (request.method === 'POST' && url.pathname === '/api/users') {
    if (!requireRole(request, response, ['admin'])) return;
    return readJson(request).then((body) => {
      if (!body.username || !body.password || !body.email || !body.firstName || !body.lastName || !body.role) return json(response, 422, { error: 'Completa los datos del usuario.' });
      if (!['customer', 'seller', 'admin'].includes(body.role)) return json(response, 422, { error: 'Rol inválido.' });
      if (users.some((user) => user.username.toLowerCase() === body.username.toLowerCase() || user.email.toLowerCase() === body.email.toLowerCase())) return json(response, 409, { error: 'El usuario o correo ya existe.' });
      const user = { id: randomUUID(), username: body.username.trim(), passwordHash: hashPassword(body.password), email: body.email.trim(), firstName: body.firstName.trim(), lastName: body.lastName.trim(), phone: body.phone || '', birthDate: body.birthDate || '', role: body.role };
      users.push(user);
      return json(response, 201, { user: publicUser(user) });
    }).catch((error) => json(response, 400, { error: error.message }));
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/users/')) {
    if (!requireRole(request, response, ['admin'])) return;
    const username = decodeURIComponent(url.pathname.replace('/api/users/', ''));
    return readJson(request).then((body) => {
      const user = users.find((item) => item.username === username);
      if (!user) return json(response, 404, { error: 'Usuario no encontrado.' });
      ['email', 'firstName', 'lastName', 'phone', 'birthDate', 'role'].forEach((field) => { if (body[field] !== undefined) user[field] = body[field]; });
      if (body.password) user.passwordHash = hashPassword(body.password);
      return json(response, 200, { user: publicUser(user) });
    }).catch((error) => json(response, 400, { error: error.message }));
  }

  if (request.method === 'POST' && url.pathname === '/api/bids') {
    if (!requestingUser(request)) return json(response, 401, { error: 'Debes iniciar sesión para hacer una oferta.' });
    return readJson(request).then((bid) => {
        const product = products.find((item) => item.id === bid.productId);
        if (!product || Number(bid.amount) <= product.currentBid) return json(response, 422, { error: 'La puja debe superar la oferta actual.' });
        product.currentBid = Number(bid.amount);
        product.bids += 1;
        return json(response, 201, { message: 'Puja registrada en modo demostración.', product });
    }).catch((error) => json(response, 400, { error: error.message }));
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/products/')) {
    if (!requireRole(request, response, ['admin', 'seller'])) return;
    const productId = decodeURIComponent(url.pathname.replace('/api/products/', ''));
    return readJson(request).then((body) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return json(response, 404, { error: 'Producto no encontrado.' });
      ['title', 'category', 'price', 'currentBid', 'shipping', 'badge'].forEach((field) => { if (body[field] !== undefined) product[field] = body[field]; });
      return json(response, 200, { product });
    }).catch((error) => json(response, 400, { error: error.message }));
  }

  if (request.method !== 'GET') return json(response, 405, { error: 'Método no permitido' });
  serveFile(url.pathname, response);
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`CompraLatino disponible en http://localhost:${port} (${databaseEnabled() ? 'PostgreSQL configurado' : 'modo demostración'})`));
