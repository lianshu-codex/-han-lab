(function (root) {
  "use strict";

  // Keep the key so existing v1 records can be migrated in place.
  const STORAGE_KEY = "teaching-assistant.v1";
  const STORAGE_VERSION = 4;
  const id = () => globalThis.crypto.randomUUID();
  const validDataUrl = (image) => typeof image.dataUrl === "string" && image.dataUrl.length <= 2_500_000 &&
    /^data:image\/(?:jpeg|png|webp|bmp);base64,[A-Za-z0-9+/=\r\n]+$/.test(image.dataUrl);

  function createSession() {
    return { id: id(), title: "新的学习问题", updatedAt: Date.now(),
      draft: { question: "", studentAnswer: "", images: [] }, turns: [] };
  }

  function userText(turn) {
    return turn.question + (turn.studentAnswer ? `\n\n我的答案：\n${turn.studentAnswer}` : "");
  }

  function historyFor(session, before = session.turns.length) {
    return session.turns.slice(0, before).filter((turn) => turn.status === "success")
      .slice(-10).flatMap((turn) => [
        { role: "user", content: userText(turn) }, { role: "assistant", content: turn.answer },
      ]);
  }

  function copyImage(image) {
    const copy = { name: image.name, type: image.type, width: image.width, height: image.height };
    if (typeof image.id === "string") copy.id = image.id;
    if (typeof image.dataUrl === "string") copy.dataUrl = image.dataUrl;
    return copy;
  }

  function createTurn(session, question, studentAnswer, images = []) {
    return { id: id(), question, studentAnswer, status: "pending",
      answer: "", error: "", video: null, images: images.map(copyImage), history: historyFor(session) };
  }

  function savedVideo(video) {
    if (!video || typeof video !== "object" || Array.isArray(video) ||
      typeof video.libraryId !== "string" || video.libraryId.length > 100 ||
      typeof video.platform !== "string" || video.platform.length > 30 ||
      typeof video.title !== "string" || video.title.length > 180 ||
      typeof video.topic !== "string" || video.topic.length > 120) return null;
    return { libraryId: video.libraryId, platform: video.platform, title: video.title, topic: video.topic };
  }

  function validImage(image, version) {
    if (!image || typeof image !== "object" || typeof image.name !== "string" || image.name.length > 180 ||
      typeof image.type !== "string" || !/^(image\/jpeg|image\/png|image\/webp|image\/bmp)$/.test(image.type) ||
      (image.width !== undefined && !Number.isInteger(image.width)) ||
      (image.height !== undefined && !Number.isInteger(image.height))) return false;
    if (version === 1) return validDataUrl(image);
    return typeof image.id === "string" && image.id.length > 0 && image.id.length <= 100;
  }

  function validateHistory(history) {
    return Array.isArray(history) && history.length <= 20 && history.length % 2 === 0 && !history.some((entry, index) =>
      !entry || entry.role !== (index % 2 ? "assistant" : "user") || typeof entry.content !== "string");
  }

  function restore(raw) {
    const version = raw?.version;
    if (!raw || ![1, 2, 3, STORAGE_VERSION].includes(version) || !Array.isArray(raw.sessions) || !raw.sessions.length) {
      throw new Error("invalid saved state");
    }
    const ids = new Set();
    const sessions = raw.sessions.map((session) => {
      if (!session || typeof session.id !== "string" || !session.id || ids.has(session.id) ||
        typeof session.title !== "string" || !Array.isArray(session.turns) || !session.draft ||
        typeof session.draft.question !== "string" || typeof session.draft.studentAnswer !== "string" ||
        (session.draft.images !== undefined && (!Array.isArray(session.draft.images) || session.draft.images.length > 3 ||
          session.draft.images.some((image) => !validImage(image, version))))) {
        throw new Error("invalid saved session");
      }
      ids.add(session.id);
      const turnIds = new Set();
      const turns = session.turns.map((turn) => {
        if (!turn || typeof turn.id !== "string" || turnIds.has(turn.id) || typeof turn.question !== "string" ||
          typeof turn.studentAnswer !== "string" ||
          !["pending", "success", "error"].includes(turn.status) || typeof turn.answer !== "string" ||
          (turn.status === "success" && !turn.answer.trim())) throw new Error("invalid saved turn");
        turnIds.add(turn.id);
        if (turn.images !== undefined && (!Array.isArray(turn.images) || turn.images.length > 3 ||
          turn.images.some((image) => !validImage(image, version)))) throw new Error("invalid saved image");
        if (turn.history !== undefined && !validateHistory(turn.history)) throw new Error("invalid saved context");
        return { id: turn.id, question: turn.question, studentAnswer: turn.studentAnswer,
          status: turn.status === "pending" ? "error" : turn.status, answer: turn.answer,
          error: turn.status === "pending" ? "上次请求因页面关闭或刷新而中断，可以重试。" : String(turn.error || ""),
          video: savedVideo(turn.video), images: (turn.images || []).map(copyImage),
          ...(turn.history ? { history: turn.history.map(({ role, content }) => ({ role, content })) } : {}) };
      });
      return { id: session.id, title: session.title === "新的教学灵感" ? "新的学习问题" : (session.title.slice(0, 60) || "新的学习问题"),
        updatedAt: Number.isFinite(session.updatedAt) ? session.updatedAt : Date.now(), turns,
        draft: { question: session.draft.question, studentAnswer: session.draft.studentAnswer,
          images: (session.draft.images || []).map(copyImage) } };
    });
    return { version: version === 1 ? 1 : STORAGE_VERSION, sessions,
      activeId: ids.has(raw.activeId) ? raw.activeId : sessions[0].id };
  }

  function snapshot(state) {
    const imageReference = ({ id: attachmentId, name, type, width, height }) =>
      typeof attachmentId === "string" ? { id: attachmentId, name, type, width, height } : null;
    const cleanImages = (images) => images.map(imageReference).filter(Boolean);
    return { version: STORAGE_VERSION, activeId: state.activeId, sessions: state.sessions.map((session) => ({
      id: session.id, title: session.title, updatedAt: session.updatedAt,
      draft: { question: session.draft.question, studentAnswer: session.draft.studentAnswer,
        images: cleanImages(session.draft.images) },
      turns: session.turns.map((turn) => ({ id: turn.id, question: turn.question, studentAnswer: turn.studentAnswer,
        status: turn.status, answer: turn.answer, error: turn.error, video: savedVideo(turn.video),
        images: cleanImages(turn.images), ...(turn.history ? { history: turn.history } : {}) })),
    })) };
  }

  const api = { STORAGE_KEY, STORAGE_VERSION, createSession, createTurn, historyFor, userText, restore, snapshot };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TeachingState = api;
})(globalThis);
