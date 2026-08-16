# Ubuntu 环境打包与模拟器验证指南

> 在 Ubuntu 上用 **HBuilderX Linux CLI 云打包**出 APK，并用 **Android 模拟器（+ scrcpy 投屏）** 做真机级验证。
> 本文档按本仓库实际跑通的流程编写（2026-08 验证），覆盖所有踩过的坑。

---

## 1. 环境与前置

| 组件 | 要求 | 说明 |
| --- | --- | --- |
| 系统 | Ubuntu（20.04/22.04/24.04 均可） | HBuilderX CLI 官方只测试过 Ubuntu |
| Java | JDK 17（云打包/HBuilderX 需要） | 本项目用 `~/.jdks/azul-17.0.15` |
| Node | ≥ 22.12（项目要求） | nvm 装 `v22.23.2` |
| DCloud 账号 | 必须 | 云打包登录 + 申请 AppID |
| 磁盘 | 预留 ≥ 8GB | HBuilderX ~2.5GB + Android SDK/镜像 ~4GB |

安装目录约定（本文档统一用 `~/Softs`）：

```
~/Softs/HBuilderX/        # HBuilderX Linux CLI
~/Softs/android-sdk/      # Android SDK
```

---

## 2. HBuilderX Linux CLI 云打包出 APK

### 2.1 下载安装

最新下载地址见官方文档页 https://hx.dcloud.net.cn/Tutorial/install/linux-cli
（GitHub 镜像文档里也有直链，格式如 `HBuilderX.5.24.2026081301.linux_x64.full.tar.gz`）：

```bash
cd ~/Softs
curl -L -O "https://download1.dcloud.net.cn/download/HBuilderX.5.24.2026081301.linux_x64.full.tar.gz"
tar -xzf HBuilderX.*.linux_x64.full.tar.gz && rm HBuilderX.*.linux_x64.full.tar.gz
```

### 2.2 启动 CLI 服务 + 登录

```bash
cd ~/Softs/HBuilderX
./cli open                                  # 启动 HBuilderX 服务（后台常驻）
./cli version                               # 确认版本
./cli user login --username 你的账号 --password 你的密码   # DCloud 账号（手机号/邮箱）
./cli user info                             # 确认登录成功
```

### 2.3 准备 AppID（必须！）

`frontend/src/manifest.json` 的 `appid` 必须是**当前 DCloud 账号**下真实存在的应用标识：

1. 浏览器登录 https://dev.dcloud.net.cn → 应用管理 → 创建应用 → 拿到 `__UNI__XXXXXXX`
2. 写入 `frontend/src/manifest.json` 的 `"appid"` 字段

> 否则云打包直接报错：`manifest.json中的AppID无效，请点击"重新获取"`。

### 2.4 manifest 关键配置（缺一不可）

```jsonc
// frontend/src/manifest.json
"app-plus": {
  "modules": {
    "SQLite": {},   // 数据库：缺失 → 真机数据不落盘/白屏
    "Camera": {}    // 相册/拍照选图：HBuilderX 3.6.11+ 默认不再包含，缺失 → uni.chooseImage 不可用
  },
  "distribute": {
    "android": {
      "abiFilters": ["arm64-v8a", "armeabi-v7a", "x86"],  // 必须含 x86，否则模拟器白屏（见 §4.3）
      "permissions": [ ... ]
    }
  }
}
```

> 注意：HBuilderX 云打包**只产 arm64-v8a / armeabi-v7a / x86 三套库，不支持 x86_64**（abiFilters 里写 x86_64 会被忽略）。

### 2.5 提交云打包

```bash
cd ~/Softs/HBuilderX
./cli project open --path /path/to/my_life_line/frontend   # 导入工程（只需一次）
./cli pack \
  --project /path/to/my_life_line/frontend \
  --platform android \
  --safemode false \
  --android.packagename com.bkhuacai.mylifeline \
  --android.androidpacktype 3        # 3=云端证书（推荐）；1=公共测试证书（新应用已不支持！）
```

- 打包成功后日志会输出 `下载地址: https://app.liuyingyong.cn/build/download/xxxx`（**临时地址，只能下载 5 次**）
- 包名注意：首次安装后不要改，否则无法覆盖升级
- **每日打包次数有限**：连续多次会报「今天已打包很多次，让云打包服务器休息休息」，需次日再打或后台充值

---

## 3. Android SDK + 模拟器（真机级验证）

### 3.1 安装 SDK 组件

```bash
export ANDROID_HOME=~/Softs/android-sdk JAVA_HOME=<你的JDK17路径>
SDK=$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager

# cmdline-tools：从 https://dl.google.com/android/repository/repository2-1.xml 里找最新
curl -L -O "https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip"
unzip -q commandlinetools-linux-*.zip -d $ANDROID_HOME/cmdline-tools/latest  # 注意目录层级

yes | $SDK --licenses
$SDK "platform-tools" "emulator" "system-images;android-30;google_apis;x86_64"
```

### 3.2 创建 AVD 并启动（无头）

```bash
AVD=$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager
echo no | $AVD create avd -n test_avd30 -k "system-images;android-30;google_apis;x86_64" --force

nohup $ANDROID_HOME/emulator/emulator \
  -avd test_avd30 -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-snapshot \
  > /tmp/emulator.log 2>&1 &

ADB=$ANDROID_HOME/platform-tools/adb
$ADB wait-for-device shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 3; done; echo BOOT_OK'
```

### 3.3 安装 APK 并启动

