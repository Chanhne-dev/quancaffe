// =====================================================================================
// FRONTEND CLIENT APPLICATION (CÀ PHÊ PHỐ XANH - MULTI-TAB F&B POS & KDS)
// =====================================================================================

const AppState = {
  currentRole: 'ThuNgan', // ChuQuan, QuanLy, ThuNgan, PhaChe, PhucVu
  currentUser: { maNhanVien: 'NV03', hoTen: 'Lê Thị Mai (Thu ngân)', tenDangNhap: 'cashier' },
  isSimulatedOffline: false,
  isSidebarCollapsed: false,
  
  // HỆ THỐNG TAB ĐA NHIỆM CHO TỪNG BÀN (DYNAMIC MULTI-TAB WORKSPACE)
  posTabs: [
    { id: 'floor', title: 'Sơ Đồ Toàn Quán', type: 'floor' }
  ],
  activePosTabId: 'floor',
  takeawayCounter: 1,

  // Dữ liệu danh mục & nhà hàng
  menuGroups: [],
  menuItems: [],
  tables: [],
  areas: [],
  kdsTickets: [],
  currentShift: null,
  stockAlerts: [],
  socket: null,
  activeMainTab: 'pos',
  activeCategory: 'all'
};

// =====================================================================================
// KHỞI TẠO HỆ THỐNG
// =====================================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initClock();
  initWebSocket();
  initEventHandlers();
  await loadInitialData();
  applyRolePermissions(AppState.currentRole);
  renderPosTableTabs();
  renderFloorTables();
});

// Đồng hồ thời gian thực
function initClock() {
  const clockEl = document.getElementById('live-clock');
  const dateEl = document.getElementById('current-date');
  setInterval(() => {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('vi-VN');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('vi-VN');
  }, 1000);
}

// =====================================================================================
// WEBSOCKET REAL-TIME SYNC (KDS & ORDER UPDATES)
// =====================================================================================
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    AppState.socket = new WebSocket(wsUrl);

    AppState.socket.onopen = () => {
      console.log('[WS] Đã kết nối tới Real-time KDS Hub');
      updateNetworkBadge(true);
    };

    AppState.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleSocketMessage(msg);
      } catch (e) {
        console.error('[WS] Parse error', e);
      }
    };

    AppState.socket.onclose = () => {
      console.warn('[WS] Mất kết nối. Đang thử lại sau 3s...');
      updateNetworkBadge(false);
      setTimeout(initWebSocket, 3000);
    };
  } catch (err) {
    console.error('[WS] Setup failed', err);
    updateNetworkBadge(false);
  }
}

function handleSocketMessage(msg) {
  console.log('[WS Event]:', msg.type, msg.payload);

  switch (msg.type) {
    case 'ORDER_NEW':
      if (window.playNotificationChime) window.playNotificationChime();
      loadKdsTickets();
      loadTables();
      loadShiftData();
      showToast(`Có đơn hàng mới: ${msg.payload.soHoaDon} (${msg.payload.maBan || 'Mang đi'})`, 'success');
      break;

    case 'KDS_ITEM_STATUS':
      loadKdsTickets();
      break;

    case 'KDS_ORDER_COMPLETED':
      if (window.playNotificationChime) window.playNotificationChime();
      showToast(`ĐỒ UỐNG ĐÃ HOÀN TẤT: ${msg.payload.soHoaDon} (${msg.payload.maBan || 'Mang đi'}) - Mời phục vụ lấy đồ!`, 'success');
      loadKdsTickets();
      break;

    case 'STOCK_ALERT':
      handleStockAlert(msg.payload);
      break;

    case 'TABLE_UPDATED':
      loadTables();
      break;

    case 'SHIFT_CHANGED':
      loadShiftData();
      break;
  }
}

function handleStockAlert(alert) {
  AppState.stockAlerts.push(alert);
  const badge = document.getElementById('badge-stock-count');
  if (badge) {
    badge.textContent = AppState.stockAlerts.length;
    badge.classList.remove('hidden');
  }
  showToast(`CẢNH BÁO TỒN KHO: ${alert.tenVatTu} chỉ còn ${alert.soLuongTonHienTai} ${alert.donViTinh} (ngưỡng tối thiểu: ${alert.mucToiThieuCanCanhBao})`, 'warning');
}

// =====================================================================================
// DATA LOADING
// =====================================================================================
async function loadInitialData() {
  await Promise.all([
    loadMenu(),
    loadTables(),
    loadShiftData(),
    loadKdsTickets()
  ]);
}

async function loadMenu() {
  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    if (data.success) {
      AppState.menuGroups = data.data.groups;
      AppState.menuItems = data.data.items;
      renderCategories();
      renderMenuItems();
    }
  } catch (err) {
    console.error('Lỗi nạp menu', err);
  }
}

async function loadTables() {
  try {
    const res = await fetch('/api/tables');
    const data = await res.json();
    if (data.success) {
      AppState.areas = data.data.areas;
      AppState.tables = data.data.tables;
      renderFloorAreaFilters();
      renderFloorTables();
    }
  } catch (err) {
    console.error('Lỗi nạp danh sách bàn', err);
  }
}

async function loadShiftData() {
  try {
    const res = await fetch('/api/shift/current');
    const data = await res.json();
    if (data.success && data.data) {
      AppState.currentShift = data.data;
      updateShiftUI(data.data);
    }
  } catch (err) {
    console.error('Lỗi nạp ca làm việc', err);
  }
}

async function loadKdsTickets() {
  try {
    const res = await fetch('/api/orders/kds');
    const data = await res.json();
    if (data.success) {
      AppState.kdsTickets = data.data;
      renderKdsTickets();
      const badge = document.getElementById('kds-pending-badge');
      if (badge) badge.textContent = AppState.kdsTickets.length;
    }
  } catch (err) {
    console.error('Lỗi nạp KDS', err);
  }
}

// =====================================================================================
// CƠ CHẾ TAB ĐA NHIỆM CHO TỪNG BÀN (DYNAMIC MULTI-TAB WORKSPACE)
// =====================================================================================

// Mở một tab bàn cụ thể (Ví dụ: Bàn 01)
function openTableTab(tableId) {
  const table = AppState.tables.find(t => t.MaBan === tableId);
  const tabId = `table_${tableId}`;

  // Kiểm tra xem tab đã mở chưa
  let existingTab = AppState.posTabs.find(t => t.id === tabId);
  if (!existingTab) {
    existingTab = {
      id: tabId,
      type: 'table',
      tableId: tableId,
      title: table ? table.TenBan : `Bàn ${tableId}`,
      tableName: table ? table.TenBan : `Bàn ${tableId}`,
      areaName: table ? table.TenKhuVuc : 'Tầng 1',
      status: table ? table.TrangThai : 'Trong',
      cart: [],
      customer: null,
      openTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      currentOrderCode: `HD_${Date.now().toString().slice(-6)}`
    };
    AppState.posTabs.push(existingTab);
  }

  // Chuyển tiêu điểm sang tab này
  switchPosTab(tabId);
}

// Mở tab đơn mang đi mới
function openTakeawayTab() {
  const count = AppState.takeawayCounter++;
  const tabId = `takeaway_${count}`;
  const newTab = {
    id: tabId,
    type: 'takeaway',
    title: `🛍️ Mang Đi #${count}`,
    tableName: `Đơn Mang Đi #${count}`,
    areaName: 'Quầy Thu Ngân',
    status: 'Trong',
    cart: [],
    customer: null,
    openTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    currentOrderCode: `HD_MD_${Date.now().toString().slice(-4)}`
  };
  AppState.posTabs.push(newTab);
  switchPosTab(tabId);
}

