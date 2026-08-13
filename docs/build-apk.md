# 打包成安卓 APK 安装包指南（Windows）

> 一句话结论：在本机安装 Node.js 与 HBuilderX，用 HBuilderX 打开本项目 → 配置 AppID →「发行」→「原生App-云打包」→ 下载 APK。
>
> 推荐先用配套脚本 `scripts/pack-apk.ps1` 一键完成环境检查、依赖安装与项目构建，最后几步云打包在 HBuilderX 图形界面里点选即可。

---

## 1. 背景：为什么不能直接 npm 出 APK

本项目是 uni-app CLI 工程（Vue 3 + Vite），两条关键事实：

- `npm run build:app` 只能生成**安卓资源文件**（`frontend/dist/build/app`），它不是可安装的 APK。
- APK 需要把资源编译成安卓原生工程并签名，这一步由 DCloud 官方工具 **HBuilderX** 完成。
  本项目采用**云打包**路线：编译在 DCloud 服务器完成，本机**不需要**安装 JDK、Android Studio、Android SDK。

---

## 2. 需要安装的软件清单

| 软件 | 版本要求 | 用途 | 获取方式 |
| --- | --- | --- | --- |
| Node.js | ≥ 22.12（本项目最低要求） | 安装依赖、单元测试、生成打包资源 | winget 或官网安装包，见 3.1 |
| HBuilderX | 最新正式版（Windows 仅支持 64 位，系统需 Windows 8.1+） | 官方 IDE，负责导入项目与云打包 | 官网下载 zip，见 3.2 |
| DCloud 账号 | 免费注册 | 云打包鉴权、在线申请 AppID | https://dev.dcloud.net.cn/ |
| adb（可选） | Android SDK Platform-Tools | 数据线安装 APK 到手机 | https://developer.android.com/tools/releases/platform-tools |

> 说明：云打包编译在 DCloud 服务器完成，本机零 Android 配置；`keytool`（JDK 自带）仅在选用「自有证书」时用到，见第 6 节。

---

## 3. 安装步骤

### 3.1 安装 Node.js

任选一种方式：

**方式 A：winget（推荐，可被脚本自动调用）**

打开 PowerShell，执行：

```powershell
winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
```

**方式 B：官网安装包**

访问 https://nodejs.org/zh-cn 下载 LTS 版本，双击安装，一路默认即可。

**方式 C：nvm-windows（多版本管理）**

安装 https://github.com/nvm-sh/nvm-windows ，然后：

```powershell
nvm install 22
nvm use 22
```

安装完成后验证版本（需新开终端让 PATH 生效）：

```powershell
node -v
# 应输出 v22.12.0 或更高，例如 v22.23.2
```

> 注意：低于 22.12 会因 vitest 依赖的 std-env 4.x 仅支持 ESM 而报 `ERR_REQUIRE_ESM`，务必满足版本要求。

### 3.2 安装 HBuilderX

1. 打开官网 https://www.dcloud.io/hbuilderx.html ，下载 Windows 版（zip 压缩包，约 500 MB）。
2. 解压到固定目录（例如 `D:\HBuilderX`）。HBuilderX 是绿色软件，**无需安装程序**，解压即用。
3. 双击 `HBuilderX.exe` 启动，确认能正常打开界面。
4. （可选）为方便命令行调用，可把 `D:\HBuilderX` 加入系统环境变量 `PATH`，或设置环境变量 `HBX_HOME=D:\HBuilderX`（本仓库脚本会读取 `HBX_HOME` 自动定位）。

### 3.3 注册 DCloud 账号

访问 https://dev.dcloud.net.cn/ 免费注册。云打包前需要在 HBuilderX 中登录该账号，并在 manifest.json 里申请 AppID。

---

## 4. 一键脚本（推荐）

仓库提供 `scripts/pack-apk.ps1`，自动完成环境检查与构建：

| 步骤 | 脚本行为 | 可跳过 |
| --- | --- | --- |
| 1 | 检查 Node.js ≥ 22.12；缺失时用 winget 自动安装 LTS | — |
| 2 | `npm install` 安装依赖 | `-SkipInstall` |
| 3 | `npm test` 跑单元测试（不通过则中止） | `-SkipTest` |
| 4 | `npm run build:app` 生成安卓资源 | `-SkipBuild` |
| 5 | 定位 HBuilderX（常见目录 / `HBX_HOME` / `-HbxPath`），启动并自动导入项目 | `-NoOpen` 时不启动 |

运行方式（在仓库根目录打开 PowerShell）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pack-apk.ps1
```

常用参数：

```powershell
# 指定 HBuilderX 位置（脚本找不到时使用）
powershell -ExecutionPolicy Bypass -File scripts\pack-apk.ps1 -HbxPath "D:\HBuilderX\HBuilderX.exe"

