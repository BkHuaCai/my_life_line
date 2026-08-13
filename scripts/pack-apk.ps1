<#
.SYNOPSIS
  my_life_line 打包 APK 一键准备脚本（Windows + HBuilderX 云打包路线）

.DESCRIPTION
  按顺序自动完成：
    1. 检查 Node.js（要求 >= 22.12，缺失时用 winget 安装 LTS）
    2. 安装 npm 依赖
    3. 运行单元测试（npm test，不通过则中止）
    4. 生成安卓打包资源（npm run build:app）
    5. 定位 HBuilderX，启动并自动导入项目
  最后打印云打包的手动步骤清单。
  云端编译需要 DCloud 账号登录与图形界面点选，脚本负责把前面全部自动化。

.PARAMETER FrontendDir
  前端工程目录，默认 <仓库根>/frontend

.PARAMETER HbxPath
  HBuilderX.exe 的完整路径；不传时自动在常见目录查找（也支持环境变量 HBX_HOME）

.PARAMETER SkipInstall
  跳过 npm install

.PARAMETER SkipTest
  跳过 npm test

.PARAMETER SkipBuild
  跳过 npm run build:app

.PARAMETER NoOpen
  不自动启动 HBuilderX（只输出说明）

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\pack-apk.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\pack-apk.ps1 -HbxPath "D:\HBuilderX\HBuilderX.exe"

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\pack-apk.ps1 -NoOpen
#>