// Đóng một tab bàn
function closePosTab(tabId, event) {
  if (event) event.stopPropagation();

  // Không cho phép đóng tab sơ đồ toàn quán
  if (tabId === 'floor') return;

  const idx = AppState.posTabs.findIndex(t => t.id === tabId);
  if (idx !== -1) {
    AppState.posTabs.splice(idx, 1);
  }

  // Nếu đang đứng ở tab vừa đóng, chuyển sang tab trước đó hoặc 'floor'
  if (AppState.activePosTabId === tabId) {
    const nextTab = AppState.posTabs[Math.max(0, idx - 1)] || AppState.posTabs[0];
    switchPosTab(nextTab.id);
  } else {
    renderPosTableTabs();
  }
}

// Chuyển đổi tab đang xem
function switchPosTab(tabId) {
  AppState.activePosTabId = tabId;
  renderPosTableTabs();

  const floorView = document.getElementById('view-floor-map');
  const tableView = document.getElementById('view-table-detail');

  if (tabId === 'floor') {
    floorView.classList.remove('hidden');
    floorView.classList.remove('animate-fade-in');
    void floorView.offsetWidth; // trigger reflow
    floorView.classList.add('animate-fade-in');

    tableView.classList.add('hidden');
    renderFloorTables();
  } else {
    floorView.classList.add('hidden');

    tableView.classList.remove('hidden');
    tableView.classList.remove('animate-fade-in');
    void tableView.offsetWidth; // trigger reflow
    tableView.classList.add('animate-fade-in');

    renderCurrentTabDetail();
  }
}

// Render thanh Tab bàn ngang
function renderPosTableTabs() {
  const container = document.getElementById('pos-table-tabs-list');
  if (!container) return;

  let html = '';
  AppState.posTabs.forEach(tab => {
    const isActive = AppState.activePosTabId === tab.id;
    const isFloor = tab.id === 'floor';
    const cartCount = tab.cart ? tab.cart.reduce((sum, item) => sum + item.soLuong, 0) : 0;
    const badge = cartCount > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">${cartCount}</span>` : '';

    let tabClass = isActive
      ? 'border-2 border-amber-600 bg-amber-50 text-amber-900 shadow-xs font-bold'
      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold';

    let iconHtml = isFloor 
      ? '<i data-lucide="layout-grid" class="w-3.5 h-3.5 text-amber-700"></i>' 
      : tab.type === 'takeaway' 
      ? '<i data-lucide="shopping-bag" class="w-3.5 h-3.5 text-emerald-600"></i>' 
      : '<i data-lucide="coffee" class="w-3.5 h-3.5 text-amber-700"></i>';

    html += `
      <div class="pos-table-tab shrink-0 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer select-none ${tabClass}" data-tab-id="${tab.id}">
        ${iconHtml}
        <span>${tab.title}</span>
        ${badge}
        ${!isFloor ? `<button class="btn-close-tab p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-rose-600 ml-1 transition" data-close-id="${tab.id}">✕</button>` : ''}
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  // Gắn sự kiện chuyển tab
  container.querySelectorAll('.pos-table-tab').forEach(tabEl => {
    tabEl.addEventListener('click', (e) => {
      // Nếu click vào nút x đóng tab thì bỏ qua
      if (e.target.closest('.btn-close-tab')) return;
      const tabId = tabEl.getAttribute('data-tab-id');
      switchPosTab(tabId);
    });
  });

  // Gắn sự kiện đóng tab
  container.querySelectorAll('.btn-close-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.getAttribute('data-close-id');
      closePosTab(tabId, e);
    });
  });
}

// Render nội dung của Tab Bàn Đang Chọn
function renderCurrentTabDetail() {
  const currentTab = AppState.posTabs.find(t => t.id === AppState.activePosTabId);
  if (!currentTab || currentTab.id === 'floor') return;

  // Cập nhật Header bàn
  document.getElementById('current-tab-table-title').textContent = `${currentTab.tableName} (${currentTab.areaName})`;
  document.getElementById('current-tab-table-time').textContent = currentTab.openTime;
  document.getElementById('current-tab-order-code').textContent = currentTab.currentOrderCode;

  const statusEl = document.getElementById('current-tab-table-status');
  if (currentTab.cart && currentTab.cart.length > 0) {
    statusEl.textContent = 'Đang chọn món';
    statusEl.className = 'font-bold text-amber-600';
  } else {
    statusEl.textContent = 'Bàn trống';
    statusEl.className = 'font-bold text-emerald-600';
  }

  // Render giỏ hàng của bàn này
  renderTabCart();
  renderMenuItems();
}

// =====================================================================================
// SƠ ĐỒ TOÀN QUÁN (FLOOR MAP OVERVIEW)
// =====================================================================================
let selectedFloorArea = 'all';

function renderFloorAreaFilters() {
  const container = document.getElementById('floor-area-filter-container');
  if (!container) return;

  let html = `<button class="floor-area-btn px-3 py-1 rounded-lg text-xs font-bold ${selectedFloorArea === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}" data-area="all">Tất cả khu vực</button>`;
  AppState.areas.forEach(a => {
    html += `<button class="floor-area-btn px-3 py-1 rounded-lg text-xs font-bold ${selectedFloorArea === a.MaKhuVuc ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}" data-area="${a.MaKhuVuc}">${a.TenKhuVuc}</button>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.floor-area-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFloorArea = btn.getAttribute('data-area');
      renderFloorAreaFilters();
      renderFloorTables();
    });
  });
}

function renderFloorTables() {
  const container = document.getElementById('floor-tables-grid');
  if (!container) return;

  const filtered = selectedFloorArea === 'all'
    ? AppState.tables
    : AppState.tables.filter(t => t.MaKhuVuc === selectedFloorArea);

  let html = '';
  filtered.forEach(tbl => {
    // Kiểm tra bàn có đang mở tab không
    const isTabOpen = AppState.posTabs.some(t => t.tableId === tbl.MaBan);

    let statusBorder = 'border-emerald-200 bg-emerald-50/50 text-emerald-800';
    let statusDot = 'bg-emerald-500';
    let statusText = 'Trống';

    if (tbl.TrangThai === 'CoKhach') {
      statusBorder = 'border-rose-200 bg-rose-50/50 text-rose-800';
      statusDot = 'bg-rose-500';
      statusText = 'Có khách';
    } else if (tbl.TrangThai === 'DatTruoc') {
      statusBorder = 'border-sky-200 bg-sky-50/50 text-sky-800';
      statusDot = 'bg-sky-500';
      statusText = 'Đặt trước';
    }

    // Tách tên khu vực ngắn gọn (tránh tràn chữ và đè lên tiêu đề)
    const shortArea = tbl.TenKhuVuc.includes('Tầng 1') ? 'Tầng 1'
                    : tbl.TenKhuVuc.includes('Tầng 2') ? 'Tầng 2'
                    : tbl.TenKhuVuc.includes('Sân Vườn') ? 'Sân Vườn'
                    : tbl.TenKhuVuc;

    html += `
      <div class="floor-table-card hover-lift p-3.5 rounded-2xl border-2 ${statusBorder} hover:border-amber-500 hover:shadow-md cursor-pointer transition flex flex-col justify-between min-h-[120px] shadow-xs relative" data-table-id="${tbl.MaBan}">
        <!-- Hàng 1: Trạng thái & Huy hiệu Đang Mở Tab (Tách biệt rõ ràng) -->
        <div class="flex items-center justify-between gap-1">
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="w-2.5 h-2.5 rounded-full ${statusDot}"></span>
            <span class="text-xs font-bold">${statusText}</span>
          </div>
          ${isTabOpen ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-600 text-white shadow-xs shrink-0">Đang Mở</span>' : ''}
        </div>

        <!-- Hàng 2: Tên bàn -->
        <div class="my-1">
          <h3 class="font-extrabold text-sm text-slate-900 tracking-tight leading-snug">${tbl.TenBan}</h3>
        </div>

        <!-- Hàng 3: Khu vực & Số ghế -->
        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 font-medium">
          <span class="truncate">${shortArea}</span>
          <span class="font-bold font-mono text-slate-700">${tbl.SoGhe} ghế</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.floor-table-card').forEach(el => {
    el.addEventListener('click', () => {
      const tableId = el.getAttribute('data-table-id');
      openTableTab(tableId);
    });
  });
}

// =====================================================================================
// MENU CATEGORIES & ITEMS RENDERING
// =====================================================================================
function renderCategories() {
  const container = document.getElementById('menu-categories-container');
  if (!container) return;

  let html = `<button class="cat-btn shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${AppState.activeCategory === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}" data-cat="all">Tất cả món</button>`;
  AppState.menuGroups.forEach(g => {
    const isActive = AppState.activeCategory === g.MaNhom;
    html += `<button class="cat-btn shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${isActive ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}" data-cat="${g.MaNhom}">${g.TenNhom}</button>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.activeCategory = btn.getAttribute('data-cat');
      renderCategories();
      renderMenuItems();
    });
  });
}

