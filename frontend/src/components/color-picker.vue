<template>
  <view class="cp">
    <!-- 饱和度/亮度面板 -->
    <view class="cp-sv" @touchstart="onSvStart" @touchmove.stop.prevent="onSvMove" @touchend="onSvEnd">
      <view class="cp-sv-bg" :style="{ background: svBg }"></view>
      <view class="cp-thumb cp-sv-thumb" :style="{ left: satPct, top: valPct }"></view>
    </view>
    <!-- 色相条 -->
    <view class="cp-hue" @touchstart="onHueStart" @touchmove.stop.prevent="onHueMove" @touchend="onHueEnd">
      <view class="cp-hue-bar"></view>
      <view class="cp-thumb cp-hue-thumb" :style="{ left: huePct }"></view>
    </view>
  </view>
</template>

<script>
import { hexToHsv, hsvToHex } from '../utils/theme'

/**
 * HSV 调色盘：上方为饱和度/亮度面板，下方为色相条。
 * 拖动即可选色，变化时通过 @change 事件向上抛出 #rrggbb 颜色值。
 */
export default {
  name: 'ColorPicker',
  props: {
    value: { type: String, default: '#4a6cf7' }
  },
  data() {
    const { h, s, v } = hexToHsv(this.value)
    return {
      hue: h,
      sat: s,
      val: v,
      svRect: null,
      hueRect: null
    }
  },
  computed: {
    hueColor() {
      return hsvToHex(this.hue, 1, 1)
    },
    svBg() {
      return `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, ${this.hueColor})`
    },
    satPct() {
      return `${this.sat * 100}%`
    },
    valPct() {
      return `${(1 - this.val) * 100}%`
    },
    huePct() {
      return `${(this.hue / 360) * 100}%`
    }
  },
  watch: {
    value(nv) {
      // 外部切换（如点选预设主题）时同步内部滑块位置
      const { h, s, v } = hexToHsv(nv)
      this.hue = h
      this.sat = s
      this.val = v
    }
  },
  mounted() {
    this.refreshRects()
  },
  methods: {
    refreshRects() {
      uni.createSelectorQuery()
        .in(this)
        .select('.cp-sv')
        .boundingClientRect((rect) => {
          this.svRect = rect
        })
        .select('.cp-hue')
        .boundingClientRect((rect) => {
          this.hueRect = rect
        })
        .exec()
    },
    onSvStart() {
      this.refreshRects()
    },
    onSvMove(e) {
      this.applySv(e)
    },
    onSvEnd(e) {
      this.applySv(e)
    },
    applySv(e) {
      if (!this.svRect) return
      const t = e.touches && e.touches[0]
      if (!t) return
      const x = (t.clientX - this.svRect.left) / this.svRect.width
      const y = (t.clientY - this.svRect.top) / this.svRect.height
      this.sat = Math.min(1, Math.max(0, x))
      this.val = Math.min(1, Math.max(0, 1 - y))
      this.emitChange()
    },
    onHueStart() {
      this.refreshRects()
    },
    onHueMove(e) {
      this.applyHue(e)
    },
    onHueEnd(e) {
      this.applyHue(e)
    },
    applyHue(e) {
      if (!this.hueRect) return
      const t = e.touches && e.touches[0]
      if (!t) return
      const x = (t.clientX - this.hueRect.left) / this.hueRect.width
      this.hue = Math.min(1, Math.max(0, x)) * 360
      this.emitChange()
    },
    emitChange() {
      this.$emit('change', hsvToHex(this.hue, this.sat, this.val))
    }
  }
}
</script>

<style scoped>
.cp { width: 100%; }
.cp-sv { position: relative; width: 100%; height: 280rpx; border-radius: 16rpx; overflow: hidden; }
.cp-sv-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.cp-hue { position: relative; width: 100%; height: 48rpx; margin-top: 24rpx; border-radius: 24rpx; overflow: hidden; }
.cp-hue-bar { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000); }
.cp-thumb { position: absolute; width: 36rpx; height: 36rpx; border-radius: 50%; border: 4rpx solid #fff; box-shadow: 0 0 6rpx rgba(0,0,0,.4); transform: translate(-50%, -50%); box-sizing: border-box; }
.cp-sv-thumb { top: 50%; left: 50%; }
.cp-hue-thumb { top: 50%; }
</style>
