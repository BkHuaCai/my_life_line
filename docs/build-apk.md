# 打包成安卓 APK 安装包指南

本项目的 uni-app 工程（`frontend/`）通过 `npm run build:app` 只能产出 **安卓资源文件**（`dist/build/app`），
**并不能直接得到可安装的 APK**。要生成可安装到手机的 APK，需要使用 DCloud 官方工具 **HBuilderX** 完成。

> 一句话结论：用 HBuilderX 打开 `frontend/` 目录 → 配置 AppID → 「发行」→「原生App-云打包」→ 下载 APK。

---

## 0. 环境准备

| 工具 | 用途 | 说明 |
| --- | --- | --- |
| HBuilderX | 官方 IDE，负责打包 | Windows / macOS 均可，下载：<https://www.dcloud.io/hbuilderx.html> |
| DCloud 账号 | 云打包必须 | 注册：<https://dev.dcloud.net.cn/>（免费） |
| 安卓手机或模拟器 | 安装测试 | 手机需开启「开发者选项 → USB 调试」 |
| 数据线 / adb | 安装 APK | 或用手机文件管理器直接打开 APK |

> 不需要在本机安装 Android SDK / Android Studio —— 云打包在 DCloud 服务器完成，本机零配置。

---

## 1. 在 HBuilderX 中导入项目

1. 打开 HBuilderX，菜单 **文件 → 导入 → 从本地目录导入**。
2. 选择本项目根目录（`my_life_line/`），导入时勾选包含 `frontend/` 即可；
   HBuilderX 会自动识别 uni-app 工程（依赖 `frontend/src/manifest.json` 与 `pages.json`）。
3. 导入完成后，在项目管理器中展开 `frontend/`，双击 `src/manifest.json` 进入可视化配置。

## 2. 配置应用信息（manifest.json）

打开 `src/manifest.json` 的可视化编辑器，重点配置：

- **基本设置**
  - `应用名称`：默认已填「时光档案」（在 `src/manifest.json` 中），如需改名在此修改
  - `AppID`：点击「重新获取」按钮，用 DCloud 账号在线申请（自动回填，必填项）
- **图标配置**：分别设置 16 张不同尺寸的 Android 启动图标（可用一张 1024×1024 PNG 自动生成）
- **启动界面**：建议自定义一张启动图（可选，不配则用默认）
- **权限配置**（`App权限` 页）：本项目已声明相机等权限，一般无需改动；
  本项目**纯本地存储，无网络依赖**，不需要申请网络/定位等额外权限
- **版本信息**：`版本号` 与 `版本名称` 已默认（1.0.0 / 100），发版时可自行递增

保存后，HBuilderX 会自动把配置同步到 `frontend/src/manifest.json` 文件中。

## 3. 打包 APK（三种方式）

### 方式一：云打包（推荐，最简单）

1. 菜单 **发行 → 原生App-云打包**。
2. 平台选择 **Android**（可勾选 iOS，但本项目仅安卓）。
3. 证书选择：
   - 调试/自用：选 **使用公共测试证书**（生成的 APK 已可安装，适合个人使用）；
   - 正式上架/长期使用：选 **使用自有证书**，先用 Android Studio 或 `keytool` 生成 `.keystore` 签名文件（见第 4 节）。
4. 点击 **打包**，等待 DCloud 云端编译（一般几分钟）。
5. 打包完成后在「发行」面板下载 `__UNI__xxxx__xxx.apk`。

### 方式二：真机调试（快速体验）

1. 手机开启 USB 调试并连接电脑。
2. HBuilderX 菜单 **运行 → 运行到手机或模拟器 → 运行到Android App基座**。
3. 首次需要安装「HBuilderX 标准基座」（自动提示），之后即可热更新调试。
4. 这种方式产出的应用依赖调试基座，**仅用于开发调试，不能作为正式安装包分发**。

### 方式三：离线打包（高级，需 Android 环境）

适用于需要深度定制或离线环境。原理：用 Android Studio 建原生工程，引入
`dist/build/app` 生成的资源包 + uni-app 离线 SDK，自行编译签名。

1. 先执行 `npm run build:app` 生成安卓资源到 `frontend/dist/build/app`。
2. 下载对应版本的 uni-app 离线打包 SDK（与 `manifest.json` 中 `compilerVersion` 对应）。
3. 按 DCloud 离线打包文档集成：<https://nativesupport.dcloud.net.cn/AppDocs/usesdk/android.html>
4. 在 Android Studio 中配置签名并构建 APK。

> 本项目规模小、无原生插件，一般**不需要**离线打包，直接云打包即可。

## 4. 生成正式签名（keystore，可选）

只有云打包选择「自有证书」时才需要。用 `keytool`（JDK 自带）生成：

```bash
keytool -genkey -v -keystore my_life_line.keystore -alias my_life_line -keyalg RSA -keysize 2048 -validity 36500
```

生成后妥善保管 `.keystore` 文件与口令——**丢失后无法对已发布的包做升级更新**。

## 5. 安装 APK 到手机

- **数据线方式**：手机开启 USB 调试，执行：

  ```bash
  adb install -r 你的.apk
  ```

- **免电脑方式**：把 APK 通过微信/QQ/网盘传到手机，用系统「文件管理」打开即可安装；
  若提示「禁止安装未知来源应用」，在设置中允许即可。

- **模拟器**：直接拖拽 APK 到模拟器窗口安装。

## 6. 常见问题

| 问题 | 解决办法 |
| --- | --- |
| 打包提示「未配置 AppID」 | 在 manifest.json 中点击「重新获取」在线申请 |
| 安装提示「应用未安装」/解析失败 | 多为签名不一致：卸载旧版本后再安装，或统一使用同一证书 |
| 升级后数据丢失 | 签名不一致时系统会拒绝覆盖安装；正式发版务必固定同一 keystore |
| 打包后页面白屏 | 先确认「运行到手机」能正常显示，再排查云打包配置 |
| `npm run build:app` 产物在哪 | 在 `frontend/dist/build/app`，这是资源包，不是 APK |

## 7. 相关命令速查（均在 `frontend/` 下执行）

```bash
npm install        # 安装依赖
npm test           # 单元测试
npm run build:app  # 生成安卓资源到 dist/build/app（不是 APK！）
```

---

**文档配套代码**：打包前建议先运行 `npm test` 确认功能正常，再用 HBuilderX 云打包，
这样可以避免把明显的问题带到安装包中。
