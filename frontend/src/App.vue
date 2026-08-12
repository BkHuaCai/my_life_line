<script>
import { db } from './utils/db'
export default {
  onLaunch() {
    db.init().catch((e) => console.error('db init fail', e))
  }
}
</script>

<style>
/* 全局基础样式 */
page {
  background-color: #f8f8f8;
}
</style>