function renderMenuItems() {
  const container = document.getElementById('menu-items-grid');
  if (!container) return;

  const searchVal = (document.getElementById('menu-search-input')?.value || '').toLowerCase();

  const filtered = AppState.menuItems.filter(item => {
    const matchCat = AppState.activeCategory === 'all' || item.MaNhom === AppState.activeCategory;
    const matchSearch = item.TenMon.toLowerCase().includes(searchVal);
    return matchCat && matchSearch;
  });

  // Fallback SVG nếu hình ảnh từ internet không tải được
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150' fill='%23fef3c7'><rect width='200' height='150' fill='%23fef3c7'/><circle cx='100' cy='65' r='32' fill='%23d97706'/><text x='100' y='75' font-size='26' fill='%23ffffff' text-anchor='middle'>☕</text><text x='100' y='125' font-size='12' fill='%2392400e' font-weight='bold' text-anchor='middle'>PHỐ XANH</text></svg>`;

  let html = '';
  filtered.forEach(item => {
    html += `
      <div class="menu-item-card group hover-lift bg-white hover:border-amber-400 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition shadow-xs" data-item-id="${item.MaMon}">
        <!-- Ảnh món chất lượng cao (High-Res Food Photo với Fallback an toàn) -->
        <div class="relative w-full h-32 rounded-xl overflow-hidden mb-2.5 bg-slate-100 border border-slate-100">
          <img src="${item.HinhAnh}" alt="${item.TenMon}" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null; this.src='${fallbackSvg}';">
          <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-xs text-amber-800 shadow-xs border border-white/40">${item.DonViTinh}</span>
        </div>
        
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <h4 class="font-bold text-xs text-slate-900 group-hover:text-amber-800 transition line-clamp-1 leading-snug">${item.TenMon}</h4>
          </div>
          <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span class="font-black text-xs text-amber-700 font-mono">${Number(item.GiaBanHienHanh).toLocaleString('vi-VN')} đ</span>
            <button class="w-6 h-6 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-90 text-white flex items-center justify-center text-xs font-bold shadow-xs transition">+</button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.menu-item-card').forEach(el => {
    el.addEventListener('click', () => {
      const maMon = el.getAttribute('data-item-id');
      addItemToCurrentTab(maMon);
    });
  });
}

// =====================================================================================
// ORDER & CART MANAGEMENT CHO TỪNG BÀN RIÊNG BIỆT
// =====================================================================================
function getCurrentTab() {
  return AppState.posTabs.find(t => t.id === AppState.activePosTabId);
}

function addItemToCurrentTab(maMon) {
  const currentTab = getCurrentTab();
  if (!currentTab || currentTab.id === 'floor') return;

  const item = AppState.menuItems.find(m => m.MaMon === maMon);
  if (!item) return;

  const existing = currentTab.cart.find(c => c.maMon === maMon && !c.ghiChuTopping);
  if (existing) {
    existing.soLuong += 1;
  } else {
    currentTab.cart.push({
      maMon: item.MaMon,
      tenMon: item.TenMon,
      donGia: item.GiaBanHienHanh,
      soLuong: 1,
      ghiChuTopping: ''
    });
  }

  renderTabCart();
  renderPosTableTabs();
}

function renderTabCart() {
  const currentTab = getCurrentTab();
  const container = document.getElementById('tab-cart-items-container');
  if (!container) return;

  if (!currentTab || currentTab.cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-14 text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 text-2xl shadow-xs">☕</div>
        <p class="font-medium text-slate-600">Bàn này chưa có món nào.</p>
        <p class="text-[11px] text-slate-400">Chạm vào món bên trái để gọi đồ uống</p>
      </div>
    `;
    updateTabCartTotals();
    return;
  }

  let html = '';
  currentTab.cart.forEach((item, idx) => {
    const thanhTien = item.soLuong * item.donGia;
    html += `
      <div class="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5 shadow-xs animate-item-in">
        <div class="flex items-center justify-between">
          <span class="font-bold text-xs text-slate-900">${item.tenMon}</span>
          <span class="font-mono font-bold text-xs text-amber-700">${Number(thanhTien).toLocaleString('vi-VN')} đ</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            <button class="cart-qty-btn px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold" data-idx="${idx}" data-delta="-1">-</button>
            <span class="w-6 text-center font-bold font-mono text-slate-800">${item.soLuong}</span>
            <button class="cart-qty-btn px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold" data-idx="${idx}" data-delta="1">+</button>
          </div>
          <button class="cart-del-btn text-rose-500 hover:text-rose-700 text-[11px] font-semibold" data-idx="${idx}">Xóa</button>
        </div>
        <input type="text" placeholder="Đá, đường, size, topping..." value="${item.ghiChuTopping}" data-idx="${idx}" class="cart-note-input w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-amber-500 focus:bg-white">
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      const delta = Number(btn.getAttribute('data-delta'));
      currentTab.cart[idx].soLuong += delta;
      if (currentTab.cart[idx].soLuong <= 0) {
        currentTab.cart.splice(idx, 1);
      }
      renderTabCart();
      renderPosTableTabs();
    });
  });

  container.querySelectorAll('.cart-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      currentTab.cart.splice(idx, 1);
      renderTabCart();
      renderPosTableTabs();
    });
  });

  container.querySelectorAll('.cart-note-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const idx = Number(inp.getAttribute('data-idx'));
      currentTab.cart[idx].ghiChuTopping = inp.value;
    });
  });

  updateTabCartTotals();
}

function updateTabCartTotals() {
  const currentTab = getCurrentTab();
  if (!currentTab) return;

  let subtotal = 0;
  currentTab.cart.forEach(item => {
    subtotal += item.donGia * item.soLuong;
  });

  let discount = 0;
  if (currentTab.customer && currentTab.customer.chietKhauPhanTram) {
    discount = (subtotal * currentTab.customer.chietKhauPhanTram) / 100;
  }

  const total = Math.max(0, subtotal - discount);

  document.getElementById('tab-cart-subtotal').textContent = `${subtotal.toLocaleString('vi-VN')} đ`;
  document.getElementById('tab-cart-discount').textContent = `-${discount.toLocaleString('vi-VN')} đ`;
  document.getElementById('tab-cart-total').textContent = `${total.toLocaleString('vi-VN')} đ`;
}

// =====================================================================================
// THANH TOÁN (CHECKOUT) CHO BÀN HIỆN TẠI
// =====================================================================================
let selectedPayMethod = 'TienMat';

function openCheckoutModalForCurrentTab() {
  const currentTab = getCurrentTab();
  if (!currentTab || currentTab.cart.length === 0) {
    showToast('Bàn này chưa chọn món nào!', 'warning');
    return;
  }

  let subtotal = 0;
  currentTab.cart.forEach(i => subtotal += i.donGia * i.soLuong);
  let discount = 0;
  if (currentTab.customer && currentTab.customer.chietKhauPhanTram) {
    discount = (subtotal * currentTab.customer.chietKhauPhanTram) / 100;
  }
  const total = Math.max(0, subtotal - discount);

  document.getElementById('modal-pay-amount').textContent = `${total.toLocaleString('vi-VN')} đ`;
  document.getElementById('modal-pay-table').textContent = currentTab.tableName;
  document.getElementById('modal-pay-cust').textContent = currentTab.customer ? `${currentTab.customer.HoTen} (${currentTab.customer.HangThanhVien})` : 'Khách vãng lai';

  document.getElementById('input-cash-given').value = total;
  calculateChange();

  // Tạo VietQR preview an toàn có fallback
  const qrImg = document.getElementById('vietqr-image');
  if (qrImg) {
    const fallbackQr = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='160' height='160'><rect width='200' height='200' fill='%23ffffff'/><rect x='20' y='20' width='50' height='50' fill='%230f172a'/><rect x='30' y='30' width='30' height='30' fill='%23ffffff'/><rect x='37' y='37' width='16' height='16' fill='%23b45309'/><rect x='130' y='20' width='50' height='50' fill='%230f172a'/><rect x='140' y='30' width='30' height='30' fill='%23ffffff'/><rect x='147' y='37' width='16' height='16' fill='%23b45309'/><rect x='20' y='130' width='50' height='50' fill='%230f172a'/><rect x='30' y='140' width='30' height='30' fill='%23ffffff'/><rect x='37' y='147' width='16' height='16' fill='%23b45309'/><path d='M85 25h10v10H85zm20 0h10v10h-10zm-20 20h20v10H85zm30 0h10v10h-10zm-10 20h10v20h-10zm-30 0h20v10H75zm-50 20h10v10H25zm20 0h10v20H45zm40 0h10v10H85zm20 0h10v10h-10zm20 0h20v10h-20zm-60 20h10v10H65zm50 0h10v10h-10zm20 0h10v20h-10zm20 0h10v10h-10zm-40 20h20v10h-20zm-50 0h10v10H85zm40 10h10v10h-10zm-20 10h10v10h-10zm40 0h10v10h-10zm20-10h10v20h-10z' fill='%230f172a'/><circle cx='100' cy='100' r='14' fill='%23b45309'/><text x='100' y='104' font-size='9' fill='%23ffffff' text-anchor='middle' font-family='sans-serif' font-weight='bold'>QR</text></svg>`;
    qrImg.onerror = () => {
      qrImg.src = fallbackQr;
    };
    qrImg.src = `https://api.vietqr.io/image/970422-0901234567-compact.png?amount=${total}&addInfo=CAFE_${Date.now().toString().slice(-4)}`;
  }

  document.getElementById('modal-checkout').classList.remove('hidden');
}

function calculateChange() {
  const currentTab = getCurrentTab();
  if (!currentTab) return;

  let subtotal = 0;
  currentTab.cart.forEach(i => subtotal += i.donGia * i.soLuong);
  let discount = 0;
  if (currentTab.customer && currentTab.customer.chietKhauPhanTram) {
    discount = (subtotal * currentTab.customer.chietKhauPhanTram) / 100;
  }
  const total = Math.max(0, subtotal - discount);

  const given = Number(document.getElementById('input-cash-given')?.value || 0);
  const change = Math.max(0, given - total);
  document.getElementById('cash-change-return').textContent = `${change.toLocaleString('vi-VN')} đ`;
}

async function submitCurrentTabPayment() {
  const currentTab = getCurrentTab();
  if (!currentTab || currentTab.cart.length === 0) return;

  const btn = document.getElementById('btn-submit-payment');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý trừ kho & in bill...';

  const orderDto = {
    kenhDatHang: currentTab.type === 'takeaway' ? 'MangDi' : 'TaiBan',
    maBan: currentTab.type === 'takeaway' ? null : currentTab.tableId,
    maNhanVien: AppState.currentUser.maNhanVien,
    maKhachHang: currentTab.customer?.MaKhachHang || null,
    items: currentTab.cart.map(c => ({
      maMon: c.maMon,
      soLuong: c.soLuong,
      donGia: c.donGia,
      ghiChuTopping: c.ghiChuTopping
    })),
    phuongThucThanhToan: selectedPayMethod,
    thanhToanNgay: true
  };

  try {
    if (AppState.isSimulatedOffline) {
      await window.OfflineDB.saveOrderOffline(orderDto);
      showToast('Đang Ngoại Tuyến: Đã lưu đơn hàng vào thiết bị (Offline Mode)!', 'warning');
      completeOrderFlow('HD_OFFLINE_' + Date.now());
    } else {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDto)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      showToast(`Đã thanh toán thành công hóa đơn ${result.data.soHoaDon}!`, 'success');
      completeOrderFlow(result.data.soHoaDon);

      if (result.lowStockAlerts && result.lowStockAlerts.length > 0) {
        result.lowStockAlerts.forEach(a => handleStockAlert(a));
      }
    }
  } catch (err) {
    showToast(`Lỗi thanh toán: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'HOÀN TẤT THANH TOÁN & TRỪ KHO TỰ ĐỘNG';
    document.getElementById('modal-checkout').classList.add('hidden');
  }
}

function completeOrderFlow(soHoaDon) {
  triggerDrawerKickPulse();
  fetchAndPreviewReceipt(soHoaDon);

  // Xóa giỏ hàng của bàn và đóng tab này hoặc đặt lại trống
  const currentTab = getCurrentTab();
  if (currentTab) {
    currentTab.cart = [];
    currentTab.customer = null;
    closePosTab(currentTab.id);
  }

  loadTables();
  loadShiftData();
}

// In tạm tính cho bàn
async function quickPrintBill() {
  const currentTab = getCurrentTab();
  if (!currentTab || currentTab.cart.length === 0) {
    showToast('Bàn này chưa chọn món nào để in tạm tính!', 'warning');
    return;
  }

  let text = '               CÀ PHÊ PHỐ XANH                   \n';
  text += '    123 Nguyễn Trãi, Q.1, TP. Hồ Chí Minh       \n';
  text += '              Hotline: 0901.234.567             \n';
  text += '================================================\n';
  text += `PHIẾU TẠM TÍNH: ${currentTab.tableName}\n`;
  text += `Giờ in: ${new Date().toLocaleTimeString('vi-VN')}\n`;
  text += '------------------------------------------------\n';
  text += 'TÊN MÓN            SL   ĐƠN GIÁ       THÀNH TIỀN\n';
  text += '------------------------------------------------\n';

  let subtotal = 0;
  currentTab.cart.forEach(item => {
    const tt = item.soLuong * item.donGia;
    subtotal += tt;
    const ten = item.tenMon.padEnd(18, ' ').substring(0, 18);
    const sl = String(item.soLuong).padStart(3, ' ');
    const dg = Number(item.donGia).toLocaleString('vi-VN').padStart(9, ' ');
    const ttStr = Number(tt).toLocaleString('vi-VN').padStart(14, ' ');
    text += `${ten} ${sl} ${dg} ${ttStr}\n`;
  });

  text += '------------------------------------------------\n';
  text += `TỔNG CỘNG:     ${Number(subtotal).toLocaleString('vi-VN')} đ\n`;
  text += '================================================\n';
  text += '          XIN QUÝ KHÁCH KIỂM TRA LẠI!           \n\n';

  const preview = document.getElementById('receipt-text-preview');
  if (preview) preview.textContent = text;

  switchMainTab('printer');
  showToast(`Đã xuất phiếu in tạm tính cho ${currentTab.tableName}!`);
}

// Chuyển bàn / Đổi bàn
function openTransferTableModal() {
  const currentTab = getCurrentTab();
  if (!currentTab || currentTab.type === 'takeaway') {
    showToast('Chỉ hỗ trợ chuyển bàn đối với các bàn phục vụ tại quán!', 'warning');
    return;
  }

  document.getElementById('transfer-from-table-display').value = `${currentTab.tableName} (${currentTab.areaName})`;

  const selectTo = document.getElementById('select-transfer-to-table');
  const availableTables = AppState.tables.filter(t => t.MaBan !== currentTab.tableId && t.TrangThai === 'Trong');

  let html = '';
  availableTables.forEach(t => {
    html += `<option value="${t.MaBan}">${t.TenBan} (${t.TenKhuVuc} - ${t.SoGhe} ghế)</option>`;
  });

  selectTo.innerHTML = html;
  document.getElementById('modal-transfer-table').classList.remove('hidden');
}

async function confirmTableTransfer() {
  const currentTab = getCurrentTab();
  const toTableId = document.getElementById('select-transfer-to-table')?.value;
  if (!currentTab || !toTableId) return;

  try {
    const res = await fetch('/api/tables/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromTable: currentTab.tableId,
        toTable: toTableId
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      // Đổi tên tab hiện tại thành bàn mới
      const newTable = AppState.tables.find(t => t.MaBan === toTableId);
      currentTab.tableId = toTableId;
      currentTab.title = newTable ? newTable.TenBan : `Bàn ${toTableId}`;
      currentTab.tableName = newTable ? newTable.TenBan : `Bàn ${toTableId}`;
      currentTab.id = `table_${toTableId}`;
      AppState.activePosTabId = currentTab.id;

      document.getElementById('modal-transfer-table').classList.add('hidden');
      renderPosTableTabs();
      renderCurrentTabDetail();
      loadTables();
    } else {
      showToast(`Lỗi: ${result.message}`, 'error');
    }
  } catch (e) {
    showToast('Lỗi khi chuyển bàn', 'error');
  }
}

// =====================================================================================
// KDS TICKETS RENDERING
// =====================================================================================
function renderKdsTickets() {
  const container = document.getElementById('kds-tickets-container');
  if (!container) return;

  if (AppState.kdsTickets.length === 0) {
    container.innerHTML = `
      <div class="w-full text-center py-24 text-slate-400 text-sm">
        <div class="text-4xl mb-3 opacity-30">☕</div>
        Hiện không có đơn nào đang chờ pha chế.<br>Tất cả đồ uống đã hoàn tất!
      </div>
    `;
    return;
  }

  let html = '';
  AppState.kdsTickets.forEach(ticket => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(ticket.NgayGioLap).getTime()) / 60000);
    const timeAlertClass = elapsedMinutes > 10 ? 'text-rose-600 font-bold animate-pulse' : 'text-slate-500';

    let itemsHtml = '';
    ticket.items.forEach(it => {
      let statusBtn = '';
      if (it.TrangThaiPhaChe === 'ChoLam') {
        statusBtn = `<button class="kds-status-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-600 hover:text-white transition" data-id="${it.MaChiTiet}" data-next="DangLam">⏳ Chờ làm</button>`;
      } else if (it.TrangThaiPhaChe === 'DangLam') {
        statusBtn = `<button class="kds-status-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-600 hover:text-white transition" data-id="${it.MaChiTiet}" data-next="HoanThanh">🔄 Đang làm</button>`;
      } else {
        statusBtn = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">✅ Đã xong</span>`;
      }

      itemsHtml += `
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-amber-600 text-white font-mono font-black flex items-center justify-center text-xs shadow-xs">${it.SoLuong}</span>
              <span class="font-bold text-xs text-slate-900">${it.TenMon}</span>
            </div>
            ${it.GhiChuTopping ? `<span class="text-[11px] text-amber-700 block ml-8 italic">📝 ${it.GhiChuTopping}</span>` : ''}
          </div>
          <div>${statusBtn}</div>
        </div>
      `;
    });

    html += `
      <div class="kds-card hover-lift animate-ticket-drop min-w-[340px] max-w-[340px] bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600"></div>
        <div>
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3 pt-1">
            <div>
              <span class="text-xs font-mono font-bold text-amber-700">${ticket.SoHoaDon}</span>
              <h3 class="text-sm font-extrabold text-slate-900">${ticket.TenBan || 'Đơn Mang Đi'}</h3>
            </div>
            <span class="text-xs ${timeAlertClass} font-mono">+${elapsedMinutes} phút</span>
          </div>
          <div class="space-y-2">
            ${itemsHtml}
          </div>
        </div>
        <div class="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
          <span>Kênh: ${ticket.KenhDatHang}</span>
          <span class="font-mono">${new Date(ticket.NgayGioLap).toLocaleTimeString('vi-VN')}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.kds-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-id');
      const nextStatus = btn.getAttribute('data-next');
      await updateKdsItemStatus(itemId, nextStatus);
    });
  });
}

async function updateKdsItemStatus(itemId, status) {
  try {
    const res = await fetch(`/api/orders/kds/items/${itemId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      loadKdsTickets();
    }
  } catch (err) {
    console.error('Lỗi cập nhật KDS item status', err);
  }
}

