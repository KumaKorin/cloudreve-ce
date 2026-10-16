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

### 3. 在存储策略之间转移文件（Storage Policy Relocation）
- **跨策略灵活转存**：用户可将已有文件或整个文件夹的存储策略直接转移至其他可用且启用的存储策略。
- **异步后台安全转移**：
  - 支持后台异步任务（Task）流式转存，文件实体自动从源驱动流式转存至目标存储驱动，并清理旧存储源对象。
  - 批量更新数据库实体映射与目录挂载属性，保障大文件与深层目录迁移的完整性与一致性。
  - 前端任务中心实时显示转存进度、涉及文件及目标策略徽标。
- **用户组权限控制**：在后台管理面板用户组设置中解除限制，提供“存储策略转移”权限开关（`GroupPermission.relocate`），可按用户组灵活授权。
- **后端工作流接口**：
  - `POST /api/v4/workflow/relocate`：创建跨存储策略转移工作流任务。

### 4. 注册邮箱过滤与二级地址防护（Registration Email Filtering）
- **服务商域名过滤**：支持通过白名单（Whitelist）或黑名单（Blacklist）过滤指定的邮箱服务商域名，支持泛域名匹配与多行规则配置。
- **二级地址（子地址）防护**：支持禁止使用包含 `+` 的二级地址邮箱（例如 `user+alias@domain.com`）注册，杜绝多账号滥用。
- **管理后台自由配置**：在后台管理面板“会话控制”中无缝集成配置项，支持动态切换过滤模式、编辑规则及开启子地址拦截。

### 5. 用户组存储策略权限平等鉴权与能力恢复
- **权限与用户组统一**：彻底移除管理员对存储策略的越权绕过，确保所有用户组（包括管理员组）的可用存储策略严格按照用户组绑定的策略权限进行鉴权，杜绝误用未授权策略。
- **文件管理基础能力恢复**：全面恢复移动（Move）、复制（Copy）及细粒度权限配置能力。

### 6. 管理后台标识规范化
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

### 方式一：直接使用自动化脚本编译（推荐）

仓库已内置跨平台一键编译脚本，会自动构建前端静态文件、打包嵌入 `assets.zip` 并编译生成最终二进制：
- **Windows (PowerShell)**:
  ```powershell
  .\build.ps1
  ```
  产物将生成在根目录下 `Cloudreve.exe`。
- **Linux / macOS (Bash)**:
  ```bash
  chmod +x build.sh
  ./build.sh
  ```
  产物将生成在根目录下 `cloudreve`。

### 方式二：使用 Git 补丁打入官方源码

如果你已有 Cloudreve 官方开源仓库，可通过本仓库提供的 `patches` 目录无缝打入：

```bash
# 后端应用补丁
cd /path/to/Cloudreve
git am /path/to/patches/backend/*.patch

# 前端应用补丁
cd /path/to/Cloudreve/frontend
git am /path/to/patches/frontend/*.patch
```

| 补丁编号 | 对应功能模块 | 说明 |
| :--- | :--- | :--- |
| `0001` | 存储策略挂载 & 细粒度协同分享 (ACL) | 支持目录独立存储策略绑定，细粒度权限控制与访客写入放行 |
| `0002` | 管理后台标识规范化 | 管理后台右上角版本标识统一显示为 `CE` |
| `0003` | 用户组存储策略平等鉴权 & 能力恢复 | 消除管理员越权，统一用户组存储策略鉴权；恢复移动、复制、权限管理能力 |
| `0004` | 存储策略间文件转移 & 注册邮箱过滤 | 支持跨存储策略异步迁移文件/目录；支持注册邮箱黑白名单过滤与二级地址禁用 |

### 方式三：分步骤手动编译

#### 1. 编译前端静态资源
```bash
cd frontend
pnpm install
pnpm build
```
产物将输出至 `frontend/build`。

#### 2. 将静态资源嵌入后端
```bash
go run pack_assets.go
```
该脚本会将静态资源自动压缩生成 `application/statics/assets.zip`。

#### 3. 编译后端可执行程序
- **Windows (amd64)**:
  ```powershell
  go build -trimpath -ldflags="-s -w" -o Cloudreve.exe
  ```
- **Linux (amd64)**:
  ```bash
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o cloudreve
  ```

---

## 开源许可证

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 协议开源。
所有原始项目代码与商标版权均归 **Cloudreve** 所有。
