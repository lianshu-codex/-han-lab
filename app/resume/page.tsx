import { SectionPage } from '../../components/SectionPage';

export default function ResumePage() {
  return <SectionPage path="/resume" eyebrow="EXPERIENCE & SKILLS" title="简历" intro="课程设计、应用开发与 AI 实践经历。">
    <article className="section-entry">
      <div className="entry-meta"><span>个人简介</span></div>
      <div><h2 className="title-aberration" data-text="hand lab">hand lab</h2><p>经历、能力与联系方式正在整理，后续会在这一页持续更新。</p></div>
    </article>
  </SectionPage>;
}