// =====================================================================================
// ESC/POS PRINTER & DRAWER SIMULATOR
// =====================================================================================
async function fetchAndPreviewReceipt(soHoaDon) {
  try {
    const res = await fetch(`/api/orders/${soHoaDon}/receipt`);
    const data = await res.json();
    if (data.success) {
      const preview = document.getElementById('receipt-text-preview');
      if (preview) {
        preview.textContent = data.data.textContent;
        const paper = preview.closest('.receipt-paper');
        if (paper) {
          paper.classList.remove('animate-paper-feed');
          void paper.offsetWidth; // trigger reflow
          paper.classList.add('animate-paper-feed');
        }
      }
    }
  } catch (e) {
    console.warn('Lỗi xem trước bill', e);
  }
}

function triggerDrawerKickPulse() {
  const drawer = document.getElementById('drawer-graphic');
  const msg = document.getElementById('drawer-status-msg');
  if (drawer && msg) {
    drawer.classList.remove('drawer-opened');
    void drawer.offsetWidth;
    drawer.classList.add('drawer-opened');
    msg.textContent = '⚡ XUNG ĐIỆN 1B 70 00 19 FA: NGĂN KÉO TIỀN ĐÃ BUNG MỞ TỰ ĐỘNG!';
    msg.className = 'text-xs text-emerald-700 font-bold mt-2';

    setTimeout(() => {
      drawer.classList.remove('drawer-opened');
      msg.textContent = 'Ngăn kéo đã đóng lại.';
      msg.className = 'text-xs text-slate-500 mt-2';
    }, 3500);
  }
}

