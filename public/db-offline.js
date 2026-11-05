// Quản lý cơ sở dữ liệu ngoại tuyến IndexedDB cho Chế độ Offline Mode
const DB_NAME = 'QuanCafe_OfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_orders';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'offlineId' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function saveOrderOffline(order) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    order.offlineId = order.offlineId || `OFF_${Date.now()}`;
    order.savedAt = new Date().toISOString();
    store.put(order);
    tx.oncomplete = () => resolve(order);
    tx.onerror = () => reject(tx.error);
  });
}

async function getOfflineOrders() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function clearOfflineOrders() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

window.OfflineDB = {
  saveOrderOffline,
  getOfflineOrders,
  clearOfflineOrders
};
