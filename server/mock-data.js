const products = [
  {
    id: 'ya-1001',
    title: 'Cámara Fujifilm X100V Silver',
    category: 'Fotografía',
    price: 1049,
    currentBid: 896,
    bids: 18,
    endsIn: '02h 18m',
    shipping: 29,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
    badge: 'Subasta activa'
  },
  {
    id: 'ya-1002',
    title: 'Nintendo Game Boy Advance SP',
    category: 'Coleccionables',
    price: 188,
    currentBid: 142,
    bids: 9,
    endsIn: '05h 42m',
    shipping: 18,
    image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80',
    badge: 'Subasta activa'
  },
  {
    id: 'ya-1003',
    title: 'Reloj Seiko 5 Sports automático',
    category: 'Relojes',
    price: 298,
    currentBid: 236,
    bids: 14,
    endsIn: '01d 03h',
    shipping: 22,
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80',
    badge: 'Envío verificado'
  },
  {
    id: 'ya-1004',
    title: 'Set de té japonés artesanal',
    category: 'Hogar',
    price: 86,
    currentBid: 61,
    bids: 6,
    endsIn: '08h 11m',
    shipping: 16,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
    badge: 'Oferta destacada'
  },
  {
    id: 'ya-1005',
    title: 'Sony Walkman WM-EX190',
    category: 'Tecnología vintage',
    price: 119,
    currentBid: 84,
    bids: 11,
    endsIn: '12h 25m',
    shipping: 20,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    badge: 'Subasta activa'
  },
  {
    id: 'ya-1006',
    title: 'Figura Studio Ghibli Totoro',
    category: 'Coleccionables',
    price: 74,
    currentBid: 52,
    bids: 7,
    endsIn: '01d 11h',
    shipping: 14,
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80',
    badge: 'Recomendado'
  }
];

const dashboard = {
  metrics: [
    { label: 'Ventas este mes', value: '$24,860', delta: '+12.5%' },
    { label: 'Pujas activas', value: '186', delta: '+8.2%' },
    { label: 'Usuarios nuevos', value: '428', delta: '+18.1%' },
    { label: 'Conversión', value: '6.8%', delta: '+1.4%' }
  ],
  categories: [
    { name: 'Tecnología', value: 42 },
    { name: 'Coleccionables', value: 31 },
    { name: 'Moda', value: 17 },
    { name: 'Hogar', value: 10 }
  ]
};

const users = [
  {
    id: 'usr-admin-dse', username: 'adminDSE', passwordHash: '$2b$12$ddMvojWaBc5fnnMzKLuwVueGFCyCZ4o2.I7l8qbC4Hbf4k0cAjzHS', email: 'admin.dse@compralatino.demo',
    firstName: 'Administrador', lastName: 'DSE', phone: '7000-0001', birthDate: '1995-01-01', role: 'admin'
  },
  {
    id: 'usr-admin-user', username: 'adminUser', passwordHash: '$2b$12$dl0HQkkbRYAPuySqKf9PsuvbXRjUd6wcQPiSepDJ.3EfSx5ZRauaC', email: 'admin.user@compralatino.demo',
    firstName: 'Administrador', lastName: 'Usuarios', phone: '7000-0002', birthDate: '1994-02-02', role: 'admin'
  },
  {
    id: 'usr-admin-sales', username: 'adminSales', passwordHash: '$2b$12$EhZwnL6jmLwQ0mId/MxMSumK93JXugvS9cUlC4kyc4BFG/z6gvs5m', email: 'admin.sales@compralatino.demo',
    firstName: 'Administrador', lastName: 'Ventas', phone: '7000-0003', birthDate: '1993-03-03', role: 'admin'
  },
  {
    id: 'usr-customer-demo', username: 'clienteDemo', passwordHash: '$2b$12$MFyAiYS4zAMS/GNiA/xrx.hXViAzYrDSpMt9qmhmfv9ngRT/CyNEO', email: 'cliente.demo@compralatino.demo',
    firstName: 'Cliente', lastName: 'Demo', phone: '7000-0004', birthDate: '1998-05-12', role: 'customer'
  },
  {
    id: 'usr-seller-demo', username: 'vendedorDemo', passwordHash: '$2b$12$D6YdHkLwDyziCYROmVJKyenor5zEfPHBSgvwKGL0cKp4DqgNuK.g6', email: 'vendedor.demo@compralatino.demo',
    firstName: 'Vendedor', lastName: 'Demo', phone: '7000-0005', birthDate: '1992-06-15', role: 'seller'
  }
];

const sales = [];

module.exports = { products, dashboard, users, sales };