// =====================================================================================
// SHIFT MANAGEMENT & CASH DRAWER BALANCING
// =====================================================================================
function updateShiftUI(shift) {
  document.getElementById('header-shift-name').textContent = shift.TenCa || 'Ca Sáng';
  document.getElementById('shift-title').textContent = `${shift.TenCa} (${shift.GioBatDau} - ${shift.GioKetThuc})`;
  document.getElementById('shift-cashier-name').textContent = shift.TenNhanVien || 'Lê Thị Mai';
  document.getElementById('shift-code').textContent = shift.MaGiaoCa;

  document.getElementById('shift-cash-initial').textContent = `${Number(shift.TienDauCa).toLocaleString('vi-VN')} đ`;
  document.getElementById('shift-revenue-cash').textContent = `${Number(shift.DoanhThuTienMat).toLocaleString('vi-VN')} đ`;
  document.getElementById('shift-revenue-bank').textContent = `${Number(shift.DoanhThuChuyenKhoan).toLocaleString('vi-VN')} đ`;
  document.getElementById('shift-cash-theoretical').textContent = `${Number(shift.TienMatLyThuyetTrongKet).toLocaleString('vi-VN')} đ`;

  const inputActual = document.getElementById('input-actual-cash');
  if (inputActual && !inputActual.value) {
    inputActual.value = shift.TienMatLyThuyetTrongKet;
    calculateShiftDifference();
  }
}

