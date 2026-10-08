import assetGalleryArt04 from '../../../../public/textures/portfolio/gallery-art-04.png?url';
import assetGalleryArt05 from '../../../../public/textures/portfolio/gallery-art-05.png?url';
import assetGalleryArt06 from '../../../../public/textures/portfolio/gallery-art-06.png?url';
import assetGalleryArt02 from '../../../../public/textures/portfolio/gallery-art-02.png?url';
import assetGalleryArt03 from '../../../../public/textures/portfolio/gallery-art-03.png?url';
import { PORTFOLIO_WALL_LINKS } from '../../../data/site';

// 画面顺序与墙牌顺序一致：竞品研究、2D个人页面、监控、miniReact、原生选择器。
const galleryArt = [assetGalleryArt05, assetGalleryArt06, assetGalleryArt04, assetGalleryArt02, assetGalleryArt03];

/** 入口右墙的纸质画廊；由 EntranceDoors 以 Html transform 贴在墙面。 */
export default function PortfolioWallCard() {
  return (
    <section
      className="pointer-events-auto relative w-480 max-[900px]:hidden"
      style={{ fontFamily: '"tiktok", sans-serif' }}
      aria-label="个人作品集项目入口"
    >
      <div className="grid grid-cols-5 gap-x-10">
        {PORTFOLIO_WALL_LINKS.map((link, index) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="group min-w-0 text-center text-[#70766a] no-underline focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-[#52584d]"
            aria-label={link.label}
          >
            <span className="relative block aspect-[210/297] overflow-hidden border-[3px] border-[#929487]/50 bg-[#f5f4ed] shadow-none transition-transform duration-150 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5">
              <img
                src={galleryArt[index]}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: 'grayscale(0.16) saturate(0.65) brightness(1.02) contrast(0.96)' }}
              />
              <span aria-hidden="true" className="pointer-events-none absolute inset-[5%] border border-[#929487]/50" />
            </span>
            <span
              className="relative mt-2 flex min-h-28 items-center justify-center whitespace-normal border-[1.5px] border-[#929487]/50 bg-[#f5f4ed] px-3 py-2 text-center text-[52px] text-balance font-normal leading-[1.12] text-[#70766a] shadow-none"
              style={{ clipPath: 'polygon(1% 8%, 98% 0%, 100% 88%, 3% 100%, 0% 18%)' }}
            >
              <i aria-hidden="true" className="absolute left-1 top-1/2 size-1 -translate-y-1/2 rounded-full border border-[#6f6b5e]/75 bg-[#c4bfae]/70" />
              <i aria-hidden="true" className="absolute right-1 top-1/2 size-1 -translate-y-1/2 rounded-full border border-[#6f6b5e]/75 bg-[#c4bfae]/70" />
              <span>
                {link.label.split(/(竞品分析|agent|源码)/).filter(Boolean).map((part, partIndex) => (
                  <span key={partIndex} className="inline-block">{part}</span>
                ))}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
