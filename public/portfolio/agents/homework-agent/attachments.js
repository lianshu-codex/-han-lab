(function (root) {
  "use strict";

  const DB_NAME = "teaching-assistant";
  const STORE_NAME = "attachments";
  const DB_VERSION = 1;
  let databasePromise;

  function openDatabase() {
    if (databasePromise) return databasePromise;
    if (!root.indexedDB) return Promise.reject(new Error("当前浏览器不支持图片本地保存"));
    databasePromise = new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error || new Error("无法打开图片存储"));
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
    });
    return databasePromise;
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("图片存储操作失败"));
    });
  }

  function dataUrlToBlob(dataUrl, type) {
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1).replace(/\s/g, "");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  async function put(image) {
    if (!image?.dataUrl) throw new Error("图片内容不可用，无法保存");
    const database = await openDatabase();
    const id = image.id || crypto.randomUUID();
    const record = { id, name: image.name, type: image.type, width: image.width, height: image.height,
      blob: dataUrlToBlob(image.dataUrl, image.type) };
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("图片保存失败"));
      transaction.onabort = () => reject(transaction.error || new Error("图片保存被中断"));
    });
    return { ...image, id };
  }

  async function hydrate(image) {
    if (image.dataUrl || !image.id) return image;
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(image.id));
    if (!record?.blob) return null;
    return { ...image, name: record.name || image.name, type: record.type || image.type,
      width: record.width ?? image.width, height: record.height ?? image.height,
      dataUrl: await blobToDataUrl(record.blob) };
  }

  async function hydrateImages(images) {
    const hydrated = await Promise.all(images.map(hydrate));
    return hydrated.filter(Boolean);
  }

  async function migrateLegacyState(state) {
    const images = [];
    for (const session of state.sessions) {
      images.push(...session.draft.images);
      for (const turn of session.turns) images.push(...turn.images);
    }
    const legacy = images.filter((image) => image.dataUrl && !image.id);
    if (!legacy.length) return false;
    const stored = [];
    try {
      for (const image of legacy) {
        const saved = await put(image);
        stored.push(saved.id);
        image.id = saved.id;
      }
      return true;
    } catch (error) {
      await removeByIds(stored).catch(() => {});
      throw error;
    }
  }

  async function removeByIds(ids) {
    const validIds = [...new Set(ids.filter((id) => typeof id === "string"))];
    if (!validIds.length) return;
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    for (const id of validIds) transaction.objectStore(STORE_NAME).delete(id);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("图片清理失败"));
      transaction.onabort = () => reject(transaction.error || new Error("图片清理被中断"));
    });
  }

  async function removeImages(images) {
    await removeByIds(images.map((image) => image.id));
  }

  async function estimate() {
    if (!navigator.storage?.estimate) return null;
    return navigator.storage.estimate();
  }

  root.TeachingAttachments = { openDatabase, put, hydrate, hydrateImages, migrateLegacyState, removeImages, estimate };
})(globalThis);
