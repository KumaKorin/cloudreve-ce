# Cloudreve CE

<p align="center">
  <b><a href="README.md">English</a></b> | <b><a href="README.zh.md">简体中文</a></b>
</p>

## This project is NOT an official Cloudreve project. It only reproduces selected features by observing the runtime behavior and UI component styling of the Pro version to enhance personal usage, and does NOT accept any feature requests related to payment or subscription plans.

> **Important Notices & Disclaimers:**
> 
> 1. **Open-Source Secondary Development**: This repository is a secondary development and patch set based on the official open-source **Cloudreve Community Edition (GPL-3.0 License)**. It is created solely for personal self-hosting and non-profit technical sharing. By observing the runtime behavior and frontend component interaction styles of the commercial donation edition, it supplements basic features such as "granular sharing permission configuration (ACL)" and "directory multi-storage policy mounting".
> 2. **Non-Commercial Use & No Warranty**: This project is intended solely for personal study, technical exchange, and private use. It is provided **WITHOUT ANY WARRANTY OF ANY KIND, EXPRESSED OR IMPLIED**, and is **NOT recommended for commercial operations or production business environments**.
> 3. **Strictly No Commercial Payment Features**: This project **explicitly does not support commercial use**, and will **NEVER implement, backport, or support any online payment gateways, commercial billing systems, VIP memberships, or paid subscriptions based on Pro behavior**. Feature requests regarding payment or subscription plans **will be rejected immediately**. For full-featured commercial billing, payment integrations, and official commercial support, please purchase the authentic **Cloudreve Pro** from the official website.
> 4. **Independent Issue Reporting**: If you encounter any bugs, issues, or have questions regarding this modified version, please submit an Issue in this repository. **Do NOT report them to the official Cloudreve repositories or forums, so as not to disturb the official maintenance team.**
> 5. **Copyright & Repository Removal**: All original codebase, branding, and trademark copyrights belong entirely to **Cloudreve** and its original creators. If the original authors consider the existence or content of this repository inappropriate, please feel free to contact the maintainer via the email on the GitHub profile (`me@korin.im`), and this repository will be removed immediately upon request.
> 6. **AI Assistance**: The reverse behavioral analysis, community codebase adaptation, and patch generation were assisted by **Antigravity**.

---

## Key Enhanced Features

### 1. Directory Multi-Storage Policy Mounting
- **Per-Folder Policy Association**: Allows users to bind independent storage policies to specific folders in their drive. Any new files uploaded to that directory will automatically adopt the associated storage policy for storage and distribution.
- **Seamless UI Integration**: Integrated storage policy switching Popovers in the web file explorer top navigation bar, right-click/overflow menus, and mobile quick action menus.
- **Backend Persistence & API**:
  - `PATCH /api/v4/file/policy`: Associates the target directory with the specified storage policy ID.
  - `GET /api/v4/user/setting/policies`: Retrieves available and enabled storage policies for the authenticated user.
  - Policy Inheritance: Child directories and files automatically inherit parent mounted policies.

### 2. Collaborative Sharing & Granular Permissions (ACL)
- **Multi-Dimensional Audience Authorization**:
  - Built-in Audiences: All authenticated users, anonymous visitors.
  - Group Audiences: Same user group, specific user groups.
  - Individual Audiences: Specific registered users.
- **Fine-Grained Permission Controls**:
  - List files (Browse)
  - Read files (Download / Preview)
  - Create files (Upload / New folder)
  - Modify files (Rename / Edit)
  - Delete files (Remove / Move)
  - Reshare (Share link management)
- **Collaborator Write Bypass**: Through backend `WithBypassOwnerCheck` and frontend dynamic capability resolution, authorized visitors or collaborators can perform write operations directly inside shared folders without requiring manual intervention from the original owner.
- **Backend Management Endpoints**:
  - `GET /api/v4/group/list`: Lists user groups for permission assignments.
  - `POST /api/v4/file/permission`: Creates or updates ACL permission rules.
  - `DELETE /api/v4/file/permission`: Deletes specific ACL rules.

### 3. Storage Policy Relocation Across Policies
- **Cross-Policy File Transfer**: Users can directly relocate existing files or entire folder trees from one storage policy to another enabled storage policy.
- **Asynchronous & Reliable Workflow**:
  - Leverages background async task pipeline to stream file entities from the source storage driver to the destination storage driver, automatically cleaning up old physical entities.
  - Atomically updates database entity associations and directory policy relationships, ensuring data consistency for large files and deeply nested folders.
  - Real-time progress monitoring, file badges, and target policy display in the Task Center.
