## 原站点兼容部署

当前仓库自行维护的服务器兼容发布文件；不是多个项目共同引用的源码。容器名称、网络别名与现有服务器配置保留，项目可选择自身独立部署入口。

**Important:** 发布仅更新所选组件；失败恢复旧容器，保留证书、环境配置和持久数据。禁止将模型凭据或 SSH Secrets 写入源码。

### Important files

- `*.sh` — 独立发布与回滚；使用受控环境和 GitHub Secrets。
- `*.test.mjs` — Docker 替身事务回归；integration 测试需要真实 Linux Docker。
- 本目录存在的 Nginx / Dockerfile 是本站兼容路由或集成测试配置，不从其他仓库读取。

### Implementation notes

- Windows 使用 Git Bash，通过 DEPLOY_TEST_SHELL 指定；测试不得误用真实生产服务。
- 静态入口保留旧资源拒绝、HTML 不缓存、哈希资源长缓存；AI config/chat 经原站点同源代理，跨域直接接入由 AI 白名单控制。
- 更换真实域名和服务器资源前修改对应部署配置；通用 Compose 不需要原站点的外部网络。

- 直传模式由工作流在 SHA-256 校验和 docker load 成功后传入 DEPLOY_IMAGE_LOCAL=true；deploy.sh 在锁内要求精确 40 位提交标签并确认本地镜像存在，跳过注册表下载，其余验证、容器切换和回滚保持一致。默认仍由 GHCR 拉取；本地镜像缺失不能触碰旧容器。
