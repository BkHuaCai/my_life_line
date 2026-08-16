<template>
  <view class="undo-toast" v-if="visible">
    <text class="undo-msg">{{ msg }}</text>
    <text class="undo-action" @click="undo">撤回</text>
  </view>
</template>

<script>
// 删除后出现的「已删除 + 撤回」提示条：点击「撤回」执行恢复回调，
// 5 秒未操作自动消失并触发 onExpire（如返回上一页）。
export default {
  name: 'UndoToast',
  data() {
    return { visible: false, msg: '', onUndo: null, onExpire: null, timer: null }
  },
  methods: {
    show(msg, onUndo, onExpire) {
      this.msg = msg
      this.onUndo = onUndo
      this.onExpire = onExpire
      this.visible = true
      this.clearTimer()
      this.timer = setTimeout(() => {
        this.visible = false
        if (this.onExpire) this.onExpire()
      }, 5000)
    },
    undo() {
      this.clearTimer()
      this.visible = false
      if (this.onUndo) this.onUndo()
    },
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    },
    // 页面切走时隐藏，避免提示条残留到下一页
    hide() {
      this.clearTimer()
      this.visible = false
    }
  }
}
</script>

<style scoped>
.undo-toast { position: fixed; left: 32rpx; right: 32rpx; bottom: 120rpx; background: rgba(17, 24, 39, .92); border-radius: 16rpx; padding: 24rpx 28rpx; display: flex; justify-content: space-between; align-items: center; z-index: 300; box-shadow: 0 8rpx 24rpx rgba(0,0,0,.2); }
.undo-msg { color: #fff; font-size: 28rpx; flex: 1; overflow: hidden; }
.undo-action { color: #66b3ff; font-size: 30rpx; font-weight: 700; padding-left: 24rpx; }
</style>
