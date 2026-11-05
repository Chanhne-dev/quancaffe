import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import { kdsHub } from './sockets/kdsHub.js';
import { authMiddleware, requireRoles } from './middlewares/auth.js';
import { OrderController } from './controllers/orderController.js';
import { MenuController } from './controllers/menuController.js';
import { InventoryController } from './controllers/inventoryController.js';
import { ShiftController } from './controllers/shiftController.js';
import { ReportController } from './controllers/reportController.js';
import { CustomerController } from './controllers/customerController.js';

const app = express();
const server = http.createServer(app);

// Khởi tạo Database SQLite 23 bảng & Seed data
initDatabase();

// Khởi tạo WebSocket Server cho Real-time KDS & POS
kdsHub.init(server);

app.use(cors());
app.use(express.json());

// Phục vụ giao diện tĩnh Frontend (POS & KDS)
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// Logger
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Auth middleware để nhận diện vai trò người dùng
app.use('/api', authMiddleware);

// --- 1. MENU & TABLE ROUTES ---
app.get('/api/menu', MenuController.getMenu);
app.get('/api/tables', MenuController.getTables);
app.put('/api/tables/:id/status', MenuController.updateTableStatus);
app.post('/api/tables/transfer', MenuController.transferTable);

// --- 2. ORDER & BILLING ROUTES ---
app.post('/api/orders', OrderController.createOrder);
app.post('/api/orders/:id/pay', OrderController.payOrder);
app.get('/api/orders/kds', OrderController.getKdsTickets);
app.put('/api/orders/kds/items/:itemId/status', OrderController.updateKdsItemStatus);
app.get('/api/orders/:id/receipt', OrderController.getReceipt);
app.post('/api/orders/reconciliation', OrderController.reconcileOfflineOrders);

// --- 3. INVENTORY & RECIPES ---
app.get('/api/inventory/materials', InventoryController.getMaterials);
app.get('/api/inventory/recipes', InventoryController.getRecipes);

// --- 4. SHIFT & CASH DRAWER BALANCING ---
app.get('/api/shift/current', ShiftController.getCurrentShift);
app.post('/api/shift/open', ShiftController.openShift);
app.post('/api/shift/close', ShiftController.closeShift);
app.post('/api/shift/approve', requireRoles('QuanLy', 'ChuQuan'), ShiftController.approveShift);

// --- 5. REPORTING (P&L) ---
app.get('/api/reports/pnl', requireRoles('QuanLy', 'ChuQuan'), ReportController.getProfitAndLoss);

// --- 6. CUSTOMER & EMPLOYEES ---
app.get('/api/customers/search', CustomerController.searchByPhone);
app.get('/api/employees', CustomerController.getEmployees);

// Root health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    system: 'F&B POS & KDS Coffee Shop Management'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Coffee Shop F&B POS Web UI & API running on:`);
  console.log(` -> Web POS & KDS:  http://localhost:${PORT}`);
  console.log(` -> WebSocket Hub:  ws://localhost:${PORT}/ws`);
  console.log(` -> API Health:     http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

export { app, server };
