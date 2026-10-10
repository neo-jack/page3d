import { useLayoutEffect, useRef } from 'react';
import { LEGACY_SITE_URL } from '../../../data/site';
import { showStartupFallback } from '../../../utils/startup';

export default function SceneFallback() {
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    showStartupFallback();
    heading.current?.focus();
  }, []);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-6 text-[#30302d]">
      <section className="w-full max-w-md rounded-2xl border border-[#deded8] bg-[#fffef9] p-8 shadow-sm" aria-labelledby="scene-failure-title">
        <h1 ref={heading} tabIndex={-1} id="scene-failure-title" className="text-xl font-bold outline-none">暂时无法显示 3D 页面</h1>
        <p className="mt-4 text-sm leading-7">浏览器未能启动或维持 3D 显示。你可以重试，或直接访问 2D 版个人页面。</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-[#30302d] px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-4">重新加载</button>
          <a href={LEGACY_SITE_URL} className="rounded-lg bg-[#30302d] px-4 py-2 text-sm text-white! focus-visible:outline-2 focus-visible:outline-offset-4">访问 2D 版</a>
        </div>
      </section>
    </main>
  );
}
