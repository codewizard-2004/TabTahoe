const DB_NAME = 'tabtahoe-widget-assets';
let database;
function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Local image storage is unavailable in this browser.'));
  return database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('images')) request.result.createObjectStore('images');
      if (!request.result.objectStoreNames.contains('sounds')) request.result.createObjectStore('sounds');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Image storage could not be opened.'));
  });
}
export async function getImageAsset(id) {
  if (!id) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('images').objectStore('images').get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
export async function saveImageAsset(id, blob) {
  if (!id || !(blob instanceof Blob)) throw new Error('Invalid image asset.');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('images', 'readwrite');
    transaction.objectStore('images').put(blob, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Image could not be saved.'));
    transaction.onabort = () => reject(transaction.error || new Error('Image storage is full. Existing image was kept.'));
  });
}

export async function getSoundAsset(id) {
  if (!id) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('sounds').objectStore('sounds').get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSoundAsset(id, blob) {
  if (!id || !(blob instanceof Blob)) throw new Error('Invalid sound file.');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sounds', 'readwrite');
    transaction.objectStore('sounds').put(blob, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Sound could not be saved.'));
    transaction.onabort = () => reject(transaction.error || new Error('Sound storage is full.'));
  });
}
