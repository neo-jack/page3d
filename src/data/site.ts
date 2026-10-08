// Public website entry; model gateway addresses and credentials stay on the server.
import config from '../../site.config.json';
export const PUBLIC_SITE_ORIGIN = import.meta.env?.VITE_SITE_ORIGIN || config.siteOrigin;
export const LEGACY_SITE_URL = `${PUBLIC_SITE_ORIGIN}/2D/`;

export type PortfolioWallLink = {
  label: string;
  href: string;
};

// 入口墙面只展示已经确认的公开入口；私有服务、源码路径和凭据不进入前端。
export const PORTFOLIO_WALL_LINKS: PortfolioWallLink[] = [
  {
    label: 'AI竞品分析agent',
    href: `${PUBLIC_SITE_ORIGIN}/Ai/`,
  },
  {
    label: '2D个人页面',
    href: LEGACY_SITE_URL,
  },
  {
    label: '前端监控',
    href: `${PUBLIC_SITE_ORIGIN}/3D/monitor/`,
  },
  {
    label: 'miniReact源码',
    href: `${PUBLIC_SITE_ORIGIN}/React/`,
  },
  {
    label: '元素选择器',
    href: `${PUBLIC_SITE_ORIGIN}/AItool/`,
  },
];