[CmdletBinding()]
param(
  [string]$FrontendDir = '',
  [string]$HbxPath = '',
  [switch]$SkipInstall,
  [switch]$SkipTest,
  [switch]$SkipBuild,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$MIN_NODE = [version]'22.12.0'

# 注意：$PSScriptRoot 在参数默认值中不可用（Windows PowerShell 5.1 限制），目录解析放到脚本体内
if (-not $FrontendDir) {
  $FrontendDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'frontend'
}

function Write-Step([string]$msg) { Write-Host "`n===== $msg =====" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn2([string]$msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Fail([string]$msg)       { Write-Error $msg; exit 1 }

# ---------- 1/5 检查 Node.js ----------
Write-Step '1/5 检查 Node.js'
$nodeVer = $null
try { $nodeVer = [version]((& node -v 2>$null) -replace '^v', '') } catch {}

if (-not $nodeVer) {
  Write-Warn2 '未检测到 Node.js，尝试通过 winget 自动安装 LTS 版本...'
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Fail '未找到 winget。请手动安装 Node.js（>= 22.12）：https://nodejs.org/zh-cn 或 https://github.com/nvm-sh/nvm-windows'
  }
  & winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Fail 'winget 安装 Node.js 失败，请手动安装后重试' }
  # 刷新当前进程的 PATH
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [System.Environment]::GetEnvironmentVariable('Path', 'User')
  try { $nodeVer = [version]((& node -v) -replace '^v', '') } catch {}
  if (-not $nodeVer) {
    Fail 'Node.js 已安装但 node 命令仍不可用，请关闭并重新打开终端后再运行本脚本'
  }
}

if ($nodeVer -lt $MIN_NODE) {
  Fail "Node.js 版本过低：v$nodeVer，本项目要求 >= v$MIN_NODE，请升级后重试"
}
Write-Ok "Node.js v$nodeVer"

# ---------- 2/5 安装依赖 ----------
if (-not (Test-Path $FrontendDir)) { Fail "未找到前端目录：$FrontendDir" }
$repoRoot = Split-Path $FrontendDir -Parent

Write-Step '2/5 安装 npm 依赖'
Push-Location $FrontendDir
try {
  if (-not $SkipInstall) {
    npm install
    if ($LASTEXITCODE -ne 0) { Fail 'npm install 失败，请检查网络后重试' }
  } else {
    Write-Warn2 '已跳过 npm install'
  }

  # ---------- 3/5 单元测试 ----------
  Write-Step '3/5 运行单元测试 (npm test)'
  if (-not $SkipTest) {
    npm test
    if ($LASTEXITCODE -ne 0) { Fail 'npm test 未通过，请先修复问题再打包' }
    Write-Ok '单元测试全部通过'
  } else {
    Write-Warn2 '已跳过 npm test'
  }

  # ---------- 4/5 生成安卓资源 ----------
  Write-Step '4/5 生成安卓打包资源 (npm run build:app)'
  if (-not $SkipBuild) {
    npm run build:app
    if ($LASTEXITCODE -ne 0) { Fail 'npm run build:app 失败' }
  } else {
    Write-Warn2 '已跳过 npm run build:app'
  }
} finally {
  Pop-Location
}
Write-Ok "安卓资源已生成：$FrontendDir\dist\build\app"

# ---------- 5/5 定位 HBuilderX ----------
Write-Step '5/5 定位 HBuilderX'
if (-not $HbxPath) {
  $candidates = @()
  if ($env:HBX_HOME) { $candidates += (Join-Path $env:HBX_HOME 'HBuilderX.exe') }
  $candidates += @(
    "$env:ProgramFiles\HBuilderX\HBuilderX.exe",
    "${env:ProgramFiles(x86)}\HBuilderX\HBuilderX.exe",
    "$env:LOCALAPPDATA\Programs\HBuilderX\HBuilderX.exe",
    "$env:USERPROFILE\HBuilderX\HBuilderX.exe",
    'D:\HBuilderX\HBuilderX.exe',
    'C:\HBuilderX\HBuilderX.exe',
    (Join-Path $repoRoot 'HBuilderX\HBuilderX.exe')
  )
  $HbxPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $HbxPath -or -not (Test-Path $HbxPath)) {
  Write-Warn2 '未找到 HBuilderX，请先手动安装：'
  Write-Host '  1) 打开 https://www.dcloud.io/hbuilderx.html 下载 Windows 版 zip（约 500 MB）'
  Write-Host '  2) 解压到固定目录（例如 D:\HBuilderX），双击 HBuilderX.exe 启动（绿色软件，免安装）'
  Write-Host "  3) 安装后重新运行本脚本，或加参数：-HbxPath 'D:\HBuilderX\HBuilderX.exe'"
  if (-not $NoOpen) {
    Start-Process 'https://www.dcloud.io/hbuilderx.html'
    Write-Warn2 '已为你打开 HBuilderX 下载页面'
  }
  Write-Host "`n安装完成后重新运行本脚本即可。云打包剩余步骤见 docs/build-apk.md 第 5 节。" -ForegroundColor Yellow
  exit 0
}
Write-Ok "HBuilderX: $HbxPath"

# 启动 HBuilderX 并用 CLI 自动导入项目（cli 需要 HBuilderX 3.1.5+，失败则退回手动导入）
if (-not $NoOpen) {
  Start-Process $HbxPath
  Write-Ok '已启动 HBuilderX，等待初始化...'
  Start-Sleep -Seconds 8
  $cli = Join-Path (Split-Path $HbxPath -Parent) 'cli.exe'
  if (Test-Path $cli) {
    try {
      & $cli project open --path $repoRoot | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-Ok "已自动导入项目：$repoRoot"
      } else {
        Write-Warn2 'CLI 导入未生效，请手动操作：文件 -> 导入 -> 从本地目录导入，选择仓库根目录'
      }
    } catch {
      Write-Warn2 'CLI 导入异常，请手动操作：文件 -> 导入 -> 从本地目录导入，选择仓库根目录'
    }
  } else {
    Write-Warn2 '未找到 cli.exe，请手动操作：文件 -> 导入 -> 从本地目录导入，选择仓库根目录'
  }
}

Write-Host @"

============================================================
云打包剩余步骤（需 DCloud 账号 + 图形界面，脚本无法全自动）：
  1. HBuilderX 中登录 DCloud 账号（菜单：帮助 -> 登录）
  2. 导入项目（若上面已自动导入可跳过）：
     文件 -> 导入 -> 从本地目录导入，选择 $repoRoot
     （CLI 工程须导入整个仓库根目录，编译走项目内编译器）
  3. 双击 frontend/src/manifest.json -> 基本设置 -> AppID 点「重新获取」
  4. 菜单「发行」->「原生App-云打包」-> 平台勾选 Android
  5. 证书：自用/调试选「使用公共测试证书」，正式上架选「使用自有证书」
  6. 点「打包」，云端编译完成后在「发行」面板下载 APK
详细说明见 docs/build-apk.md 第 5 节。
============================================================
"@ -ForegroundColor Green
