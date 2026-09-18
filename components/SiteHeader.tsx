export const siteRoutes = [
  ['首页', '/'],
  ['研究', '/research'],
  ['博客', '/blog'],
  ['作品集', '/portfolio'],
  ['简历', '/resume'],
] as const;

export function SiteHeader({ active, trailing }: { active: string; trailing?: React.ReactNode }) {
  return (
    <header className="site-header">
      <nav className="layout nav-shell" aria-label="主导航">
        <div className="nav-links">
          {siteRoutes.map(([label, href]) => (
            <a className={active === href ? 'nav-link active' : 'nav-link'} href={href} aria-current={active === href ? 'page' : undefined} key={href}>
              {label}
            </a>
          ))}
        </div>
        {trailing}
      </nav>
    </header>
  );
}
