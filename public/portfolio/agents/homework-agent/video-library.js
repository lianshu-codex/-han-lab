(function (root) {
  "use strict";

  const FALLBACK_LIBRARY = [
    ["math-chicken-rabbit-list", "bilibili", "BV1XELLzJENX", "鸡兔同笼：列表法", "鸡兔同笼", "小学四至五年级", "10:08", ["鸡兔同笼", "列表法", "枚举", "数学应用题"]],
    ["math-chicken-rabbit-assumption", "bilibili", "BV1rD4y1J7qj", "鸡兔同笼：假设法", "鸡兔同笼", "小学四至五年级", "13:11", ["鸡兔同笼", "假设法", "数学应用题"]],
    ["math-chicken-rabbit-intro", "bilibili", "BV1jb4y1G7Ki", "鸡兔同笼入门讲解", "鸡兔同笼", "小学三至六年级", "3:22", ["鸡兔同笼", "数学", "应用题"]],
    ["python-for-loop", "bilibili", "BV1QhMJ6wEJo", "Python for 循环", "Python 循环", "编程入门", "9:49", ["python", "for", "循环", "range", "编程"]],
    ["python-loop-control", "bilibili", "BV15pVD6qEHD", "Python 循环与 break", "Python 循环", "编程入门", "约 4 分钟", ["python", "for", "while", "break", "continue", "循环"]],
    ["cpp-for-loop", "bilibili", "BV1Y6oVYGE4v", "C++ for 循环", "C++ 循环", "C++ 入门", "7:02", ["c++", "cpp", "for", "循环", "编程"]],
    ["math-chicken-rabbit-drawing", "douyin", "7565467211612114185", "边画边讲：鸡兔同笼", "鸡兔同笼", "小学四至五年级", "短视频", ["鸡兔同笼", "画图", "数学应用题"]],
    ["math-drawing-method", "douyin", "7580437139121261870", "小学数学画图法", "数学画图法", "小学阶段", "短视频", ["数学", "画图法", "应用题"]],
    ["math-chicken-rabbit-variation", "douyin", "7613245634494184619", "鸡兔同笼：假设法讲解", "鸡兔同笼", "小学四至五年级", "短视频", ["鸡兔同笼", "假设法", "数学"]],
    ["cpp-for-exercise", "douyin", "7356232455113706763", "C++ for 循环练习", "C++ 循环", "C++ 入门", "短视频", ["c++", "cpp", "for", "循环", "练习"]],
    ["python-while-loop", "douyin", "7560361377802571060", "Python while 循环", "Python 循环", "编程入门", "短视频", ["python", "while", "循环", "编程"]],
    ["python-loop-basics", "douyin", "7569595643430194484", "Python 循环变量", "Python 循环", "编程入门", "短视频", ["python", "循环", "变量", "累加"]],
  ].map(([libraryId, platform, providerId, title, topic, level, duration, keywords]) => ({
    libraryId, platform, providerId, title, topic, level, duration, keywords,
    url: platform === "bilibili" ? `https://www.bilibili.com/video/${providerId}/` : `https://www.douyin.com/video/${providerId}`,
  }));

  let library = FALLBACK_LIBRARY;
  let byId = new Map(library.map((video) => [video.libraryId, video]));
  function setLibrary(items) {
    if (!Array.isArray(items)) return false;
    const next = items.filter((video) => video && typeof video.libraryId === "string" &&
      (video.platform === "bilibili" || video.platform === "douyin") && typeof video.url === "string").map((video) => ({ ...video }));
    if (!next.length) return false;
    library = next; byId = new Map(next.map((video) => [video.libraryId, video])); return true;
  }
  function getVideo(libraryId) { return typeof libraryId === "string" ? byId.get(libraryId) || null : null; }
  function candidates() { return library.map(({ libraryId, title, topic, level, duration, keywords }) => ({ libraryId, title, topic, level, duration, keywords })); }
  function publicVideo(video) { return video ? { libraryId: video.libraryId, platform: video.platform, title: video.title, topic: video.topic, level: video.level, duration: video.duration, url: video.url } : null; }
  function linkFor(recommendation) { const video = getVideo(recommendation?.libraryId); return video && /^https:\/\/(?:www\.bilibili\.com|www\.douyin\.com)\//.test(video.url) ? { video, url: video.url } : null; }
  const api = { FALLBACK_LIBRARY, setLibrary, getVideo, candidates, publicVideo, linkFor, get VIDEO_LIBRARY() { return library; } };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.TeachingVideos = api;
})(globalThis);
