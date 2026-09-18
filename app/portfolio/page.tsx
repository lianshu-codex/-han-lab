'use client';

import { useEffect, useState } from 'react';
import { StarfieldBackground } from '../../components/upstream/StarfieldBackground';
import { SiteHeader } from '../../components/SiteHeader';

type Work = {
  title: string;
  description: string;
  href: string;
  tag: string;
  download?: string;
  thumbnail?: string;
  meta?: string;
};

const apps: Work[] = [
  { title: '课堂随机点名', description: '面向课堂使用的随机点名工具。', href: '/portfolio/apps/random-roll-call.html', tag: '应用' },
  { title: '教师备课进度管理', description: '用于安排课程与追踪备课进度。', href: '/portfolio/apps/lesson-planner.html', tag: '应用' },
  { title: '钢琴演示 C1–C3', description: '覆盖低音区的网页钢琴演示。', href: '/portfolio/apps/piano-c1-c3.html', tag: '应用' },
  { title: '钢琴演示 C3–C5', description: '覆盖中音区的网页钢琴演示。', href: '/portfolio/apps/piano-c3-c5.html', tag: '应用' },
  { title: '钢琴演示 C5–C8', description: '覆盖高音区的网页钢琴演示。', href: '/portfolio/apps/piano-c5-c8.html', tag: '应用' },
];

const agents: Work[] = [
  { title: '作业辅导助手', description: '支持文字、图片和代码题的像素风学习助手。站内展示前端交互界面。', href: '/portfolio/agents/homework-agent/index.html', tag: 'Agent', meta: '界面预览' },
];

const games: Work[] = [
  { title: '花园连连看', description: '花园主题的配对消除小游戏。', href: '/portfolio/games/garden-match/index.html', tag: '小游戏' },
  { title: '拼花小作坊', description: '通过拼图组合完成图案挑战。', href: '/portfolio/games/garden-match/puzzle.html', tag: '小游戏' },
  { title: '霓虹贪吃蛇', description: '带有霓虹视觉与即时计分的经典玩法。', href: '/portfolio/games/neon-snake.html', tag: '小游戏' },
  { title: '霓虹俄罗斯方块', description: '可直接在浏览器游玩的方块消除游戏。', href: '/portfolio/games/neon-tetris.html', tag: '小游戏' },
  { title: '霓虹俄罗斯方块 · 实验版', description: '另一套交互与视觉实现。', href: '/portfolio/games/neon-tetris-lab.html', tag: '小游戏' },
  { title: '2048 数字合成', description: '支持键盘与触摸操作的经典 2048。', href: '/portfolio/games/2048-classic/index.html', tag: '小游戏' },
  { title: '霓虹三合', description: '三枚棋子的轻量策略小游戏。', href: '/portfolio/games/neon-triad/index.html', tag: '小游戏' },
];

const pptGroups: Record<string, Work[]> = {
  'C++': [
    ['一维数组的插入问题', 'array-insert', '10 页'], ['一维数组的删除', 'array-delete', '17 页'], ['一维数组计数（一）', 'array-count-one', '17 页'], ['进制（一）：认识进制与 C++ 表示', 'number-systems-one', '24 页'], ['进制（二）：进制转换与程序应用', 'number-systems-two', '21 页'],
  ].map(([title, slug, meta]) => ({ title, description: 'C++ 教学课件', href: `/portfolio/ppt/cpp/${slug}.pdf`, download: `/portfolio/ppt/cpp/${slug}.pptx`, thumbnail: `/portfolio/ppt/cpp/${slug}.png`, tag: 'C++', meta })),
  '奥数': [
    ['四年级奥数 第 01 课：加减法巧算', 'grade4-clever-add-subtract', '28 页'], ['四年级奥数 第 02 课：乘除法巧算', 'grade4-clever-multiply-divide', '29 页'],
  ].map(([title, slug, meta]) => ({ title, description: '四年级数学思维课件', href: `/portfolio/ppt/math/${slug}.pdf`, download: `/portfolio/ppt/math/${slug}.pptx`, thumbnail: `/portfolio/ppt/math/${slug}.png`, tag: '奥数', meta })),
  'Python': [
    ['认识 Python：第一课', 'intro-python', '32 页'], ['print 打印输出', 'print-output', '26 页'], ['for 循环', 'for-loop', '21 页'], ['多维列表', 'multidimensional-list', '24 页'], ['运算符的优先级', 'operator-precedence', '25 页'], ['数据类型', 'data-types', '16 页'], ['数据的输入', 'input', '19 页'], ['海龟绘图基础指令', 'turtle-basics', '31 页'], ['for 与 while 循环习题课', 'for-while-practice', '10 页'], ['bool 数据与比较表达式', 'bool-comparisons', '23 页'],
  ].map(([title, slug, meta]) => ({ title, description: 'Python 教学课件', href: `/portfolio/ppt/python/${slug}.pdf`, download: `/portfolio/ppt/python/${slug}.pptx`, thumbnail: `/portfolio/ppt/python/${slug}.png`, tag: 'Python', meta })),
};

