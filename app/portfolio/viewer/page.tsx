'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PortfolioViewerPage() {
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('作品预览');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSource = params.get('src') || '';
    if (requestedSource.startsWith('/portfolio/') && !requestedSource.startsWith('/portfolio/viewer')) setSource(requestedSource);
    setTitle(params.get('title') || '作品预览');
  }, []);

  return <main className="standalone-viewer">
    <header><Link href="/portfolio">← 返回作品集</Link><strong>{title}</strong><span>使用浏览器后退键也可返回</span></header>
    {source ? <iframe src={source} title={title} /> : <div className="viewer-error"><p>预览地址无效。</p><Link href="/portfolio">返回作品集</Link></div>}
  </main>;
}
