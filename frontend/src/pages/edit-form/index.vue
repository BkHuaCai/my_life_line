<template>
  <view class="page">
    <!-- 人物表单 -->
    <template v-if="entityType === 'person'">
      <view class="field">
        <text class="label">头像</text>
        <view class="avatar-picker">
          <view class="avatar-wrap" @click="chooseAvatar">
            <image v-if="form.avatar_path" class="avatar-img" :src="form.avatar_path" mode="aspectFill" />
            <view v-else class="avatar-placeholder">＋</view>
          </view>
          <text class="avatar-tip">点击更换头像</text>
        </view>
      </view>
      <view class="field">
        <text class="label">名称 *</text>
        <input class="input" v-model="form.name" placeholder="如：小明、布丁、我的电脑" />
      </view>
      <view class="field">
        <text class="label">起始日期</text>
        <picker mode="date" :value="form.birth_date" @change="(e) => (form.birth_date = e.detail.value)">
          <view class="picker">{{ form.birth_date || '选择日期' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">起始时间精度（可选）</text>
        <view class="seg">
          <view :class="['seg-item', form.birth_precision === 'none' ? 'active' : '']" @click="setBirthPrecision('none')">仅日期</view>
          <view :class="['seg-item', form.birth_precision === 'hour' ? 'active' : '']" @click="setBirthPrecision('hour')">到时</view>
          <view :class="['seg-item', form.birth_precision === 'minute' ? 'active' : '']" @click="setBirthPrecision('minute')">到分</view>
          <view :class="['seg-item', form.birth_precision === 'second' ? 'active' : '']" @click="setBirthPrecision('second')">到秒</view>
        </view>
      </view>
      <view class="field" v-if="form.birth_precision !== 'none'">
        <text class="label">起始时间</text>
        <view class="time-row">
          <picker class="time-picker" mode="selector" :range="hourRange" :value="form.birth_hour" @change="(e) => (form.birth_hour = Number(e.detail.value))">
            <view class="picker">{{ pad(form.birth_hour) }} 时</view>
          </picker>
          <picker v-if="form.birth_precision === 'minute' || form.birth_precision === 'second'" class="time-picker" mode="selector" :range="minuteRange" :value="form.birth_minute" @change="(e) => (form.birth_minute = Number(e.detail.value))">
            <view class="picker">{{ pad(form.birth_minute) }} 分</view>
          </picker>
          <picker v-if="form.birth_precision === 'second'" class="time-picker" mode="selector" :range="secondRange" :value="form.birth_second" @change="(e) => (form.birth_second = Number(e.detail.value))">
            <view class="picker">{{ pad(form.birth_second) }} 秒</view>
          </picker>
        </view>
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea class="input textarea" v-model="form.note" placeholder="一句话介绍" />
      </view>
      <button class="save-btn" @click="save">保存</button>
    </template>

    <!-- 时间线表单 -->
    <template v-else-if="entityType === 'timeline'">
      <view class="field">
        <text class="label">名称 *</text>
        <input class="input" v-model="form.name" placeholder="如：成长记录" />
      </view>
      <view class="field">
        <text class="label">分类</text>
        <input class="input" v-model="form.category" placeholder="如：教育 / 旅行 / 健康" />
      </view>
      <button class="save-btn" @click="save">保存</button>
    </template>

    <!-- 事件表单 -->
    <template v-else-if="entityType === 'event'">
      <view class="field">
        <text class="label">标题 *</text>
        <input class="input" v-model="form.title" placeholder="如：本科毕业典礼" />
      </view>

      <view class="field">
        <text class="label">时间类型</text>
        <view class="seg">
          <view :class="['seg-item', form.date_type === 'point' ? 'active' : '']" @click="form.date_type = 'point'">时间点</view>
          <view :class="['seg-item', form.date_type === 'range' ? 'active' : '']" @click="form.date_type = 'range'">时间段</view>
        </view>
      </view>

      <view class="field" v-if="form.date_type === 'point'">
        <text class="label">日期</text>
        <picker mode="date" :value="form.date_point" @change="(e) => (form.date_point = e.detail.value)">
          <view class="picker">{{ form.date_point || '选择日期' }}</view>
        </picker>
      </view>

      <view class="field" v-if="form.date_type === 'point'">
        <text class="label">时间精度（可选）</text>
        <view class="seg">
          <view :class="['seg-item', form.time_precision === 'none' ? 'active' : '']" @click="setPrecision('none')">仅日期</view>
          <view :class="['seg-item', form.time_precision === 'hour' ? 'active' : '']" @click="setPrecision('hour')">到时</view>
          <view :class="['seg-item', form.time_precision === 'minute' ? 'active' : '']" @click="setPrecision('minute')">到分</view>
          <view :class="['seg-item', form.time_precision === 'second' ? 'active' : '']" @click="setPrecision('second')">到秒</view>
        </view>
      </view>

      <view class="field" v-if="form.date_type === 'point' && form.time_precision !== 'none'">
        <text class="label">时间</text>
        <view class="time-row">
          <picker class="time-picker" mode="selector" :range="hourRange" :value="form.hour" @change="(e) => (form.hour = Number(e.detail.value))">
            <view class="picker">{{ pad(form.hour) }} 时</view>
          </picker>
          <picker v-if="form.time_precision === 'minute' || form.time_precision === 'second'" class="time-picker" mode="selector" :range="minuteRange" :value="form.minute" @change="(e) => (form.minute = Number(e.detail.value))">
            <view class="picker">{{ pad(form.minute) }} 分</view>
          </picker>
          <picker v-if="form.time_precision === 'second'" class="time-picker" mode="selector" :range="secondRange" :value="form.second" @change="(e) => (form.second = Number(e.detail.value))">
            <view class="picker">{{ pad(form.second) }} 秒</view>
          </picker>
        </view>
      </view>

      <template v-else>
        <view class="field">
          <text class="label">开始日期</text>
          <picker mode="date" :value="form.date_start" @change="(e) => (form.date_start = e.detail.value)">
            <view class="picker">{{ form.date_start || '选择日期' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">结束日期（空 = 至今）</text>
          <picker mode="date" :value="form.date_end" @change="(e) => (form.date_end = e.detail.value)">
            <view class="picker">{{ form.date_end || '至今' }}</view>
          </picker>
        </view>
      </template>

      <view class="field">
        <text class="label">描述</text>
        <textarea class="input textarea" v-model="form.description" placeholder="记录当时的感受…" />
      </view>

      <view class="field">
        <text class="label">图片（最多 9 张）</text>
        <view class="img-grid">
          <view v-for="(img, i) in form.images" :key="i" class="img-wrap">
            <image class="img" :src="img.preview" mode="aspectFill" @click="preview(i)" />
            <view class="img-del" @click="removeImage(i)">×</view>
          </view>
          <view v-if="form.images.length < 9" class="img-add" @click="addImages">＋</view>
        </view>
      </view>

      <button class="save-btn" @click="save">保存</button>
    </template>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { chooseAndStoreImages, chooseAvatar } from '../../utils/image'
import { parseEventDate, buildEventDate } from '../../utils/date'

export default {
  data() {
    return {
      entityType: 'person',
      id: '',
      personId: '',
      timelineId: '',
      form: {
        // person
        name: '',
        birth_date: '',
        birth_precision: 'none',
        birth_hour: 0,
        birth_minute: 0,
        birth_second: 0,
        note: '',
        avatar_path: '',
        // timeline
        category: '',
        is_main: 0,
        // event
        title: '',
        description: '',
        date_type: 'point',
        date_point: '',
        date_start: '',
        date_end: '',
        time_precision: 'none',
        hour: 0,
        minute: 0,
        second: 0,
        images: []
      },
      hourRange: Array.from({ length: 24 }, (_, i) => i),
      minuteRange: Array.from({ length: 60 }, (_, i) => i),
      secondRange: Array.from({ length: 60 }, (_, i) => i)
    }
  },
  async onLoad(options) {
    this.entityType = options.entityType || 'person'
    this.id = options.id || ''
    this.personId = options.personId || ''
    this.timelineId = options.timelineId || ''
    const titles = { person: '编辑档案', timeline: '编辑时间线', event: '编辑事件' }
    uni.setNavigationBarTitle({ title: this.id ? titles[this.entityType] : `新建${this.entityType === 'person' ? '档案' : this.entityType === 'timeline' ? '时间线' : '事件'}` })
    if (this.id) await this.loadForm()
  },
  methods: {
    async loadForm() {
      if (this.entityType === 'person') {
        const p = await db.getPerson(this.id)
        const { date, time, precision } = parseEventDate(p.birth_date)
        const [hh = 0, mm = 0, ss = 0] = time ? time.split(':').map(Number) : []
        this.form = {
          name: p.name,
          birth_date: date || '',
          birth_precision: precision,
          birth_hour: hh,
          birth_minute: mm,
          birth_second: ss,
          note: p.note || '',
          avatar_path: p.avatar_path || ''
        }
      } else if (this.entityType === 'timeline') {
        const tl = await db.getTimeline(this.id)
        this.form = { name: tl.name, category: tl.category || '', is_main: tl.is_main || 0 }
      } else {
        const ev = await db.getEvent(this.id)
        const { date, time, precision } = parseEventDate(ev.date_point)
        const [hh = 0, mm = 0, ss = 0] = time ? time.split(':').map(Number) : []
        this.form = {
          title: ev.title,
          description: ev.description || '',
          date_type: ev.date_type,
          date_point: date || '',
          date_start: ev.date_start || '',
          date_end: ev.date_end || '',
          time_precision: precision,
          hour: hh,
          minute: mm,
          second: ss,
          images: (await db.getImagesByEvent(ev.id)).map((im) => ({ preview: im.thumb_path || im.image_path, _path: im }))
        }
      }
    },
    addImages() {
      chooseAndStoreImages(this.id || 'new').then((stored) => {
        for (const s of stored) this.form.images.push({ preview: s.thumb_path || s.image_path, _path: s })
      }).catch(() => uni.showToast({ title: '选择图片失败', icon: 'none' }))
    },
    chooseAvatar() {
      chooseAvatar().then((path) => {
        this.form.avatar_path = path
      }).catch(() => uni.showToast({ title: '选择头像失败', icon: 'none' }))
    },
    setPrecision(p) {
      this.form.time_precision = p
    },
    setBirthPrecision(p) {
      this.form.birth_precision = p
    },
    pad(n) {
      return String(n == null ? 0 : n).padStart(2, '0')
    },
    removeImage(i) {
      this.form.images.splice(i, 1)
    },
    preview(i) {
      uni.previewImage({ urls: this.form.images.map((im) => im.preview), current: i })
    },
    async save() {
      const { entityType, form } = this
      if (entityType === 'person') {
        if (!form.name) return uni.showToast({ title: '请填写名称', icon: 'none' })
        await db.savePerson({ id: this.id || undefined, name: form.name, birth_date: buildEventDate(form.birth_date, form.birth_precision, form.birth_hour, form.birth_minute, form.birth_second) || null, note: form.note || null, avatar_path: form.avatar_path || null })
      } else if (entityType === 'timeline') {
        if (!form.name) return uni.showToast({ title: '请填写名称', icon: 'none' })
        await db.saveTimeline({ id: this.id || undefined, person_id: this.personId, name: form.name, category: form.category || null, is_private: 1, is_main: form.is_main || 0 })
      } else {
        if (!form.title) return uni.showToast({ title: '请填写标题', icon: 'none' })
        const row = {
          id: this.id || undefined,
          timeline_id: this.timelineId,
          title: form.title,
          description: form.description || null,
          date_type: form.date_type,
          date_point: form.date_type === 'point' ? buildEventDate(form.date_point, form.time_precision, form.hour, form.minute, form.second) || null : null,
          date_start: form.date_type === 'range' ? form.date_start || null : null,
          date_end: form.date_type === 'range' ? form.date_end || null : null
        }
        await db.saveEvent({ ...row, images: form.images.map((im) => im._path) })
      }
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.field { margin-bottom: 32rpx; }
.label { font-size: 26rpx; color: var(--text-sub); display: block; margin-bottom: 12rpx; }
.input { background: var(--bg-card); border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; height: 84rpx; min-height: 84rpx; }
.textarea { min-height: 160rpx; }
.picker { background: var(--bg-card); border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; color: var(--text-main); }
.seg { display: flex; gap: 16rpx; }
.seg-item { flex: 1; text-align: center; padding: 18rpx; border-radius: 12rpx; background: var(--bg-card); color: var(--text-sub); }
.seg-item.active { background: var(--primary); color: var(--primary-contrast); }
.time-row { display: flex; gap: 16rpx; }
.time-picker { flex: 1; }
.time-picker .picker { text-align: center; }
.img-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.img-wrap { position: relative; width: 180rpx; height: 180rpx; }
.img { width: 180rpx; height: 180rpx; border-radius: 12rpx; }
.img-del { position: absolute; top: -12rpx; right: -12rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,.6); color: var(--primary-contrast); display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.img-add { width: 180rpx; height: 180rpx; border: 2rpx dashed var(--text-light); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; color: var(--text-light); font-size: 48rpx; }
.save-btn { margin-top: 40rpx; background: var(--primary); color: var(--primary-contrast); font-size: 32rpx; border-radius: 48rpx; }

/* 头像选择 */
.avatar-picker { display: flex; align-items: center; gap: 24rpx; }
.avatar-wrap { width: 120rpx; height: 120rpx; border-radius: 50%; overflow: hidden; background: var(--bg-muted); }
.avatar-img { width: 100%; height: 100%; }
.avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: var(--text-light); border: 2rpx dashed var(--border); border-radius: 50%; }
.avatar-tip { font-size: 24rpx; color: var(--text-grey); }
</style>
