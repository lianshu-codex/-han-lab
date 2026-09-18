'use client';

import { StarfieldBackground } from '../components/upstream/StarfieldBackground';
import { SiteHeader, siteRoutes } from '../components/SiteHeader';

const socials = ['in', 'GH', '◎', 'ORCID', 'Bē'];

export default function Home() {
  return (
    <>
      <StarfieldBackground />
      <SiteHeader active="/" trailing={<button className="theme-button" aria-label="切换主题" type="button">◐</button>} />

      <main className="layout home" id="home">
        <section className="hero" aria-label="个人介绍">
          <div className="hero-top">
            <div className="hero-copy">
              <div className="eyebrow"><span className="dot" /> LEARNING LAB <span className="separator">·</span> NOTES, COURSES &amp; PROJECTS <span className="dot" /></div>
              <h1 className="name-aberration" data-text="Hand Lab">Hand <span>Lab</span></h1>
              <h2>把一堂课、一个想法和一次动手尝试，做成值得再看一遍的学习作品。</h2>
            </div>
            <div className="avatar-wrap"><img src="/hand-lab-symbol.png" alt="hand lab logo" className="avatar" /></div>
          </div>
          <p className="intro">这里记录课程、手记与作品集。<strong>从学习出发</strong>，把复杂问题拆开、做出来，再分享给正在路上的人。</p>
          <div className="social-row" aria-label="社交链接">{socials.map((social) => <a href="#contact" aria-label={social} key={social}>{social}</a>)}</div>
        </section>

        <section className="content-section" id="research"><h3 className="title-aberration" data-text="研究">研究</h3><p className="section-lede">正在整理中的学习实验与研究方向。 <a href="/research">查看完整时间线</a></p><div className="timeline-row"><time>2026</time><span>从课程设计、AI 工具与动手实践开始，持续记录可复用的方法。</span></div></section>
        <section className="content-section" id="blog"><h3 className="title-aberration" data-text="博客">博客</h3><p className="section-lede">关于学习、制作和复盘的短文。 <a href="/blog">阅读全部文章</a></p><article className="feature-item"><div className="feature-meta">最新手记</div><h4 className="title-aberration" data-text="把一个好问题做成一件学习作品">把一个好问题做成一件学习作品</h4><p>内容即将加入。</p></article></section>
        <section className="content-section" id="portfolio">
          <h3 className="title-aberration" data-text="作品集">作品集</h3>
          <p className="section-lede">应用、PPT、Agent 与小游戏，按作品类型整理。 <a href="/portfolio">查看全部作品</a></p>
          <article className="home-featured-work">
            <div>
              <span>精选作品 · 小游戏</span>
              <h4 className="title-aberration" data-text="2048 数字合成">2048 数字合成</h4>
              <p>支持键盘与触摸操作，可以直接在网页中体验。</p>
            </div>
            <a className="featured-work-link" href="/portfolio/viewer?src=%2Fportfolio%2Fgames%2F2048-classic%2Findex.html&amp;title=2048%20%E6%95%B0%E5%AD%97%E5%90%88%E6%88%90">打开体验 ↗</a>
          </article>
          <div className="portfolio-grid"><a href="/portfolio#apps">应用</a><a href="/portfolio#ppt">PPT</a><a href="/portfolio#agents">Agent</a><a href="/portfolio#games">小游戏</a></div>
        </section>
        <section className="content-section" id="resume"><h3 className="title-aberration" data-text="简历">简历</h3><p className="section-lede">经历、能力与联系方式会在这里更新。 <a href="/resume">查看简历</a></p></section>
      </main>

      <footer className="layout footer" id="contact"><hr /><div className="footer-grid"><div><b>ME</b>{siteRoutes.map(([label, href]) => <a href={href} key={`footer-${href}`}>{label}</a>)}</div><div><b>SITE</b><a href="#contact">联系</a><a href="/">返回首页</a></div><div className="footer-social">{socials.map((social) => <a href="#contact" key={`footer-${social}`}>{social}</a>)}</div></div><hr /><p className="copyright">© 2026 Hand Lab · All Rights Reserved</p></footer>
    </>
  );
}