function calculateShiftDifference() {
  if (!AppState.currentShift) return;

  const actual = Number(document.getElementById('input-actual-cash')?.value || 0);
  const diff = actual - AppState.currentShift.TienMatLyThuyetTrongKet;
  const diffEl = document.getElementById('shift-diff-amount');

  if (diff === 0) {
    diffEl.textContent = '0 đ (Két tiền khớp chuẩn)';
    diffEl.className = 'text-sm font-mono font-bold text-emerald-600';
  } else if (diff > 0) {
    diffEl.textContent = `+${diff.toLocaleString('vi-VN')} đ (Két dư thừa tiền mặt)`;
    diffEl.className = 'text-sm font-mono font-bold text-amber-600';
  } else {
    diffEl.textContent = `${diff.toLocaleString('vi-VN')} đ (Két thâm hụt tiền mặt)`;
    diffEl.className = 'text-sm font-mono font-bold text-rose-600';
  }
}

async function closeCurrentShift() {
  if (!AppState.currentShift) return;

  const actual = Number(document.getElementById('input-actual-cash')?.value || 0);
  const notes = document.getElementById('input-shift-notes')?.value || '';

  try {
    const res = await fetch('/api/shift/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maGiaoCa: AppState.currentShift.MaGiaoCa,
        tienMatThucTe: actual,
        ghiChu: notes
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Đã chốt ca thành công! Đang chờ Quản lý phê duyệt.', 'success');
      loadShiftData();
    } else {
      showToast(`Lỗi: ${result.message}`, 'error');
    }
  } catch (err) {
    showToast('Lỗi chốt ca', 'error');
  }
}

// =====================================================================================
// P&L PROFIT & LOSS REPORT
// =====================================================================================
async function loadProfitAndLoss() {
  try {
    const res = await fetch(`/api/reports/pnl?role=${AppState.currentRole}`, {
      headers: { 'x-user-role': AppState.currentRole }
    });
    const data = await res.json();
    if (data.success && data.data) {
      const pnl = data.data;
      document.getElementById('pnl-revenue').textContent = `${pnl.doanhThuBanHang.toLocaleString('vi-VN')} đ`;
      document.getElementById('pnl-orders-count').textContent = `${pnl.tongDonHang} đơn hoàn tất`;
      document.getElementById('pnl-cogs').textContent = `${pnl.giaVonHangBan_COGS.toLocaleString('vi-VN')} đ`;
      document.getElementById('pnl-gross-profit').textContent = `${pnl.loiNhuanGop.toLocaleString('vi-VN')} đ`;
      document.getElementById('pnl-gross-margin').textContent = `Tỉ suất: ${pnl.tiSuatLoiNhuanGop}%`;
      document.getElementById('pnl-net-profit').textContent = `${pnl.loiNhuanRong_NetProfit.toLocaleString('vi-VN')} đ`;
      document.getElementById('pnl-net-margin').textContent = `Tỉ suất: ${pnl.tiSuatLoiNhuanRong}%`;

      document.getElementById('table-pnl-rev').textContent = `${pnl.doanhThuBanHang.toLocaleString('vi-VN')} đ`;
      document.getElementById('table-pnl-cogs').textContent = `-${pnl.giaVonHangBan_COGS.toLocaleString('vi-VN')} đ`;
      document.getElementById('table-pnl-gross').textContent = `${pnl.loiNhuanGop.toLocaleString('vi-VN')} đ`;
      document.getElementById('table-pnl-other-inc').textContent = `+${pnl.thuKhac.toLocaleString('vi-VN')} đ`;
      document.getElementById('table-pnl-opex').textContent = `-${pnl.chiPhiVanHanh.toLocaleString('vi-VN')} đ`;
      document.getElementById('table-pnl-payroll').textContent = `-${pnl.chiPhiLuong.toLocaleString('vi-VN')} đ`;
      document.getElementById('table-pnl-spoilage').textContent = `-${pnl.chiPhiHaoHut.toLocaleString('vi-VN')} đ`;
      document.getElementById('table-pnl-net').textContent = `${pnl.loiNhuanRong_NetProfit.toLocaleString('vi-VN')} đ`;
    }
  } catch (err) {
    console.error('Lỗi nạp P&L', err);
  }
}

// =====================================================================================
// INVENTORY & RECIPES
// =====================================================================================
async function loadInventoryView() {
  try {
    const [matRes, recRes] = await Promise.all([
      fetch('/api/inventory/materials'),
      fetch('/api/inventory/recipes')
    ]);
    const matData = await matRes.json();
    const recData = await recRes.json();

    if (matData.success) renderInventoryMaterials(matData.data);
    if (recData.success) renderRecipesTable(recData.data);
  } catch (e) {
    console.error('Lỗi nạp kho', e);
  }
}

