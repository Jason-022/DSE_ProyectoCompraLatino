const cleanViews = {
  '/': '/index.html',
  '/acceso': '/acceso.html',
  '/perfil': '/perfil.html',
  '/administracion': '/admin.html',
  '/administracion/usuarios': '/usuarios.html',
  '/administracion/productos': '/productos.html',
  '/administracion/ventas': '/ventas.html',
  '/administracion/analiticas': '/analiticas.html',
  '/administracion/transacciones': '/transacciones.html',
  '/administracion/salud-api': '/salud-api.html',
  '/administracion/reportes': '/reportes.html',
  '/administracion/configuracion': '/configuracion.html'
};

const legacyRedirects = Object.fromEntries(Object.entries(cleanViews)
  .filter(([route]) => route !== '/')
  .map(([route, view]) => [view, route]));

function viewFor(pathname) { return cleanViews[pathname] || pathname; }
function redirectForLegacyView(pathname) { return legacyRedirects[pathname] || null; }

module.exports = { viewFor, redirectForLegacyView };
