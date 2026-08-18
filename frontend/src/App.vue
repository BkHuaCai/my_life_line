<script>
import { db } from './utils/db'
import { getThemePrimary, applyTheme } from './utils/theme'

// 全局 JS 错误捕获：写入 _doc/jserr.log，便于真机/模拟器定位运行时异常
// （生产包 console 不进入 logcat，页面空白/崩溃时靠它拿到真实报错）
function logJsError(tag, detail) {
  try {
    plus.io.resolveLocalFileSystemURL('_doc', (root) => {
      root.getFile('jserr.log', { create: true }, (fe) => {
        fe.createWriter((w) => {
          w.seek(w.length)
          w.write(`[${new Date().toISOString()}] ${tag}: ${String(detail)}\n`)
        }, () => {})
      }, () => {})
    })
  } catch (e) {}
}

export default {
  onLaunch() {
    if (typeof uni !== 'undefined' && uni.onError) {
      uni.onError((err) => logJsError('uni.onError', JSON.stringify(err)))
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => logJsError('window.onerror', `${e.message} @line ${e.lineno || ''}`))
      window.addEventListener('unhandledrejection', (e) => logJsError('unhandledrejection', String((e.reason && (e.reason.message || e.reason)) || e.reason)))
    }
    db.init().catch((e) => console.error('db init fail', e))
    applyTheme(getThemePrimary())
  }
}
</script>

<style>
/* 全局主题 CSS 变量：默认软件主流配色（靛蓝）
   必须定义在 :root（html）而非 page 上：
   page 在 App 端会被编译为 body，body 自身携带变量值后，
   运行时写入 <html> 的内联变量无法再级联穿透，导致自定义配色不生效 */
:root {
  --primary: #4a6cf7;
  --primary-dark: #3a56d4;
  --primary-soft: #eef1ff;
  --primary-contrast: #ffffff;
  --danger: #ff5a5a;
  --bg-page: #f6f7fb;
  --bg-card: #ffffff;
  --bg-muted: #f0f0f0;
  --text-main: #1f2329;
  --text-sub: #646a73;
  --text-grey: #8f959e;
  --text-light: #c0c4cc;
  --border: #e5e6eb;
  --shadow-card: 0 2rpx 8rpx rgba(31, 35, 41, 0.06);
}
page {
  background-color: var(--bg-page);
}
</style>
