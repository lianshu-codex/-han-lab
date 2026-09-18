import { SectionPage } from '../../components/SectionPage';

export default function ResearchPage() {
  return <SectionPage path="/research" eyebrow="LEARNING & RESEARCH" title="研究" intro="课程设计、AI 工具与动手实践中的持续观察。">
    <article className="section-entry">
      <div className="entry-meta"><time>2026</time><span>进行中</span></div>
      <div><h2 className="title-aberration" data-text="让学习过程成为作品">让学习过程成为作品</h2><p>从课堂中的真实问题出发，记录设计、制作、测试与复盘的方法。</p></div>
    </article>
  </SectionPage>;
}
