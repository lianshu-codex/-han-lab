import Link from 'next/link';
import { StarfieldBackground } from './upstream/StarfieldBackground';
import { SiteHeader, siteRoutes } from './SiteHeader';

type SectionPageProps = {
  path: '/research' | '/blog' | '/resume';
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
};

export function SectionPage({ path, eyebrow, title, intro, children }: SectionPageProps) {
  return (
    <>
      <StarfieldBackground />
      <SiteHeader active={path} />
      <main className="layout section-page">
        <header className="section-page-intro">
          <p className="eyebrow"><span className="dot" /> {eyebrow}</p>
          <h1 className="name-aberration" data-text={title}>{title}</h1>
          <p>{intro}</p>
        </header>
        <div className="section-page-body">{children}</div>
      </main>
      <footer className="layout footer section-footer">
        <hr />
        <div className="footer-grid">
          <div><b>ME</b>{siteRoutes.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</div>
          <div><b>HAND LAB</b><Link href="/portfolio">浏览作品</Link><Link href="/">返回首页</Link></div>
        </div>
        <hr />
        <p className="copyright">© 2026 hand lab · All Rights Reserved</p>
      </footer>
    </>
  );
}