- **Group Permission Management**: Unlocked "Storage Policy Relocation" in Admin Dashboard group settings (`GroupPermission.relocate`), allowing granular permission toggling per user group.
- **Backend Workflow API**:
  - `POST /api/v4/workflow/relocate`: Initiates a cross-policy relocation task.

### 4. Registration Email Filtering & Sub-address Protection
- **Email Provider Domain Filtering**: Filter allowed registration domains via either Whitelist or Blacklist mode, supporting wildcard domain matching and multiline rules.
- **Sub-address Email Protection**: Option to reject email addresses with `+` sub-addresses (e.g., `user+tag@domain.com`) to prevent multi-account registration abuse.
- **Admin Dashboard Integration**: Full configuration UI unlocked under Admin Dashboard -> Session Settings, allowing effortless rule management and mode selection.

### 5. Group Storage Policy Equal Authorization & Core Capabilities
- **Equal Policy Enforcement**: Storage policy authorization strictly follows user group permissions for all users (including administrators), eliminating privileged bypasses.
- **File Management Capabilities Restored**: Fully restored Move, Copy, and granular permission management actions in the file navigator.

### 6. Admin Dashboard Label Standardization
- The version badge at the top-right corner of the Admin Dashboard is standardized as **`CE`** (abbreviation for Community Edition), clearly indicating its community secondary-development nature to prevent any confusion with the official commercial Pro edition.

---

## Repository Structure & Architecture

```text
Cloudreve_CE
├── backend/            # Backend core source code (Go)
│   ├── application/    # Route registration and dependency injection
│   ├── inventory/      # Entity definitions and DB schema
│   ├── pkg/filesystem/ # DBFS file system, policy inheritance & ACL checks
│   └── service/        # Permission management & policy mounting services
├── frontend/           # Frontend application source code (React + Vite + TS)
│   ├── src/component/
│   │   ├── MountStoragePolicyPopover/  # Storage policy selection popover
│   │   ├── Share/                      # Sharing ACL & audience modal
│   │   ├── FileInfo/Permission/        # File details sidebar ACL manager
│   │   └── Admin/Home/Home.tsx         # Admin dashboard CE badge
│   └── src/i18n/                       # Multilingual localization patches
├── patches/            # Standard Git patch set for official upstream repos
│   ├── backend/        # Backend patches (git am compatible)
│   └── frontend/       # Frontend patches (git am compatible)
├── pack_assets.go      # Script to pack frontend build into assets.zip
├── LICENSE             # GNU General Public License v3.0 (GPL-3.0)
├── README.md           # English Documentation (Default)
└── README.zh.md        # Chinese Documentation (中文说明)
```

---

## Build & Deployment Guide

### Option 1: One-Click Automated Scripts (Recommended)

The repository provides automated cross-platform build scripts that build frontend assets, pack them into `assets.zip`, and compile the final binary:
- **Windows (PowerShell)**:
  ```powershell
  .\build.ps1
  ```
  Binary generated at `./Cloudreve.exe`.
- **Linux / macOS (Bash)**:
  ```bash
  chmod +x build.sh
  ./build.sh
  ```
  Binary generated at `./cloudreve`.

### Option 2: Apply Git Patches to Upstream Official Repositories

If you already have cloned the official Cloudreve repositories, you can apply our patch sets cleanly:

```bash
# Apply Backend Patches
cd /path/to/Cloudreve
git am /path/to/patches/backend/*.patch

# Apply Frontend Patches
cd /path/to/Cloudreve/frontend
git am /path/to/patches/frontend/*.patch
```

| Patch Index | Affected Area | Description |
| :--- | :--- | :--- |
| `0001` | Storage Policy Mount & Granular ACL Sharing | Per-folder policy mounting, granular sharing ACLs, and collaborator write bypass |
| `0002` | Admin Dashboard Badge Standardization | Standardize admin dashboard top-right badge to `CE` |
| `0003` | Group Policy Equal Authorization & Core Actions | Equal policy authorization for all groups; restore Move, Copy, and Permission capabilities |
| `0004` | Storage Policy Relocation & Email Filtering | Asynchronous file/directory cross-policy transfer; email provider whitelist/blacklist and sub-address protection |

### Option 3: Step-by-Step Manual Build

#### 1. Build Frontend Static Assets
```bash
cd frontend
pnpm install
pnpm build
```
Build output will be generated in `frontend/build`.

#### 2. Pack Static Assets into Backend
```bash
go run pack_assets.go
```
This utility packs `frontend/build` into `application/statics/assets.zip`.

#### 3. Compile Backend Executable
- **Windows (amd64)**:
  ```powershell
  go build -trimpath -ldflags="-s -w" -o Cloudreve.exe
  ```
- **Linux (amd64)**:
  ```bash
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o cloudreve
  ```

---

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
All original code, branding, and trademark copyrights belong to **Cloudreve**.
