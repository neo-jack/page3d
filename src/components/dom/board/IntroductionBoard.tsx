import assetHangingBoard from '../../../../public/textures/about/hanging-board.webp?url';
import type { SyntheticEvent } from 'react';
import { reportStartupError } from '../../../utils/startup';

interface IntroductionBoardProps {
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
}

// 用两倍 CSS 尺寸绘制，配合入口 Html 的半尺寸缩放，保持墙面尺寸并改善透视合成清晰度。
export default function IntroductionBoard({ onLoad }: IntroductionBoardProps) {
  return (
    <div
      className="pointer-events-none relative aspect-3/2 w-160 scale-y-[0.9] max-[900px]:hidden"
      style={{ fontFamily: '"mono", "PingFang SC", "Microsoft YaHei", sans-serif' }}
      aria-label="作品集简介"
    >
      <div aria-hidden="true" className="absolute inset-x-[5.7%] top-[33.8%] bottom-[10.8%] rounded-[8px] bg-[#d0cecc]" />
      <picture>
        <source media="(min-width: 901px)" srcSet={assetHangingBoard} />
        <img
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt=""
          width={1536}
          height={1024}
          draggable={false}
          loading="eager"
          className="absolute inset-0 h-full w-full select-none object-contain grayscale"
          onLoad={onLoad}
          onError={() => reportStartupError(new Error('Failed to load the introduction board'))}
        />
      </picture>
      {/* 门牌只保留作品集名称，具体项目入口由右侧纸质卡片承载。 */}
      <div className="absolute inset-x-[10%] top-[39%] bottom-[12%] flex items-center justify-center text-center text-[26px] font-normal leading-[1.35] text-[#41443f]">
        <h2 className="text-[1.15em] font-normal">个人作品集</h2>
      </div>
    </div>
  );
}
