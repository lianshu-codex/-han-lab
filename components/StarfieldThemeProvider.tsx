'use client';
import { ThemeProvider } from 'next-themes';
export function StarfieldThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>{children}</ThemeProvider>;
}