function WorkList({ items, onPreview }: { items: Work[]; onPreview: (item: Work) => void }) {
  return <div className="work-list">{items.map((item) => <article className="work-row" key={item.href}>
    {item.thumbnail && <button className="work-thumb" onClick={() => onPreview(item)} aria-label={`预览 ${item.title}`}><img src={item.thumbnail} alt="" /></button>}
    <div className="work-copy"><div className="work-kicker"><span>{item.tag}</span>{item.meta && <small>{item.meta}</small>}</div><h3>{item.title}</h3><p>{item.description}</p></div>
    <div className="work-actions"><button onClick={() => onPreview(item)}>网页预览 ↗</button>{item.download && <a href={item.download} download>下载 PPTX</a>}</div>
  </article>)}</div>;
}

export default function PortfolioPage() {
  const [preview, setPreview] = useState<Work | null>(null);
  const [pptCategory, setPptCategory] = useState('C++');
  const openPreview = (item: Work) => {
    window.history.pushState({ ...window.history.state, portfolioPreview: true }, '', window.location.href);
    setPreview(item);
  };
  const closePreview = () => {
    setPreview(null);
    if (window.history.state?.portfolioPreview) window.history.back();
  };
  useEffect(() => {
    document.body.style.overflow = preview ? 'hidden' : '';
    const closeFromHistory = () => setPreview(null);
    const closeFromKeyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') closePreview(); };
    window.addEventListener('popstate', closeFromHistory);
    window.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('popstate', closeFromHistory);
      window.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [preview]);

  return <>
    <StarfieldBackground />
    <SiteHeader active="/portfolio" trailing={<span className="portfolio-count">30 件作品</span>} />
    <main className="layout portfolio-page">
      <header className="portfolio-intro"><p className="eyebrow"><span className="dot" /> HAND LAB ARCHIVE</p><h1 className="name-aberration" data-text="作品集">作品集</h1><p>应用、Agent、小游戏与教学课件。点击任意项目，可直接在网页中查看。</p></header>
      <section className="portfolio-section" id="apps"><div className="section-heading"><div><span>01</span><h2 className="title-aberration" data-text="应用">应用</h2></div><b>{apps.length}</b></div><WorkList items={apps} onPreview={openPreview} /></section>
      <section className="portfolio-section" id="agents"><div className="section-heading"><div><span>02</span><h2 className="title-aberration" data-text="Agent">Agent</h2></div><b>{agents.length}</b></div><WorkList items={agents} onPreview={openPreview} /></section>
      <section className="portfolio-section" id="games"><div className="section-heading"><div><span>03</span><h2 className="title-aberration" data-text="小游戏">小游戏</h2></div><b>{games.length}</b></div><WorkList items={games} onPreview={openPreview} /></section>
      <section className="portfolio-section" id="ppt"><div className="section-heading"><div><span>04</span><h2 className="title-aberration" data-text="PPT">PPT</h2></div><b>17</b></div><div className="ppt-tabs" role="tablist" aria-label="PPT 分类">{Object.keys(pptGroups).map((category) => <button className={pptCategory === category ? 'selected' : ''} onClick={() => setPptCategory(category)} role="tab" aria-selected={pptCategory === category} key={category}>{category}<span>{pptGroups[category].length}</span></button>)}</div><WorkList items={pptGroups[pptCategory]} onPreview={openPreview} /></section>
    </main>
    {preview && <div className="preview-backdrop" role="dialog" aria-modal="true" aria-label={`${preview.title} 网页预览`} onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}><div className="preview-window"><header><button className="preview-back" onClick={closePreview}>← 返回作品集</button><div className="preview-title"><span>{preview.tag} · 网页预览</span><strong>{preview.title}</strong></div><div className="preview-tools"><a href={`/portfolio/viewer?src=${encodeURIComponent(preview.href)}&title=${encodeURIComponent(preview.title)}`} target="_blank" rel="noreferrer">独立预览</a><button className="preview-close" onClick={closePreview} aria-label="关闭预览">×</button></div></header><iframe src={preview.href} title={`${preview.title} 网页预览`} /></div></div>}
  </>;
}