```bash
$ADB install -r 你的.apk
$ADB shell monkey -p com.bkhuacai.mylifeline -c android.intent.category.LAUNCHER 1
$ADB shell "dumpsys activity activities | grep topResumedActivity"   # 确认前台是应用
$ADB shell uiautomator dump /sdcard/ui.xml && $ADB shell cat /sdcard/ui.xml | grep -oE 'text="[^"]+"'   # 看页面文本
$ADB exec-out screencap -p > screen.png                              # 截图
$ADB logcat -d | grep -iE "SQLite|ExecuteJavaScript fail|JS ERROR"  # 看错误
```

### 3.4 scrcpy 投屏（把模拟器画面放到桌面，可鼠标/键盘直接操作）

```bash
export DISPLAY=:0
~/Softs/scrcpy/scrcpy --serial emulator-5554 --stay-awake
```

> scrcpy 与无头模拟器（`-no-window`）兼容：它镜像的是 Android 虚拟显示，不依赖模拟器窗口。
> 窗口出现后：鼠标点击 = 触屏，可直接操作 App（切 tab、填表单、点按钮）；`Ctrl+C` 退出。

### 3.5 常用 adb 技巧

- `adb root`：模拟器 google_apis 镜像支持；正式包 `run-as` 会报 `not debuggable`，想看应用私有数据必须 `adb root`
- 应用数据目录：`/storage/emulated/0/Android/data/<包名>/`；**SQLite 库在 `apps/<AppID>/doc/my_life_line.db`**，可用 `adb exec-out cat` 拉出来用 `sqlite3` 查询
- 输入中文/文本：`adb shell input text 'hello'`（仅 ASCII）；中文建议直接用 scrcpy 键盘

---

## 4. 本仓库踩过的坑（重要）

### 4.1 SQLite 库打不开 → `SQLITE_CANTOPEN: Path is a directory`

**症状**：应用能打开、页面空白、所有数据区 v-if 消失；logcat 报 `SQLiteCantOpenDatabaseException`。

**原因**：`plus.sqlite.openDatabase({ name, path })` 的 `path` **必须是含文件名的路径**（如 `_doc/my_life_line.db`），
不能只传目录 `_doc`。已修复：`storage.js` 的 `DB_PATH = '_doc/my_life_line.db'`。

### 4.2 SQLite / 相机模块没进包

**症状**：数据不落盘（或选图不可用）。**原因**：manifest `app-plus.modules` 没声明。
已修复：声明 `SQLite` + `Camera`（HBuilderX 3.6.11+ 云打包默认不再包含相机/相册/扫码/录音模块）。

### 4.3 模拟器白屏 → weex JS 服务起不来

**症状**：只有 tabBar，页面主体空白；logcat 反复报：
`WeexCore: InitFramework sender is null` / `ExecuteJavaScript fail` / `spinWaitPeer timeout`。

**原因**：APK 只有 arm64 库，x86 模拟器走 **ARM 翻译**运行，weex 多进程 JS 服务在翻译层超时。

**两个叠加的坑**：
1. manifest `abiFilters` 没含 `x86` → 云打包不产 x86 库（已修复，加了 x86）
2. **API 34 模拟器镜像的 ABI 列表只有 `x86_64,arm64-v8a`，没有 32 位 x86**；而 HBuilderX 云打包不产 x86_64 → 死循环
   → **用 android-30 镜像**（其 ABI 列表为 `x86_64,x86,arm64-v8a,armeabi-v7a`，应用 x86 原生运行，正常）

检查方式：
```bash
adb shell getprop ro.product.cpu.abilist     # 设备支持的 ABI
adb shell "dumpsys package <包名> | grep primaryCpuAbi"   # 应用实际选的 ABI（应为 x86）
unzip -l 你的.apk | grep -oE 'lib/[^/]+/' | sort -u        # APK 里有哪些 ABI 库
```

### 4.4 云打包 AppID 无效

manifest 里旧 AppID（`__UNI__19A500F`）不属于当前账号 → 云打包报错。
解决：dev.dcloud.net.cn 创建应用 → 新 AppID 写入 manifest（已更新为 `__UNI__06E0973`）。

### 4.5 公共测试证书不再支持新应用

`--android.androidpacktype 1`（公共证书）对**新应用**报错「存在安全隐患，不再支持」。
改用 **`3`（云端证书）**。

---

## 5. 一键验证清单（模拟器）

| # | 操作 | 预期 |
| --- | --- | --- |
| 1 | 安装 APK + monkey 启动 | 应用进前台，无崩溃 |
| 2 | 主页截图/dump | 「我」档案、主线、数据概览、搜索栏渲染 |
| 3 | 切「我的」tab | 当前档案卡、统计带、我的档案、最近动态、回收站入口、主题配色 |
| 4 | 拉取 `apps/<AppID>/doc/my_life_line.db` | 表 person/timeline/event/event_image 齐全，默认用户「我」+ 主线 |
| 5 | scrcpy 投屏 | 桌面窗口出现模拟器画面，鼠标可操作 |
| 6 | 主页点「主线」→ 填写初始点 → 保存 | db 里 event 表多一条记录 |
| 7 | 回收站页 | 空状态「回收站是空的」 |

---

## 6. 相关命令速查

```bash
# 云打包
~/Softs/HBuilderX/cli pack --project <frontend绝对路径> --platform android --safemode false --android.packagename com.bkhuacai.mylifeline --android.androidpacktype 3

# 模拟器
~/Softs/android-sdk/emulator/emulator -avd test_avd30 -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-snapshot &

# adb
~/Softs/android-sdk/platform-tools/adb install -r 包.apk
~/Softs/android-sdk/platform-tools/adb shell monkey -p com.bkhuacai.mylifeline -c android.intent.category.LAUNCHER 1

# 投屏
DISPLAY=:0 ~/Softs/scrcpy/scrcpy --serial emulator-5554 --stay-awake
```
