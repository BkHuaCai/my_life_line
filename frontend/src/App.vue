<script>
import { db } from './utils/db'
import { getThemePrimary, applyTheme } from './utils/theme'

export default {
  onLaunch() {
    db.init().catch((e) => console.error('db init fail', e))
    applyTheme(getThemePrimary())
  }
}
</script>

<style>
/* 全局主题 CSS 变量：默认软件主流配色（靛蓝）
   运行时由 utils/theme.js 写入根元素覆盖，实现自定义配色 */
page {
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
  background-color: var(--bg-page);
}
</style>