function renderInventoryMaterials(materials) {
  const tbody = document.getElementById('inventory-materials-tbody');
  if (!tbody) return;

  let html = '';
  materials.forEach(m => {
    const isLow = m.CanhBaoHetHang === 1;
    const statusBadge = isLow
      ? `<span class="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Cần Nhập</span>`
      : `<span class="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đủ Tồn</span>`;

    html += `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 ${isLow ? 'bg-rose-50/40' : ''}">
        <td class="py-2.5 px-3 font-mono text-slate-500 text-xs">${m.MaVatTu}</td>
        <td class="py-2.5 px-3 font-bold text-slate-900 text-xs">${m.TenVatTu}</td>
        <td class="py-2.5 px-3 text-right font-mono font-bold text-xs ${isLow ? 'text-rose-600' : 'text-slate-800'} whitespace-nowrap">${Number(m.SoLuongTonHienTai).toLocaleString('vi-VN')} ${m.DonViTinh}</td>
        <td class="py-2.5 px-3 text-right text-slate-500 font-mono text-xs whitespace-nowrap">${Number(m.MucToiThieuCanCanhBao).toLocaleString('vi-VN')} ${m.DonViTinh}</td>
        <td class="py-2.5 px-3 text-right font-mono text-slate-700 text-xs whitespace-nowrap">${Number(m.DonGiaBinhQuan).toLocaleString('vi-VN')} đ</td>
        <td class="py-2.5 px-3 text-center whitespace-nowrap">${statusBadge}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderRecipesTable(recipes) {
  const tbody = document.getElementById('recipes-tbody');
  if (!tbody) return;

  // Nhóm các nguyên vật liệu theo từng món để KHÔNG BỊ TRÙNG LẶP TÊN MÓN
  const grouped = {};
  recipes.forEach(r => {
    if (!grouped[r.TenMon]) grouped[r.TenMon] = [];
    grouped[r.TenMon].push(r);
  });

  let html = '';
  Object.keys(grouped).forEach(tenMon => {
    const ings = grouped[tenMon];
    ings.forEach((r, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === ings.length - 1;
      const rowBorder = isLast ? 'border-b-2 border-slate-200' : 'border-b border-slate-100';

      html += `
        <tr class="hover:bg-amber-50/30 transition ${rowBorder}">
          ${isFirst ? `<td rowspan="${ings.length}" class="py-3 px-3.5 font-extrabold text-xs text-slate-900 border-r border-slate-200/80 align-top bg-amber-50/20 whitespace-nowrap"><div class="flex items-center gap-1.5"><span>☕</span><span>${tenMon}</span></div></td>` : ''}
          <td class="py-2.5 px-3 text-slate-700 font-medium text-xs">${r.TenVatTu}</td>
          <td class="py-2.5 px-3 text-right font-mono text-amber-800 font-bold text-xs whitespace-nowrap">${r.SoLuongDinhMuc} ${r.DonViTinh}</td>
          <td class="py-2.5 px-3 text-slate-500 text-[11px]">${r.GhiChu || '-'}</td>
        </tr>
      `;
    });
  });
  tbody.innerHTML = html;
}

async function openRecipesModal() {
  const container = document.getElementById('recipe-modal-list');
  if (!container) return;

  const res = await fetch('/api/inventory/recipes');
  const data = await res.json();
  if (data.success) {
    const grouped = {};
    data.data.forEach(r => {
      if (!grouped[r.TenMon]) grouped[r.TenMon] = [];
      grouped[r.TenMon].push(r);
    });

    let html = '';
    Object.keys(grouped).forEach(mon => {
      let ingredientsHtml = '';
      grouped[mon].forEach(ing => {
        ingredientsHtml += `
          <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span class="text-slate-700 font-medium">${ing.TenVatTu}</span>
            <span class="font-mono font-bold text-amber-700">${ing.SoLuongDinhMuc} ${ing.DonViTinh}</span>
          </div>
        `;
      });

      html += `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h4 class="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
            ☕ ${mon}
          </h4>
          <div class="space-y-1">
            ${ingredientsHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    document.getElementById('modal-recipes').classList.remove('hidden');
  }
}

// =====================================================================================
// RBAC ROLE PERMISSIONS
// =====================================================================================
function applyRolePermissions(role) {
  AppState.currentRole = role;

  const roleSelect = document.getElementById('select-role');
  if (roleSelect) roleSelect.value = role;

  const roleIcons = {
    ChuQuan: '👑',
    QuanLy: '👔',
    ThuNgan: '💵',
    PhaChe: '☕',
    PhucVu: '🛎️'
  };
  const miniIconEl = document.getElementById('sidebar-role-mini-icon');
  if (miniIconEl) miniIconEl.textContent = roleIcons[role] || '💵';

  const allowedTabs = {
    ChuQuan: ['pos', 'kds', 'inventory', 'shift', 'reports', 'printer'],
    QuanLy: ['pos', 'kds', 'inventory', 'shift', 'reports', 'printer'],
    ThuNgan: ['pos', 'kds', 'shift', 'printer'],
    PhaChe: ['kds', 'inventory', 'printer'],
    PhucVu: ['pos', 'kds']
  };

  const currentAllowed = allowedTabs[role] || ['pos'];

  document.querySelectorAll('.nav-tab').forEach(tabBtn => {
    const tabName = tabBtn.getAttribute('data-tab');
    if (currentAllowed.includes(tabName)) {
      tabBtn.classList.remove('hidden');
    } else {
      tabBtn.classList.add('hidden');
    }
  });

  if (!currentAllowed.includes(AppState.activeMainTab)) {
    switchMainTab(currentAllowed[0]);
  }
}

function switchMainTab(tabName) {
  AppState.activeMainTab = tabName;

  const titles = {
    pos: 'HỆ THỐNG QUẢN LÝ BÁN HÀNG (POS)',
    kds: 'MÀN HÌNH BẾP & PHA CHẾ REAL-TIME (KDS)',
    inventory: 'QUẢN LÝ TỒN KHO & ĐỊNH MỨC NGUYÊN VẬT LIỆU',
    shift: 'CHỐT CA & BÀN GIAO KÉT TIỀN MẶT',
    reports: 'BÁO CÁO KẾT QUẢ KINH DOANH LÃI - LỖ (P&L)',
    printer: 'MÁY IN NHIỆT K80 & XUNG KÉT TIỀN ESC/POS'
  };

  const headerTitle = document.getElementById('main-header-title');
  if (headerTitle) headerTitle.textContent = titles[tabName] || 'HỆ THỐNG QUẢN LÝ BÁN HÀNG';

  document.querySelectorAll('.nav-tab').forEach(btn => {
    const isCollapsed = AppState.isSidebarCollapsed;
    const justifyClass = isCollapsed ? 'justify-center' : '';
    if (btn.getAttribute('data-tab') === tabName) {
      btn.className = `nav-tab w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition bg-amber-50 text-amber-900 border border-amber-300 shadow-xs ${justifyClass}`;
    } else {
      btn.className = `nav-tab w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent ${justifyClass}`;
    }
  });

  const panes = ['pos', 'kds', 'inventory', 'shift', 'reports', 'printer'];
  panes.forEach(p => {
    const paneEl = document.getElementById(`tab-pane-${p}`);
    if (paneEl) {
      if (p === tabName) {
        paneEl.classList.remove('hidden');
        paneEl.classList.remove('animate-fade-in');
        void paneEl.offsetWidth; // trigger reflow
        paneEl.classList.add('animate-fade-in');
      } else {
        paneEl.classList.add('hidden');
      }
    }
  });

  if (tabName === 'reports') loadProfitAndLoss();
  if (tabName === 'inventory') loadInventoryView();
  if (tabName === 'shift') loadShiftData();
  if (tabName === 'kds') loadKdsTickets();
}

function toggleSidebar() {
  AppState.isSidebarCollapsed = !AppState.isSidebarCollapsed;
  const sidebar = document.getElementById('sidebar');
  const brandBox = document.getElementById('sidebar-brand-box');
  const logoIcon = document.getElementById('sidebar-logo-icon');
  const labels = document.querySelectorAll('.sidebar-label');
  const navTabs = document.querySelectorAll('.nav-tab');
  const roleExpanded = document.getElementById('sidebar-role-expanded-box');
  const roleCollapsed = document.getElementById('sidebar-role-collapsed-box');

  // Kích hoạt hiệu ứng lăn (Rolling animation) trên Logo khi nhấn vào
  if (logoIcon) {
    logoIcon.classList.remove('animate-logo-roll-forward', 'animate-logo-roll-backward');
    // Force reflow để trigger lại animation ở mỗi lần click
    void logoIcon.offsetWidth;
    if (AppState.isSidebarCollapsed) {
      logoIcon.classList.add('animate-logo-roll-backward');
    } else {
      logoIcon.classList.add('animate-logo-roll-forward');
    }
  }

  if (AppState.isSidebarCollapsed) {
    sidebar?.classList.remove('w-64');
    sidebar?.classList.add('w-20');
    brandBox?.classList.remove('space-x-3');
    brandBox?.classList.add('justify-center');
    roleExpanded?.classList.add('hidden');
    roleCollapsed?.classList.remove('hidden');
    roleCollapsed?.classList.add('flex');
    navTabs.forEach(tab => tab.classList.add('justify-center'));
    labels.forEach(el => el.classList.add('hidden'));
  } else {
    sidebar?.classList.remove('w-20');
    sidebar?.classList.add('w-64');
    brandBox?.classList.remove('justify-center');
    brandBox?.classList.add('space-x-3');
    roleExpanded?.classList.remove('hidden');
    roleCollapsed?.classList.add('hidden');
    roleCollapsed?.classList.remove('flex');
    navTabs.forEach(tab => tab.classList.remove('justify-center'));
    labels.forEach(el => el.classList.remove('hidden'));
  }
}

// =====================================================================================
// EVENT HANDLERS
// =====================================================================================
function initEventHandlers() {
  // Sidebar Toggle bằng cách nhấn vào Logo (với hiệu ứng lăn)
  document.getElementById('sidebar-brand-box')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-role-collapsed-box')?.addEventListener('click', toggleSidebar);

  // Main Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchMainTab(tab);
    });
  });

  // Role selector
  document.getElementById('select-role')?.addEventListener('change', (e) => {
    applyRolePermissions(e.target.value);
    showToast(`Đã chuyển đổi sang vai trò: ${e.target.value}`);
  });

  // Mở đơn mang đi mới
  document.getElementById('btn-add-takeaway-tab')?.addEventListener('click', openTakeawayTab);

  // Đóng tab bàn hiện tại
  document.getElementById('btn-close-current-tab')?.addEventListener('click', () => {
    closePosTab(AppState.activePosTabId);
  });

  // Menu Search
  document.getElementById('menu-search-input')?.addEventListener('input', () => {
    renderMenuItems();
  });

  // Xóa giỏ hàng của bàn này
  document.getElementById('btn-clear-tab-cart')?.addEventListener('click', () => {
    const currentTab = getCurrentTab();
    if (currentTab) {
      currentTab.cart = [];
      renderTabCart();
      renderPosTableTabs();
    }
  });

  // Tra cứu thành viên VIP
  document.getElementById('btn-search-customer')?.addEventListener('click', async () => {
    const phone = document.getElementById('cust-phone-input')?.value;
    if (!phone) return;

    try {
      const res = await fetch(`/api/customers/search?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const currentTab = getCurrentTab();
        if (currentTab) currentTab.customer = data.data;

        document.getElementById('customer-info-tag')?.classList.remove('hidden');
        document.getElementById('cust-name-display').textContent = data.data.HoTen;
        document.getElementById('cust-tier-display').textContent = `${data.data.HangThanhVien} (-${data.data.chietKhauPhanTram}%)`;
        document.getElementById('cust-points-display').textContent = `${data.data.DiemTichLuy} điểm`;
        updateTabCartTotals();
        showToast(`Tìm thấy khách hàng VIP: ${data.data.HoTen}`);
      } else {
        showToast('Không tìm thấy thông tin khách hàng', 'warning');
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Gửi bếp KDS
  document.getElementById('btn-send-kds')?.addEventListener('click', async () => {
    const currentTab = getCurrentTab();
    if (!currentTab || currentTab.cart.length === 0) {
      showToast('Bàn này chưa chọn món nào để gửi bếp!', 'warning');
      return;
    }

    const orderDto = {
      kenhDatHang: currentTab.type === 'takeaway' ? 'MangDi' : 'TaiBan',
      maBan: currentTab.type === 'takeaway' ? null : currentTab.tableId,
      maNhanVien: AppState.currentUser.maNhanVien,
      maKhachHang: currentTab.customer?.MaKhachHang || null,
      items: currentTab.cart.map(c => ({
        maMon: c.maMon,
        soLuong: c.soLuong,
        donGia: c.donGia,
        ghiChuTopping: c.ghiChuTopping
      })),
      phuongThucThanhToan: 'TienMat',
      thanhToanNgay: false
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDto)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã gửi bếp thành công order của ${currentTab.tableName}!`, 'success');
        loadTables();
      }
    } catch (e) {
      showToast('Lỗi khi gửi bếp', 'error');
    }
  });

  // In tạm tính & Chuyển bàn
  document.getElementById('btn-quick-print-bill')?.addEventListener('click', quickPrintBill);
  document.getElementById('btn-transfer-table-modal')?.addEventListener('click', openTransferTableModal);
  document.getElementById('btn-close-transfer')?.addEventListener('click', () => {
    document.getElementById('modal-transfer-table').classList.add('hidden');
  });
  document.getElementById('btn-confirm-transfer')?.addEventListener('click', confirmTableTransfer);

  // Mở modal thanh toán
  document.getElementById('btn-open-payment')?.addEventListener('click', openCheckoutModalForCurrentTab);
  document.getElementById('btn-close-checkout')?.addEventListener('click', () => {
    document.getElementById('modal-checkout').classList.add('hidden');
  });

  // Chọn phương thức thanh toán
  document.querySelectorAll('.pay-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pay-method-btn').forEach(b => {
        b.className = 'pay-method-btn py-2.5 px-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold flex flex-col items-center gap-1';
      });
      btn.className = 'pay-method-btn py-2.5 px-2 rounded-xl border-2 border-amber-600 bg-amber-50 text-amber-900 text-xs font-extrabold flex flex-col items-center gap-1 shadow-xs';

      selectedPayMethod = btn.getAttribute('data-method');
      const cashBox = document.getElementById('cash-calculation-box');
      const qrBox = document.getElementById('qr-display-box');

      if (selectedPayMethod === 'TienMat') {
        cashBox.classList.remove('hidden');
        qrBox.classList.add('hidden');
      } else if (selectedPayMethod === 'QR') {
        cashBox.classList.add('hidden');
        qrBox.classList.remove('hidden');
      } else {
        cashBox.classList.add('hidden');
        qrBox.classList.add('hidden');
      }
    });
  });

  // Các nút chọn tiền mặt nhanh
  document.querySelectorAll('.quick-cash').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      const input = document.getElementById('input-cash-given');
      const currentTab = getCurrentTab();
      if (val === 'exact') {
        let subtotal = 0;
        currentTab?.cart.forEach(i => subtotal += i.donGia * i.soLuong);
        input.value = subtotal;
      } else {
        input.value = val;
      }
      calculateChange();
    });
  });

  document.getElementById('input-cash-given')?.addEventListener('input', calculateChange);
  document.getElementById('btn-submit-payment')?.addEventListener('click', submitCurrentTabPayment);

  // Tra cứu công thức
  document.getElementById('btn-recipe-lookup')?.addEventListener('click', openRecipesModal);
  document.getElementById('btn-close-recipes')?.addEventListener('click', () => {
    document.getElementById('modal-recipes').classList.add('hidden');
  });

  // Chế độ mô phỏng Offline
  document.getElementById('btn-toggle-offline')?.addEventListener('click', async () => {
    AppState.isSimulatedOffline = !AppState.isSimulatedOffline;
    updateNetworkBadge(!AppState.isSimulatedOffline);

    if (!AppState.isSimulatedOffline) {
      const offlineOrders = await window.OfflineDB.getOfflineOrders();
      if (offlineOrders.length > 0) {
        showToast(`Đang đồng bộ ${offlineOrders.length} đơn hàng ngoại tuyến lên Server...`);
        const res = await fetch('/api/orders/reconciliation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: offlineOrders })
        });
        const recData = await res.json();
        if (recData.success) {
          await window.OfflineDB.clearOfflineOrders();
          showToast(recData.message, 'success');
          loadTables();
          loadShiftData();
        }
      }
    }
  });

  // Mô phỏng in ấn & Ngăn kéo
  document.getElementById('btn-test-drawer-kick')?.addEventListener('click', triggerDrawerKickPulse);
  document.getElementById('btn-physical-print')?.addEventListener('click', () => window.print());

  // Chốt ca
  document.getElementById('input-actual-cash')?.addEventListener('input', calculateShiftDifference);
  document.getElementById('btn-close-shift')?.addEventListener('click', closeCurrentShift);
  document.getElementById('btn-shift-modal')?.addEventListener('click', () => switchMainTab('shift'));

  // Refresh dữ liệu
  document.getElementById('btn-refresh-pnl')?.addEventListener('click', loadProfitAndLoss);
  document.getElementById('btn-refresh-inventory')?.addEventListener('click', loadInventoryView);
}

function updateNetworkBadge(isOnline) {
  const dot = document.getElementById('network-status-dot');
  const text = document.getElementById('network-status-text');
  const btn = document.getElementById('btn-toggle-offline');

  if (isOnline) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 shadow-sm animate-pulse';
    text.textContent = 'Trực tuyến';
    text.className = 'text-xs font-bold text-emerald-700 mr-2';
    btn.textContent = 'Mô phỏng Offline';
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 mr-2';
    text.textContent = 'Offline (Cục bộ)';
    text.className = 'text-xs font-bold text-rose-700 mr-2';
    btn.textContent = 'Khôi phục Online';
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const existing = document.getElementById('pos-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'pos-toast';
  let bg = 'bg-slate-900 text-white border-slate-700';
  if (type === 'success') bg = 'bg-emerald-800 text-white border-emerald-600';
  if (type === 'warning') bg = 'bg-amber-800 text-white border-amber-600';
  if (type === 'error') bg = 'bg-rose-800 text-white border-rose-600';

  toast.className = `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl border shadow-2xl text-xs font-bold flex items-center gap-2.5 ${bg} animate-bounce`;
  toast.innerHTML = `<span>🔔</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
