## canvas

`canvas/` 包含所有在 React Three Fiber `<Canvas>` 内渲染的 3D 组件，按 `entrance/`、`about/` 和 `portfolio/` 职责分组。

**Important:** Canvas 组件不能依赖 DOM 事件层的实现细节；场景状态通过 props 或 Context 传入。共享资源使用 `public/` 的静态导入 URL；作品封面使用 `data/note/` 编译后的导入 URL，来源规则见该目录说明。

### Important files

- `entrance/door/EntranceDoors.tsx` — 当前入口门场景，负责门、门框、门前地面和入口墙；物品分类与维护边界见 `entrance/AGENTS.md`。
- `entrance/wall/EntranceWall.tsx` — 用三块墙板围出门洞，保持门后场景可见。
- `SceneWarmup.tsx` — 等待 3D 字形、分批上传纹理、编译材质并离屏预渲染；可通过 scope 限定后台预热子树。
- `DeferredCorridor.tsx` — 入口预热完成时预取 About 代码，揭幕后挂载，使用独立 Suspense、错误边界与隐藏组，后台预热完成后显示。
- `SceneActivity.tsx` — 统一管理页面隐藏时的场景时钟、渲染循环和 GSAP 暂停恢复，挂载在资源 Suspense 外。
- `about/AboutRoom.tsx` — 关于场景入口，负责滚动输入、飞行姿态和场景挂载。
- `about/InfiniteSkyManager.jsx` — 云朵区块的动态管理。
- `portfolio/PortfolioField.tsx` — 漂浮作品卡片、相机聚焦与精确复位，细则见 `portfolio/AGENTS.md`。
- `about/SkyChunk.tsx` — 可复现随机云朵区块及其动画。

### Implementation notes

- 首次预热期间 `SceneActivity` 的 `ready` 为 false，不启动常规 advance 循环；由 SceneWarmup 分阶段准备 GPU 资源，完成后再开始正常绘制，避免常规首帧提前批量上传纹理。此状态不能绑定揭幕后的 pageReady，以免首屏就绪互相等待。

- Three.js 坐标、材质和纹理约束写在具体场景目录；父目录只维护通用分层规则。
- Canvas 固定 `frameloop="never"`，仅由 `SceneActivity` 的 rAF 调用 R3F `advance`，时间戳单位为秒；累计有效帧时间，每帧最多 50ms，同时约束 delta 和 elapsedTime。不要反复切换 frameloop（会清零时钟），也不要再启动另一条场景渲染循环。
- 页面隐藏（hidden、pagehide）时保留挂载和 GPU 资源，取消渲染帧并暂停 GSAP；不能仅因 blur 暂停，可见页面在地址栏、开发工具或其他窗口获得焦点时仍需绘制，避免预热揭幕后首屏空白。恢复的前两帧不推进场景时间，先绘制静止帧再续播，不丢弃恢复瞬间的点击，不用固定超时或重新执行首次加载预热。后台时间不参与动画。
- `SceneActivity` 在现有 `advance` 完成后调用 `utils/scenePerformance.ts`；仅性能面板订阅时计数，每秒发布 FPS、最后一帧绘制次数和场景引用纹理容量估算。FPS 使用真实 rAF 时间，不能用截断后的动画 delta；失活时重置采样窗口。不得为调试另建渲染循环或修改 renderer 的统计重置方式。
- 当前所有 GSAP 消费者均在同一 Canvas，`SceneActivity` 因此管理 globalTimeline，清理时取消帧和事件并恢复原暂停状态；新增独立 DOM/多 Canvas GSAP 动画前应改为各自管理时间线。验证切标签/窗口后立即点击、动画中途失活、快速反复切换、返回首页及 StrictMode 清理。
- 透明纹理和点击区域要明确处理深度写入，避免遮挡门后的场景；入口门洞不要用整块不透明平面填充。
- 入口组件在进入关于场景后保持挂载，仅通过 `visible` 禁止绘制和交互，避免转场完成时集中释放 GPU 资源。
- 入口与 About 分别使用独立 Suspense 和 `SceneWarmup`；入口预热期间 About 尚未挂载。每次等指定子树内 Troika Text 生成字形后，收集材质贴图、uniform 纹理和文字 SDF 图集，再分批上传、`compileAsync` 和单机位的 128×128 分批离屏绘制（关闭视锥裁剪已覆盖全部物体，无需第二机位重复绘制）。不能仅依据 LoadingManager 的下载完成判断可展示。
- 离屏预热包含隐藏和视锥外的作品卡片；只能临时修改可见性/视锥裁剪，绘制后必须恢复原值与 render target，并释放临时目标。不得移动真实相机或释放缓存场景纹理。
- 预热错误由 `onError` 回传加载层；异步步骤在解码、编译和下一帧后都检查 effect 清理状态，不得吞掉错误后调用 `onReady`。
- 新增独立场景时建立新的职责目录和近旁说明，不要把入口和关于场景的状态混在同一组件中。

- 场景图片使用 utils/useSceneTexture，而非 Drei useTexture，避免组件 effect 提前批量上传 GPU。保持原共享加载缓存及克隆纹理释放边界，统一交给 SceneWarmup 上传。

- 首次离屏绘制按最多 32 个可绘制对象分批预热，临时使用相机与对象 layer mask 选择批次；每次让出执行权前恢复共享对象的 layers、visible、frustumCulled 和 render target，取消或错误也必须恢复。不得把全场景首次 draw 合并回单个长任务。

- 预热阶段切换优先在 rAF 后的新任务中执行，并设置 50ms 任务回退，避免窗口遮挡时 rAF 降到 1Hz 导致逐项等待；该回退只调度工作，不跳过资源就绪检查。纹理上传与离屏批次之后用 WebGL2 fence/零超时查询，在 setTimeout 新任务中异步轮询 GPU，不为每次查询等待一整帧，禁止 gl.finish 或忙等。清理同时取消 rAF、定时任务并唤醒等待，释放 fence；不支持 fence 的上下文只让出任务。共享 HTML 图片只解码一次，并按图片对象与 flipY/premultiplyAlpha 分组生成 ImageBitmap；组内复用，仅上传时暂换 source.image 并立即恢复，组结束、取消或异常时 finally 关闭 bitmap，避免持有全场景位图，保留 CPU alpha 取样和上下文恢复。

- 后台预热只遍历 scope 内的文字、纹理和可见性；绘制仍使用完整 scene 保留真实灯光与雾，通过 layer mask 暂时排除 scope 外物体。每次异步让出前恢复全场景 masks、子树可见性和 render target，让 SceneActivity 正常绘制入口；不能暂停入口循环或再次揭幕。后台错误由走廊边界回传首页，不调用已完成的 startup 错误处理。
