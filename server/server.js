const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { viewFor, redirectForLegacyView } = require('./controllers/page-controller');
const { createStore } = require('./data/store');
const { hashPassword, isBcryptHash, verifyPassword } = require('./passwords');

const publicDirectory = path.join(__dirname, '..', 'web');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

let store;
let server;

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    request.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 1048576) request.destroy(new Error('La solicitud supera el límite permitido.'));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(rawBody || '{}')); } catch { reject(new Error('Solicitud inválida.')); }
    });
    request.on('error', reject);
  });
}

function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function requestingUser(request) {
  const username = request.headers['x-compralatino-user'];
  if (!username) return null;
  return store.findUserByUsername(username);
}

async function requireRole(request, response, roles) {
  const user = await requestingUser(request);
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

function validRole(role) {
  return ['customer', 'seller', 'admin'].includes(role);
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  const legacyLocation = request.method === 'GET' ? redirectForLegacyView(url.pathname) : null;
  if (legacyLocation) {
    response.writeHead(302, { Location: legacyLocation });
    return response.end();
  }

  if (request.method === 'GET' && url.pathname === '/api/products') {
    const result = await store.getProducts({
      query: url.searchParams.get('q') || '',
      category: url.searchParams.get('category') || ''
    });
    return json(response, 200, result);
  }

  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    if (!await requireRole(request, response, ['admin'])) return;
    return json(response, 200, await store.getDashboard());
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const { username, password } = await readJson(request);
    const user = await store.findUserByUsername(username);
    if (!user || !await verifyPassword(password, user.passwordHash)) {
      return json(response, 401, { error: 'Usuario o contraseña incorrectos.' });
    }
    if (!isBcryptHash(user.passwordHash)) {
      user.passwordHash = await hashPassword(password);
      await store.updateUser(user.username, { passwordHash: user.passwordHash });
    }
    return json(response, 200, { user: publicUser(user) });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readJson(request);
    const fields = ['username', 'email', 'firstName', 'lastName', 'phone', 'birthDate', 'password'];
    if (fields.some((field) => !String(body[field] || '').trim())) {
      return json(response, 422, { error: 'Completa todos los campos requeridos.' });
    }
    if (await store.findUserByUsername(body.username)) return json(response, 409, { error: 'Ese nombre de usuario ya está en uso.' });
    if (await store.findUserByEmail(body.email)) return json(response, 409, { error: 'Ese correo ya está registrado.' });
    if (String(body.password).length < 8) return json(response, 422, { error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (body.passwordConfirmation !== undefined && body.password !== body.passwordConfirmation) {
      return json(response, 422, { error: 'Las contraseñas no coinciden.' });
    }

    const user = await store.createUser({
      id: randomUUID(),
      username: body.username.trim(),
      passwordHash: await hashPassword(body.password),
      email: body.email.trim(),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: body.phone.trim(),
      birthDate: body.birthDate,
      role: 'customer'
    });
    return json(response, 201, { user: publicUser(user) });
  }

  if (request.method === 'PATCH' && url.pathname === '/api/profile') {
    const currentUser = await requestingUser(request);
    if (!currentUser) return json(response, 401, { error: 'Debes iniciar sesión para actualizar tu perfil.' });

    const body = await readJson(request);
    const fields = ['username', 'email', 'firstName', 'lastName', 'phone', 'birthDate'];
    if (fields.some((field) => !String(body[field] || '').trim())) {
      return json(response, 422, { error: 'Completa todos los campos del perfil.' });
    }
    if (body.password && String(body.password).length < 8) {
      return json(response, 422, { error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (body.password && body.passwordConfirmation !== undefined && body.password !== body.passwordConfirmation) {
      return json(response, 422, { error: 'Las contraseñas nuevas no coinciden.' });
    }
    const usernameOwner = await store.findUserByUsername(body.username);
    if (usernameOwner && usernameOwner.username !== currentUser.username) {
      return json(response, 409, { error: 'Ese nombre de usuario ya está en uso.' });
    }
    const emailOwner = await store.findUserByEmail(body.email);
    if (emailOwner && emailOwner.username !== currentUser.username) {
      return json(response, 409, { error: 'Ese correo ya está registrado.' });
    }

    const changes = Object.fromEntries(fields.map((field) => [field, String(body[field]).trim()]));
    if (body.password) changes.passwordHash = await hashPassword(body.password);
    const user = await store.updateUser(currentUser.username, changes);
    return json(response, 200, { user: publicUser(user) });
  }

  if (request.method === 'GET' && url.pathname === '/api/users') {
    if (!await requireRole(request, response, ['admin'])) return;
    const users = await store.getUsers();
    return json(response, 200, users.map(publicUser));
  }

  if (request.method === 'POST' && url.pathname === '/api/users') {
    if (!await requireRole(request, response, ['admin'])) return;
    const body = await readJson(request);
    if (!body.username || !body.password || !body.email || !body.firstName || !body.lastName || !body.role) {
      return json(response, 422, { error: 'Completa los datos del usuario.' });
    }
    if (!validRole(body.role)) return json(response, 422, { error: 'Rol inválido.' });
    if (String(body.password).length < 8) return json(response, 422, { error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (body.passwordConfirmation !== undefined && body.password !== body.passwordConfirmation) {
      return json(response, 422, { error: 'Las contraseñas no coinciden.' });
    }
    if (await store.findUserByUsername(body.username) || await store.findUserByEmail(body.email)) {
      return json(response, 409, { error: 'El usuario o correo ya existe.' });
    }

    const user = await store.createUser({
      id: randomUUID(),
      username: body.username.trim(),
      passwordHash: await hashPassword(body.password),
      email: body.email.trim(),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: String(body.phone || '').trim(),
      birthDate: body.birthDate || '',
      role: body.role
    });
    return json(response, 201, { user: publicUser(user) });
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/users/')) {
    if (!await requireRole(request, response, ['admin'])) return;
    const username = decodeURIComponent(url.pathname.replace('/api/users/', ''));
    const currentUser = await store.findUserByUsername(username);
    if (!currentUser) return json(response, 404, { error: 'Usuario no encontrado.' });

    const body = await readJson(request);
    if (body.role !== undefined && !validRole(body.role)) return json(response, 422, { error: 'Rol inválido.' });
    const nextUsername = String(body.username || currentUser.username).trim();
    if (!nextUsername || !String(body.email || '').trim() || !String(body.firstName || '').trim() || !String(body.lastName || '').trim()) {
      return json(response, 422, { error: 'Completa los datos del usuario.' });
    }
    if (body.password && String(body.password).length < 8) {
      return json(response, 422, { error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (body.password && body.passwordConfirmation !== undefined && body.password !== body.passwordConfirmation) {
      return json(response, 422, { error: 'Las contraseñas nuevas no coinciden.' });
    }
    if (nextUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
      const usernameOwner = await store.findUserByUsername(nextUsername);
      if (usernameOwner) return json(response, 409, { error: 'Ese nombre de usuario ya está en uso.' });
    }
    if (body.email !== undefined) {
      const emailOwner = await store.findUserByEmail(body.email);
      if (emailOwner && emailOwner.username !== username) return json(response, 409, { error: 'Ese correo ya está registrado.' });
    }

    const changes = { username: nextUsername };
    for (const field of ['email', 'firstName', 'lastName', 'phone', 'birthDate', 'role']) {
      if (body[field] !== undefined) changes[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
    if (body.password) changes.passwordHash = await hashPassword(body.password);
    const user = await store.updateUser(username, changes);
    return json(response, 200, { user: publicUser(user) });
  }

  if (request.method === 'POST' && url.pathname === '/api/bids') {
    const user = await requestingUser(request);
    if (!user) return json(response, 401, { error: 'Debes iniciar sesión para hacer una oferta.' });
    const bid = await readJson(request);
    const amount = Number(bid.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(response, 422, { error: 'La puja debe ser un monto numérico válido.' });
    }
    const product = await store.placeBid(bid.productId, amount, user.id);
    if (!product) return json(response, 422, { error: 'La puja debe superar la oferta actual.' });
    return json(response, 201, { message: store.kind === 'sqlserver' ? 'Puja registrada.' : 'Puja registrada en modo demostración.', product });
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/products/')) {
    if (!await requireRole(request, response, ['admin', 'seller'])) return;
    const productId = decodeURIComponent(url.pathname.replace('/api/products/', ''));
    const body = await readJson(request);
    const changes = {};
    for (const field of ['title', 'category', 'badge']) {
      if (body[field] !== undefined) {
        const value = String(body[field]).trim();
        if (!value) return json(response, 422, { error: `${field} no puede estar vacío.` });
        changes[field] = value;
      }
    }
    for (const field of ['price', 'currentBid', 'shipping']) {
      if (body[field] === undefined) continue;
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < 0) return json(response, 422, { error: `${field} debe ser un número válido.` });
      changes[field] = value;
    }
    const product = await store.updateProduct(productId, changes);
    if (!product) return json(response, 404, { error: 'Producto no encontrado.' });
    return json(response, 200, { product });
  }

  if (request.method !== 'GET') return json(response, 405, { error: 'Método no permitido' });
  return serveFile(url.pathname, response);
}

async function start() {
  store = await createStore();
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('PORT debe ser un puerto TCP válido.');

  server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      console.error('Error al procesar la solicitud:', error.message);
      if (!response.headersSent) json(response, 500, { error: 'Ocurrió un error interno.' });
      else response.end();
    });
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once('error', onError);
    server.listen(port, () => {
      server.off('error', onError);
      resolve();
    });
  });
  console.log(`CompraLatino disponible en http://localhost:${port} (${store.kind === 'sqlserver' ? 'SQL Server conectado' : 'modo demostración'})`);
}

async function shutdown() {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  if (store) await store.close();
}

process.once('SIGINT', () => shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => shutdown().finally(() => process.exit(0)));

start().catch((error) => {
  console.error(`No fue posible iniciar CompraLatino: ${error.message}`);
  process.exitCode = 1;
});
