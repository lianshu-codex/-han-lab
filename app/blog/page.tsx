import { SectionPage } from '../../components/SectionPage';

export default function BlogPage() {
  return <SectionPage path="/blog" eyebrow="NOTES & WRITING" title="博客" intro="关于学习、制作与复盘的手记。">
    <article className="section-entry">
      <div className="entry-meta"><time>2026</time><span>最新手记</span></div>
      <div><h2 className="title-aberration" data-text="把一个好问题做成一件学习作品">把一个好问题做成一件学习作品</h2><p>内容正在整理中。这里会保留思考的过程，而不只展示最后的答案。</p></div>
    </article>
  </SectionPage>;
}
