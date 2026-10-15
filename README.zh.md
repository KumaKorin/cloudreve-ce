# Cloudreve CE

<p align="center">
  <b><a href="README.md">English</a></b> | <b><a href="README.zh.md">简体中文</a></b>
</p>

## 该项目非 Cloudreve 官方项目，仅通过 Pro 版本行为和前端组件样式反推出 Pro 版本的一些功能，优化个人使用体验，同时，该项目不接受关于支付套餐相关的功能请求

> **重要声明：**
> 
> 1. **开源二次开发**：本仓库基于 **Cloudreve 社区开源版（GPL-3.0 协议）** 进行二次开发与补丁扩展，仅针对个人自用与非营利交流场景，通过观察商业捐助版网盘的实际行为与前端组件交互样式，补充了“分享细分权限配置（ACL）”与“多存储策略组选择挂载”等基础功能。
> 2. **非商业用途与免责声明**：本项目仅供技术交流与个人自用分享，**不提供任何商业可用性担保，亦不建议用于商业运营环境**。
> 3. **坚决不支持商业支付**：本项目**明确不支持任何商业用途，且绝不会依据 Pro 版本行为推出或支持任何在线支付、商业计费、VIP 会员订阅等增值服务功能**。本项目**不接受任何与支付/计费相关的功能请求（Feature Request）**。如需完整的商业计费能力、在线支付网关以及官方售后技术支持，请前往官方网站购买正版 **Cloudreve Pro**。
> 4. **反馈渠道独立**：使用本修改版遇到的任何 Bug 或疑问，请统一在本仓库提交 Issue 交流，**切勿前往 Cloudreve 官方仓库或官方社区反馈，以免打扰官方团队的日常维护工作**。
> 5. **版权归属与合规说明**：本项目原始代码版权全权归属于 **Cloudreve** 原团队。若原作者认为本仓库的发布或内容有任何不妥之处，欢迎随时通过本人 GitHub 主页公开邮箱（`me@korin.im`）联系，本人将立即配合并删除本仓库。
> 6. **AI 辅助**：本项目的功能行为逆向分析、开源版代码重构适配与补丁制作全过程由 **Antigravity** 辅助完成。

---

## 核心扩展功能

### 1. 目录多存储策略挂载（Mount Storage Policy）
- **灵活策略绑定**：允许用户在个人网盘或指定目录中挂载独立的存储策略，上传至该目录的新文件将自动采用绑定的存储策略进行存储与分发。
- **直观交互界面**：在 Web 端文件浏览区顶部导航栏、右键/折叠菜单以及移动端快捷菜单中无缝集成存储策略切换 Popover 组件。
- **后端持久化与接口**：
  - `PATCH /api/v4/file/policy`：关联目标目录与指定存储策略 ID。
  - `GET /api/v4/user/setting/policies`：返回当前用户可用且已启用的存储策略列表。
  - 继承机制：子目录与文件自动继承父级挂载策略。

### 2. 协同分享文件夹与细粒度权限配置（Collaborative Sharing & ACL）
- **多维度受众授权**：
  - 内置受众：全员用户、匿名访客。
  - 用户组受众：同用户组、指定特定用户组。
  - 单用户受众：指定特定注册用户。
- **细粒度权限控制**：
  - 列表查看（List files）
  - 读取下载（Read / Download）
  - 创建上传（Create / Upload）
  - 修改重命名（Modify / Rename）
  - 删除移动（Delete / Move）
  - 二次分享（Reshare）
- **非所有者协同放行**：通过后端 `WithBypassOwnerCheck` 与前端动态权限计算，使被授权的访客或协作者可以在分享目录内正常上传、创建文件夹、修改内容，而无需原所有者手动代操作。
- **后端管理接口**：
  - `GET /api/v4/group/list`：获取用户组列表以供权限选择。
  - `POST /api/v4/file/permission`：新增或更新文件/目录权限规则。
  - `DELETE /api/v4/file/permission`：删除指定权限规则。

### 3. 管理后台标识规范化
- 后台管理面板首页右上角的版本标识统一采用 **`CE`**（Community Edition 社区开源版缩写），清晰表明社区二次开发性质，杜绝与官方商业版混淆。

---

## 修改清单与架构

```text
Cloudreve_CE
├── backend/            # 后端核心源码（Go）
│   ├── application/    # 路由注册与依赖管理
│   ├── inventory/      # 实体定义与数据库迁移
│   ├── pkg/filesystem/ # DBFS 文件系统及策略继承、权限放行
│   └── service/        # 权限管理与存储策略挂载接口服务
├── frontend/           # 前端应用源码（React + Vite + TypeScript）
│   ├── src/component/
│   │   ├── MountStoragePolicyPopover/  # 存储策略切换弹窗与状态管理
│   │   ├── Share/                      # 分享细粒度权限与受众配置组件
│   │   ├── FileInfo/Permission/        # 文件信息右侧面板权限管理
│   │   └── Admin/Home/Home.tsx         # 后台管理面板 CE 徽章
│   └── src/i18n/                       # 多语言国际化补丁（zh-CN, en-US, etc.）
├── patches/            # 针对官方开源仓库的标准补丁集（可直接 git am）
│   ├── backend/        # 后端 Git 补丁
│   └── frontend/       # 前端 Git 补丁
├── pack_assets.go      # 前端打包嵌入 assets.zip 的打包辅助脚本
├── LICENSE             # GPL-3.0 许可证
└── README.md           # 项目详细说明文档
```

---

## 编译与打包指南

### 方式一：直接使用 Release 编译包

前往 Releases 页面下载预编译好的独立单文件运行即可：
- Windows: `Cloudreve.exe`
- Linux: `cloudreve`

### 方式二：使用 Git 补丁打入官方源码（推荐）

如果你已有 Cloudreve 官方开源仓库，可通过本仓库提供的 `patches` 目录无缝打入：

```bash
# 后端应用补丁
cd /path/to/Cloudreve
git am /path/to/patches/backend/*.patch

# 前端应用补丁
cd /path/to/Cloudreve/frontend
git am /path/to/patches/frontend/*.patch
```

### 方式三：从本源码从头编译

#### 1. 编译前端静态资源
```bash
cd frontend
pnpm install
npx vite build
```
产物将输出至 `frontend/build`。

#### 2. 将静态资源嵌入后端
```bash
go run pack_assets.go
```
该脚本会将静态资源自动压缩生成 `backend/application/statics/assets.zip`。

#### 3. 编译后端可执行程序
- **Windows (amd64)**:
  ```bash
  cd backend
  go build -o Cloudreve.exe
  ```
- **Linux (amd64)**:
  ```bash
  cd backend
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o cloudreve
  ```

---

## 开源许可证

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 协议开源。
所有原始项目代码与商标版权均归 **Cloudreve** 所有。