# 只做环境检查与构建，不启动 HBuilderX
powershell -ExecutionPolicy Bypass -File scripts\pack-apk.ps1 -NoOpen
```

> 自动化边界：云端编译需要 DCloud 账号登录与图形界面点选，脚本无法全自动，会把「剩下要点的按钮」以清单形式打印出来，对应第 5 节。

---

## 5. 手动打包流程（HBuilderX 图形界面）

### 5.1 导入项目

1. 启动 HBuilderX，登录 DCloud 账号（菜单 **帮助 → 登录**，或右上角头像）。
2. 菜单 **文件 → 导入 → 从本地目录导入**，选择 `my_life_line/frontend/`（**不是**仓库根目录 `my_life_line/`）。
   > 本项目是 CLI 工程，HBuilderX 通过 `src/manifest.json` 识别 uni-app 工程，工程根目录就是 `frontend/`；导入仓库根目录会识别不到工程。
3. 导入后项目管理器出现 `frontend` 工程，双击 `src/manifest.json` 打开可视化配置。

### 5.2 配置应用信息（manifest.json）

- **基本设置**
  - `应用名称`：默认「时光档案」，可在此修改。
  - `AppID`：点击「重新获取」，用 DCloud 账号在线申请并自动回填（**必填项**）。
- **图标配置**：配置 Android 各尺寸启动图标（可准备一张 1024×1024 的 PNG 自动生成）。
- **启动界面**：可选，不配则用默认。
- **App模块配置**：**必须勾选「SQLite」**——本项目数据层依赖 `plus.sqlite` 存储，云打包未勾选时运行会报「打包时未添加sqlite模块」。对应 manifest.json 中的 `app-plus → modules → SQLite`（本仓库已默认声明，一般无需改动）。
- **App权限**：本项目纯本地存储、无网络依赖，已声明的相机等权限一般无需改动。
- **版本信息**：版本号/版本名称默认 1.0.0 / 100，发版时递增。

保存后 HBuilderX 会自动把配置同步回 `src/manifest.json`。

### 5.3 发行 → 原生App-云打包

1. 菜单 **发行 → 原生App-云打包**。
2. 平台勾选 **Android**（本项目仅安卓，不需要 iOS）。
3. 证书选择：
   - **调试/自用**：选「使用公共测试证书」——生成的 APK 可直接安装到手机，个人使用足够；
   - **正式上架/长期升级**：选「使用自有证书」——需先准备 `.keystore` 签名文件，见第 6 节。
4. 点击 **打包**，等待云端编译（一般几分钟，首次需先申请 AppID）。
5. 编译完成后在「发行」面板下载 `__UNI__xxxx__xxx.apk`。

### 5.4 补充：真机调试（快速体验）

- 手机开启 USB 调试并连接电脑。
- 菜单 **运行 → 运行到手机或模拟器 → 运行到Android App基座**，首次会自动安装调试基座。
- 该方式依赖调试基座，**仅用于开发调试，不能作为正式安装包分发**。

---

## 6. 生成正式签名（keystore，可选）

仅当云打包选择「自有证书」时需要。`keytool` 随 JDK 自带（安装 Android Studio 或 JDK 后可用）：

```bash
keytool -genkey -v -keystore my_life_line.keystore -alias my_life_line -keyalg RSA -keysize 2048 -validity 36500
```

生成后**妥善保管** `.keystore` 文件与口令——丢失后无法对已发布的包做升级更新。

---

## 7. 安装 APK 到手机

- **数据线方式**：手机开启 USB 调试，执行：

  ```bash
  adb install -r 你的.apk
  ```

- **免电脑方式**：把 APK 通过微信/QQ/网盘传到手机，用系统「文件管理」打开安装；若提示「禁止安装未知来源应用」，在设置中允许即可。
- **模拟器**：直接把 APK 拖进模拟器窗口安装。

---

## 8. 常见问题

| 问题 | 解决办法 |
| --- | --- |
| 打包提示「未配置 AppID」 | 在 manifest.json 中点击「重新获取」在线申请 |
| 安装提示「应用未安装」/解析失败 | 多为签名不一致：卸载旧版本后再安装，或统一使用同一证书 |
| 升级后数据丢失 | 签名不一致时系统拒绝覆盖安装；正式发版务必固定同一 keystore |
| 打包后页面白屏 | 先确认「运行到手机」能正常显示，再排查云打包配置 |
| 安装后提示「打包时未添加 sqlite 模块」 | 云打包未包含 SQLite 原生模块：manifest.json → App模块配置 勾选「SQLite」后重新打包（本仓库已默认声明） |
| `npm run build:app` 产物在哪 | 在 `frontend/dist/build/app`，这是资源包，不是 APK |
| 想全命令行打包？ | HBuilderX 支持 `cli pack --config <配置> `（需先 `cli user login` 登录），配置较繁琐，个人项目建议直接用图形界面 |

---

## 9. 命令速查（均在 `frontend/` 下执行）

```bash
npm install        # 安装依赖
npm test           # 单元测试
npm run build:app  # 生成安卓资源到 dist/build/app（不是 APK！）
```

---

**文档配套**：打包前建议先运行 `npm test` 确认功能正常，再用 HBuilderX 云打包，避免把明显的问题带进安装包。完整流程也可直接跑 `scripts/pack-apk.ps1`。
