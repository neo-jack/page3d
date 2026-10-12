## board

保留的墙面简介板与项目画廊组件；当前 HomePage 不再挂载，以下尺寸与图片约定仅适用于组件本身。作品导航集中在独立 2D 页面。

**Important:** 位置由墙面锚点决定，DOM 尺寸与 Canvas 的 Html 缩放必须成对维护。

### Important files

- `IntroductionBoard.tsx` — 门上方简介板的图片与“个人作品集”门牌文案，保留实现，当前 `HomePage` 不传入此节点；组件自身不定位到视口。
- `PortfolioWallCard.tsx` — 右墙一排纸质画廊，读取 `data/site.ts` 的公开入口，在生成图稿上渲染竖向 A4 比例画框与可点击项目牌。

### Implementation notes

- 首屏右侧简介由 `IntroductionBoard.tsx` 将 DOM 文字叠加在从 `public/textures/about/hanging-board.webp` 导入图片的留白区域。正文使用深灰 `#41443f`，不加亚像素文字阴影；拉丁文字保留 `mono`，中文明确回退到苹方/微软雅黑及 sans-serif。DOM 使用 640px 宽、26px 字号和 3:2 宽高比，根节点轻微压扁 `scale-y=0.9`，配合入口 `Html` 的 `scale={1.35}` 使门牌更小、更扁并保留挂绳和纸纹；两侧参数需成对维护。实际屏幕尺寸及位置由墙面 `Html transform` 锚点控制，进门时随墙面产生透视变化；不能使用 `fixed` 或视口单位让板面、文字跟随镜头。图片保留灰度，整体不设置透明度、不使用正片叠底。板面内侧放置与原图轮廓对齐的不透明底色，阻止墙砖透入；挂绳及板外透明轮廓仍保留。整组保持点击穿透，不添加破碎交互；900px 及以下隐藏简介，`picture` 改用透明占位图以避免下载木板。
- 木板简介正文只保留居中的“个人作品集”标题，不再显示泛化的作品方向示例；真实项目入口由右墙纸质卡片提供。
- `PortfolioWallCard` 使用 `data/site.ts` 的已确认公开地址，按“AI竞品分析agent、2D个人页面、前端监控、miniReact源码、元素选择器”顺序展示五个项目；只显示中国画面和项目名称，不显示墙壁英文、额外技术描述或重复标题。五个 A4 画框通过 Drei `Html transform` 贴在入口右墙上方，横向一排排列，外链使用原生新标签页打开。DOM 总宽 1920px、列间距 40px，配合墙面 Html scale=0.74；项目牌参考向导气泡，使用 tiktok/sans-serif、52px 常规字重、浅灰绿色 #70766a、暖白底 #f5f4ed 与 #929487/50 边框，至少 112px 高并均衡换行；图片保留低饱和纸感，适度提亮，取消透明度与 multiply 混合，避免墙纹和灰蒙叠色干扰细节。画框必须保持 `210 / 297` 的 A4 竖向比例，不要恢复多行画廊或方形作品框；不要把私有服务地址、源码路径或凭据写入组件。
- 若恢复简介板挂载，需同步恢复图片 decode 就绪检查；当前启动不等待简介板。
- 第二张卡片保留原画面，名称为“2D个人页面”，使用 `LEGACY_SITE_URL` 指向线上 `/2D/`；顶部导航不再提供旧版入口。

- 画廊使用无损 WebP；PortfolioWallCard 在五张实际 img 全部 decode 成功后调用 onReady，失败交给 reportStartupError。当前 HomePage 不挂载画廊，因此不再维护 galleryReady 或等待这些图片。
