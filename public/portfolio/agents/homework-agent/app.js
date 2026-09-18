/* global TeachingState, TeachingAttachments, TeachingRender, TeachingVideos */
"use strict";
const { STORAGE_KEY, STORAGE_VERSION, createSession, createTurn, historyFor, restore, snapshot } = TeachingState;
const attachments = TeachingAttachments;
const { element, renderMarkdown } = TeachingRender;
const videos = TeachingVideos;
const $ = (selector) => document.querySelector(selector);
const questionInput = $("#question");
const studentAnswerInput = $("#student-answer");
const imageInput = $("#image-input");
const scrollArea = $("#conversation-scroll");
const sidebar = $("#sidebar");
const workspace = $("#workspace");
const pending = new Map();
const positions = new Map();
const mobile = matchMedia("(max-width: 760px)");
let composing = false;
let toastTimer;
let saveTimer;
let dialogTarget = null;
let preserveCorruptStorage = false;
let pageLeaving = false;
let migrationPending = false;
let saveQueued = false;
let state;

function warnStorage(message) {
  $("#storage-warning").textContent = message;
  $("#storage-warning").hidden = false;
}
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { state = restore(JSON.parse(saved)); }
    catch {
      preserveCorruptStorage = true;
      warnStorage("历史记录暂时无法读取，原始记录已保留。本次仍可问答，但新内容不会保存；请先备份浏览器中的记录。");
    }
  }
} catch {
  warnStorage("浏览器未允许读取本地记录。你仍可继续问答，请及时复制重要内容。");
}
if (!state) {
  const session = createSession();
  state = { version: STORAGE_VERSION, sessions: [session], activeId: session.id };
}
migrationPending = state.version === 1;
const current = () => state.sessions.find((session) => session.id === state.activeId);
function save(keepWarning = false) {
  clearTimeout(saveTimer);
  if (preserveCorruptStorage || migrationPending) { saveQueued = true; return; }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot(state)));
    if (!keepWarning) $("#storage-warning").hidden = true;
  } catch {
    warnStorage("本地保存失败，可能是浏览器限制或存储空间不足。本次仍可问答，请复制重要内容后再关闭页面。");
  }
}
async function restoreAttachments() {
  try {
    await attachments.openDatabase();
    if (migrationPending) {
      await attachments.migrateLegacyState(state);
      state.version = STORAGE_VERSION;
      migrationPending = false;
      save();
      toast("已将历史图片迁移到更稳定的本地存储");
    }
    let missing = 0;
    for (const session of state.sessions) {
      const draftImages = await attachments.hydrateImages(session.draft.images);
      missing += session.draft.images.length - draftImages.length;
      session.draft.images = draftImages;
      for (const turn of session.turns) {
        const turnImages = await attachments.hydrateImages(turn.images);
        missing += turn.images.length - turnImages.length;
        turn.images = turnImages;
      }
    }
    if (missing) { warnStorage("有部分历史图片已不可用，文字记录仍然保留。"); saveQueued = true; }
  } catch {
    if (migrationPending) {
      preserveCorruptStorage = true;
      migrationPending = false;
      warnStorage("历史图片暂时无法迁移，原始记录已保留。本次仍可问答，但请勿关闭页面后再保存此会话。");
    } else {
      warnStorage("图片无法保存到浏览器，仍可在本次问答中使用；刷新后图片不会保留。");
    }
  } finally {
    if (saveQueued && !preserveCorruptStorage) save(!$("#storage-warning").hidden);
    renderDraftImages(); renderConversation();
  }
}
function toast(text) {
  clearTimeout(toastTimer);
  $("#toast").textContent = text;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 3500);
}
async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制到剪贴板");
    const label = button.textContent;
    button.textContent = "已复制";
    setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1800);
  } catch {
    toast("复制未成功，请选中文字后使用 Ctrl / ⌘ + C 复制。");
  }
}
function resizeInput(input) {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
}
function captureDraft() {
  current().draft.question = questionInput.value;
  current().draft.studentAnswer = studentAnswerInput.value;
}
function updateDraft() {
  captureDraft();
  renderDraftImages();
  resizeInput(questionInput);
  resizeInput(studentAnswerInput);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 200);
}
function renderDraftImages() {
  const tray = $("#image-attachments");
  tray.replaceChildren();
  for (const [index, image] of current().draft.images.entries()) {
    const item = element("div", "image-attachment");
    const preview = element("img");
    preview.src = image.dataUrl || "";
    preview.alt = image.name || `附件 ${index + 1}`;
    const name = element("span", "", image.name || `图片 ${index + 1}`);
    const remove = element("button", "", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `移除图片：${name.textContent}`);
    remove.addEventListener("click", () => {
      current().draft.images.splice(index, 1);
      void attachments.removeImages([image]).catch(() => warnStorage("图片已移除，但本地图片副本暂时无法清理。"));
      save(); renderDraftImages();
    });
    item.append(preview, name, remove); tray.append(item);
  }
}
function updateComposer() {
  const session = current();
  const busy = pending.has(session.id);
  $("#submit-button").disabled = busy;
  $("#submit-button").textContent = busy ? "正在解题…" : "发送问题 ↑";
  $("#input-hint").textContent = busy ? "正在整理思路，你可以继续准备下一条问题" : "可直接粘贴截图 · Enter 换行 · Ctrl / ⌘ + Enter 发送";
  questionInput.placeholder = session.turns.length ? "继续追问，或补充你还没弄懂的地方…" : "写下题目、代码或学习中的疑问…";
  resizeInput(questionInput);
  resizeInput(studentAnswerInput);
}
function renderHistory() {
  const list = $("#history-list");
  const focused = list.contains(document.activeElement) ? {
    id: document.activeElement.dataset.session, action: document.activeElement.dataset.action,
  } : null;
  list.replaceChildren();
  $("#history-count").textContent = state.sessions.length;
  for (const session of [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const row = element("div", `history-item${session.id === state.activeId ? " active" : ""}`);
    const button = element("button", "history-select");
    button.type = "button";
    button.dataset.session = session.id;
    button.dataset.action = "select";
    button.setAttribute("aria-label", session.title);
    if (session.id === state.activeId) button.setAttribute("aria-current", "true");
    const date = new Date(session.updatedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
    button.append(element("span", "history-title", session.title),
      element("span", "history-meta", pending.has(session.id) ? "正在解题…" : date));
    button.addEventListener("click", () => selectSession(session.id));
    const actions = element("div", "history-actions");
    for (const [action, text] of [["rename", "改名"], ["delete", "删除"]]) {
      const control = element("button", "", text);
      control.type = "button";
      control.dataset.session = session.id;
      control.dataset.action = action;
      control.setAttribute("aria-label", `${text}会话：${session.title}`);
      control.addEventListener("click", () => openSessionDialog(session, action, control));
      actions.append(control);
    }
    row.append(button, actions); list.append(row);
  }
  if (focused) [...list.querySelectorAll("button")].find((b) =>
    b.dataset.session === focused.id && b.dataset.action === focused.action)?.focus({ preventScroll: true });
}
async function loadVideoLibrary() {
  try {
    const response = await fetch("/api/videos", { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (!response.ok || !videos.setLibrary(result.videos)) throw new Error("视频库暂时无法读取");
    renderConversation();
    renderVideoManager();
  } catch {
    // The bundled fallback still lets old recommendations remain readable.
  }
}
function resetVideoForm() {
  $("#video-form").reset();
  $("#video-edit-id").value = "";
  $("#video-form-cancel").hidden = true;
  $("#video-manager-message").textContent = "";
}
function renderVideoManager() {
  const list = $("#video-manager-list");
  if (!list) return;
  list.replaceChildren();
  for (const video of videos.VIDEO_LIBRARY) {
    const item = element("div", "video-manager-item");
    const text = element("div", "video-manager-item-copy");
    text.append(element("strong", "", video.title), element("span", "", `${video.platform === "bilibili" ? "B 站" : "抖音"} · ${video.topic}`));
    const actions = element("div", "video-manager-item-actions");
    const edit = element("button", "text-button", "编辑"); edit.type = "button";
    edit.addEventListener("click", () => { $("#video-edit-id").value = video.libraryId; $("#video-url").value = video.url || ""; $("#video-title").value = video.title; $("#video-topic").value = video.topic; $("#video-level").value = video.level || ""; $("#video-duration").value = video.duration || ""; $("#video-keywords").value = (video.keywords || []).join(", "); $("#video-form-cancel").hidden = false; $("#video-url").focus(); });
    const remove = element("button", "text-button danger-button", "删除"); remove.type = "button";
    remove.addEventListener("click", async () => { if (!window.confirm(`确定删除“${video.title}”吗？`)) return; try { const response = await fetch(`/api/videos/${encodeURIComponent(video.libraryId)}`, { method: "DELETE" }); if (!response.ok) throw new Error("删除失败"); await loadVideoLibrary(); $("#video-manager-message").textContent = "视频已删除。"; } catch { $("#video-manager-message").textContent = "删除失败，原视频库未改变。"; } });
    actions.append(edit, remove); item.append(text, actions); list.append(item);
  }
}
function videoCard(recommendation) {
  const linked = videos.linkFor(recommendation);
  if (!linked) return null;
  const card = element("div", "video-card");
  const link = element("a", "video-card-link");
  link.href = linked.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `观看相关教学视频：${linked.video.title}`);
  const copy = element("span", "video-card-copy");
  const video = linked.video;
  copy.append(element("span", "video-card-kicker", `${video.platform === "bilibili" ? "B 站" : "抖音"} · 相关教学视频`),
    element("strong", "", video.title), element("span", "video-card-meta", `${video.topic} · ${video.duration}`));
  link.append(element("span", "video-card-icon", "▶"), copy, element("span", "video-card-arrow", "打开 ↗"));
  const follow = element("button", "video-followup", "继续问这个知识点");
  follow.type = "button";
  follow.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); questionInput.value = `我想继续学习“${video.topic}”，请换一种方式讲解。`; updateDraft(); questionInput.focus(); });
  card.append(link, follow);
  return card;
}
function renderLayeredAnswer(answer) {
  const lines = answer.replace(/\r\n/g, "\n").split("\n");
  const headings = [];
  lines.forEach((line, index) => { if (/^\s*#{1,6}\s+/.test(line)) headings.push(index); });
  if (headings.length < 2) return renderMarkdown(answer, copyText);
  // Keep the conclusion and the first diagnosis visible; detailed derivation is opt-in.
  const detailStart = headings[1];
  const wrapper = element("div", "layered-answer");
  wrapper.append(renderMarkdown(lines.slice(0, detailStart).join("\n"), copyText));
  const details = document.createElement("details");
  details.className = "answer-details";
  // Extremely long, step-by-step answers keep their reading height so a response
  // cannot unexpectedly pull the viewport to the bottom while it is being replaced.
  details.open = headings.length > 20;
  const summary = document.createElement("summary");
  summary.textContent = "展开完整讲解";
  const detailBody = renderMarkdown(lines.slice(detailStart).join("\n"), copyText);
  detailBody.classList.remove("answer-body");
  detailBody.classList.add("answer-detail-body");
  details.append(summary, detailBody);
  wrapper.append(details);
  return wrapper;
}
function draftFollowup(text) {
  questionInput.value = text;
  updateDraft();
  questionInput.focus();
}
function renderConversation(forceBottom = false) {
  const nearBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < 100;
  const oldScroll = scrollArea.scrollTop;
  const conversation = $("#conversation");
  conversation.replaceChildren();
  const session = current();
  $("#welcome").hidden = session.turns.length > 0;
  $("#session-title").textContent = session.title;
  $("#session-subtitle").textContent = session.turns.length ? "可在当前会话中继续追问" : "把题目一步一步弄懂";
  for (const turn of session.turns) {
    const article = element("article", "turn");
    article.dataset.turn = turn.id;
    const user = element("div", "user-message");
    user.append(element("p", "message-label", "你的问题"));
    if (turn.question) user.append(element("p", "user-text", turn.question));
    if (turn.studentAnswer) {
      const student = element("div", "student-submission");
      student.append(element("p", "message-label", "我的答案"), element("p", "user-text", turn.studentAnswer));
      user.append(student);
    }
    if (turn.images?.length) {
      const imageList = element("div", "message-images");
      for (const image of turn.images) {
        const preview = element("img");
        preview.src = image.dataUrl || "";
        preview.alt = image.name || "题目图片";
        imageList.append(preview);
      }
      user.append(imageList);
    }
    const response = element("div", "assistant-message");
    const heading = element("div", "assistant-header");
    const mark = element("span", "assistant-mark", "学");
    mark.setAttribute("aria-hidden", "true");
    heading.append(mark, element("span", "", "像素学习站"));
    response.append(heading);
    if (turn.status === "pending") {
      const text = element("p", "pending-text");
      text.setAttribute("role", "status");
      const spinner = element("span", "spinner"); spinner.setAttribute("aria-hidden", "true");
      text.append(spinner, document.createTextNode("正在梳理思路，准备一份清晰的解答…"));
      response.append(text);
    } else if (turn.status === "error") {
      const error = element("p", "error-text", turn.error);
      error.setAttribute("role", "alert");
      const retry = element("button", "retry-button", "重新尝试");
      retry.type = "button";
      retry.disabled = pending.has(session.id);
      retry.addEventListener("click", () => runRequest(session.id, turn.id));
      response.append(error, retry);
    } else {
      response.append(renderLayeredAnswer(turn.answer));
      const recommendation = videoCard(turn.video);
      if (recommendation) response.append(recommendation);
      const actions = element("div", "answer-actions");
      const copy = element("button", "copy-button", "复制完整解答"); copy.type = "button";
      copy.addEventListener("click", () => copyText(turn.answer, copy));
      const alternate = element("button", "answer-action", "换一种说法"); alternate.type = "button";
      alternate.addEventListener("click", () => draftFollowup("请把刚才的内容换一种说法，使用更简单的语言解释。"));
      const hint = element("button", "answer-action", "给我一步提示"); hint.type = "button";
      hint.addEventListener("click", () => draftFollowup("请只给我下一步提示，不要直接告诉我完整答案。"));
      const check = element("button", "answer-action", "检查我是否真的懂了"); check.type = "button";
      check.addEventListener("click", () => draftFollowup("请出一个小问题检查我是否真正理解了刚才的知识点。"));
      actions.append(copy, alternate, hint, check); response.append(actions);
    }
    article.append(user, response); conversation.append(article);
  }
  scrollArea.scrollTop = forceBottom || nearBottom ? scrollArea.scrollHeight : oldScroll;
}
function selectSession(id) {
  captureDraft();
  positions.set(state.activeId, scrollArea.scrollTop);
  state.activeId = id;
  save();
  const session = current();
  questionInput.value = session.draft.question;
  studentAnswerInput.value = session.draft.studentAnswer;
  updateComposer(); renderDraftImages(); renderHistory(); renderConversation();
  scrollArea.scrollTop = positions.get(id) ?? scrollArea.scrollHeight;
  setDrawer(false);
  questionInput.focus({ preventScroll: true });
}
function newSession() {
  captureDraft();
  const session = createSession();
  state.sessions.push(session);
  selectSession(session.id);
}
async function runRequest(sessionId, turnId) {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session || pending.has(sessionId)) return;
  const turn = session.turns.find((t) => t.id === turnId);
  if (!turn) return;
  const controller = new AbortController();
  pending.set(sessionId, controller);
  turn.history ??= historyFor(session, session.turns.indexOf(turn));
  turn.status = "pending"; turn.error = "";
  save(); renderHistory();
  if (state.activeId === sessionId) { renderConversation(); updateComposer(); }
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    if (turn.images.length) {
      const hydrated = await attachments.hydrateImages(turn.images);
      if (hydrated.length !== turn.images.length) throw new Error("部分图片已无法读取，请重新添加后再试。");
      turn.images = hydrated;
    }
    const response = await fetch("/api/homework", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: turn.question, studentAnswer: turn.studentAnswer,
        history: turn.history, images: turn.images }), signal: controller.signal,
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error("服务返回了无法读取的内容，请稍后重试。"); }
    if (!response.ok || result?.success !== true || typeof result.answer !== "string" || !result.answer.trim()) {
      throw new Error(typeof result?.message === "string" ? result.message : "这次没有取得有效讲解，请稍后重试。");
    }
    turn.answer = result.answer;
    turn.video = videos.publicVideo(videos.getVideo(result.video?.libraryId));
    turn.status = "success";
    delete turn.history;
  } catch (error) {
    if (!pageLeaving) {
      turn.status = "error";
      turn.error = error.name === "AbortError" ? "请求超时或已中断，原问题已保留，可以重试。" :
        error instanceof TypeError ? "无法连接到本地服务，请确认服务仍在运行，然后重试。" : error.message;
    }
  } finally {
    clearTimeout(timeout);
    pending.delete(sessionId);
    // Deleted sessions must never be recreated by a late network response.
    if (!pageLeaving && state.sessions.some((s) => s.id === sessionId)) {
      session.updatedAt = Date.now(); save(); renderHistory();
      if (state.activeId === sessionId) {
        renderConversation(); updateComposer();
        if (turn.status === "success") toast("解答完成，可以继续追问");
      } else toast(`“${session.title.slice(0, 18)}”${turn.status === "success" ? "的解答已完成" : "暂未回答成功，可返回重试"}`);
    }
  }
}
$("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (composing || pending.has(state.activeId)) return;
  const question = questionInput.value.trim();
  const images = current().draft.images;
  if (!question && !images.length) { questionInput.focus(); toast("先写下题目，或添加一张题目图片吧。"); return; }
  const session = current();
  const turn = createTurn(session, question, studentAnswerInput.value.trim(), images);
  if (!session.turns.length && session.title === "新的学习问题") session.title = question.replace(/\s+/g, " ").slice(0, 24) || "图片题目";
  session.turns.push(turn); session.updatedAt = Date.now();
  questionInput.value = ""; studentAnswerInput.value = "";
  session.draft.images = [];
  captureDraft(); save();
  renderDraftImages(); renderConversation(true);
  void runRequest(session.id, turn.id);
  questionInput.focus({ preventScroll: true });
});
for (const input of [questionInput, studentAnswerInput]) {
  input.addEventListener("input", updateDraft);
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; updateDraft(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing && !composing && event.keyCode !== 229) {
      event.preventDefault(); $("#chat-form").requestSubmit();
    }
  });
}
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择。"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片无法识别，请换一张 JPG、PNG 或 WEBP 图片。"));
      image.onload = () => {
        const maxEdge = 1800;
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d", { alpha: false });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let dataUrl = canvas.toDataURL("image/jpeg", 0.86);
        if (dataUrl.length > 2_400_000) dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        if (dataUrl.length > 2_500_000) return reject(new Error("图片压缩后仍然太大，请裁剪后再试。"));
        resolve({ name: file.name || "截图.png", type: "image/jpeg", dataUrl, width: canvas.width, height: canvas.height });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function addImageFiles(files, source = "file") {
  if (!files.length) return;
  const session = current();
  if (session.draft.images.length + files.length > 3) {
    toast("一次最多添加 3 张图片");
    return;
  }
  let added = 0;
  for (const file of files) {
    if (!/^image\/(?:jpeg|png|webp|bmp)$/.test(file.type)) {
      toast(`“${file.name}”不是支持的图片格式`);
      continue;
    }
    if (file.size > 8_000_000) {
      toast(`“${file.name}”超过 8 MB，请先压缩图片`);
      continue;
    }
    try {
      const image = await readImage(file);
      try {
        session.draft.images.push(await attachments.put(image));
      } catch {
        session.draft.images.push(image);
        warnStorage("图片无法保存到浏览器，仍可在本次问答中使用；刷新后图片不会保留。");
      }
      added += 1;
    } catch (error) {
      toast(error.message);
    }
  }
  save(); renderDraftImages();
  if (added) toast(source === "paste" ? `已粘贴 ${added} 张截图` : `已添加 ${added} 张图片`);
}

imageInput.addEventListener("change", () => {
  const files = [...imageInput.files];
  imageInput.value = "";
  void addImageFiles(files);
});

function pastedImageFiles(clipboardData) {
  if (!clipboardData?.items) return [];
  return [...clipboardData.items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
}

$("#chat-form").addEventListener("paste", (event) => {
  const files = pastedImageFiles(event.clipboardData);
  if (!files.length) return;
  event.preventDefault();
  void addImageFiles(files, "paste");
});
$("#new-chat").addEventListener("click", newSession);
$("#manage-videos").addEventListener("click", () => { renderVideoManager(); $("#video-manager-dialog").showModal(); $("#video-url").focus(); });
$("#close-video-manager").addEventListener("click", () => $("#video-manager-dialog").close());
$("#video-form-cancel").addEventListener("click", resetVideoForm);
$("#video-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = $("#video-edit-id").value;
  const payload = { url: $("#video-url").value.trim(), title: $("#video-title").value.trim(), topic: $("#video-topic").value.trim(), level: $("#video-level").value.trim(), duration: $("#video-duration").value.trim(), keywords: $("#video-keywords").value.split(",").map((item) => item.trim()).filter(Boolean) };
  try {
    const response = await fetch(editId ? `/api/videos/${encodeURIComponent(editId)}` : "/api/videos", { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "保存失败");
    await loadVideoLibrary(); resetVideoForm(); $("#video-manager-message").textContent = "视频库已保存。";
  } catch (error) { $("#video-manager-message").textContent = error.message || "保存失败，原视频库未改变。"; }
});
$("#video-manager-dialog").addEventListener("close", resetVideoForm);
window.addEventListener("beforeunload", () => { pageLeaving = true; captureDraft(); save(); });
window.addEventListener("pagehide", () => {
  pageLeaving = true; captureDraft(); save();
  for (const controller of pending.values()) controller.abort();
});
window.addEventListener("pageshow", (event) => {
  pageLeaving = false;
  if (!event.persisted) return;
  pending.clear();
  for (const session of state.sessions) for (const turn of session.turns) {
    if (turn.status === "pending") {
      turn.status = "error"; turn.error = "上次请求因离开页面而中断，可以重试。";
    }
  }
  save(); renderHistory(); renderConversation(); updateComposer();
});
document.addEventListener("visibilitychange", () => { if (document.hidden) { captureDraft(); save(); } });

function setDrawer(open) {
  const expanded = open && mobile.matches;
  sidebar.classList.toggle("open", expanded);
  sidebar.inert = mobile.matches && !expanded;
  workspace.inert = expanded;
  $("#drawer-backdrop").hidden = !expanded;
  $("#open-drawer").setAttribute("aria-expanded", String(expanded));
  if (expanded) {
    sidebar.setAttribute("role", "dialog"); sidebar.setAttribute("aria-modal", "true");
    $("#close-drawer").focus();
  } else {
    sidebar.removeAttribute("role"); sidebar.removeAttribute("aria-modal");
  }
}
$("#open-drawer").addEventListener("click", () => setDrawer(true));
for (const target of [$("#close-drawer"), $("#drawer-backdrop")]) target.addEventListener("click", () => {
  setDrawer(false); $("#open-drawer").focus();
});
mobile.addEventListener("change", () => setDrawer(false));
document.addEventListener("keydown", (event) => {
  if (!sidebar.classList.contains("open") || $("#session-dialog").open) return;
  if (event.key === "Escape") { setDrawer(false); $("#open-drawer").focus(); }
  if (event.key === "Tab") {
    const buttons = [...sidebar.querySelectorAll("button")].filter((button) => !button.disabled && button.getClientRects().length);
    const first = buttons[0]; const last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
function openSessionDialog(session, action, opener) {
  dialogTarget = { id: session.id, action, opener };
  const deleting = action === "delete";
  $("#dialog-title").textContent = deleting ? "删除这段会话？" : "重命名会话";
  $("#dialog-description").textContent = deleting ? `“${session.title}”的问答和草稿将从当前浏览器删除，无法恢复。` : "起一个方便下次找到的名字。";
  $("#rename-input").hidden = deleting;
  $("#rename-label").hidden = deleting;
  $("#rename-input").required = !deleting;
  $("#rename-input").value = session.title;
  $("#dialog-confirm").textContent = deleting ? "确认删除" : "保存";
  $("#session-dialog").showModal();
  if (!deleting) { $("#rename-input").focus(); $("#rename-input").select(); }
  else $("#session-dialog button[value=cancel]").focus();
}
$("#dialog-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") { $("#session-dialog").close(); return; }
  const session = state.sessions.find((s) => s.id === dialogTarget?.id);
  if (!session) { $("#session-dialog").close(); return; }
  if (dialogTarget.action === "rename") {
    const title = $("#rename-input").value.trim();
    if (!title) { $("#rename-input").focus(); return; }
    session.title = title; save(); renderHistory();
    if (state.activeId === session.id) $("#session-title").textContent = title;
  } else {
    pending.get(session.id)?.abort(); pending.delete(session.id);
    const deletedImages = [
      ...session.draft.images,
      ...session.turns.flatMap((turn) => turn.images),
    ];
    const active = session.id === state.activeId;
    if (!active) captureDraft();
    state.sessions = state.sessions.filter((s) => s.id !== session.id);
    positions.delete(session.id);
    if (!state.sessions.length) state.sessions.push(createSession());
    if (active) {
      state.activeId = [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
      questionInput.value = current().draft.question;
      studentAnswerInput.value = current().draft.studentAnswer;
      updateComposer(); renderConversation(true);
    }
    save(); renderHistory(); toast("会话已删除");
    void attachments.removeImages(deletedImages).catch(() => warnStorage("会话已删除，但本地图片副本暂时无法清理。"));
  }
  $("#session-dialog").close();
});
$("#session-dialog").addEventListener("close", () => {
  const target = dialogTarget;
  dialogTarget = null;
  if (target?.opener.isConnected) target.opener.focus();
  else if (sidebar.classList.contains("open") || !mobile.matches) $("#new-chat").focus();
  else questionInput.focus({ preventScroll: true });
});
questionInput.value = current().draft.question;
studentAnswerInput.value = current().draft.studentAnswer;
renderHistory(); renderConversation(true); updateComposer(); setDrawer(false);
renderDraftImages();
saveQueued = true;
void restoreAttachments();
void loadVideoLibrary();
