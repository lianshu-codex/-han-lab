import type { Metadata } from 'next';
import './globals.css';
import './starfield-layer.css';
import './title-effects.css';
import './portfolio.css';
import './portfolio-navigation.css';
import './section-pages.css';
import './home-feature.css';
import { StarfieldThemeProvider } from '../components/StarfieldThemeProvider';

export const metadata: Metadata = { title: 'Hand Lab', description: 'Hand Lab — notes, courses, and projects.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body><StarfieldThemeProvider>{children}</StarfieldThemeProvider></body></html>;
}
