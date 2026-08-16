<template>
  <view class="page">
    <nav-bar :title="navTitle" />
    <!-- 人物表单 -->
    <template v-if="entityType === 'person'">
      <view class="group">
        <view class="group-title">基本信息</view>
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
          <text class="label">备注</text>
          <textarea class="input textarea" v-model="form.note" placeholder="一句话介绍" />
        </view>
      </view>
      <view class="group">
        <view class="group-title">起始时间</view>
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
      </view>
      <button class="save-btn" @click="save">保存</button>
    </template>

    <!-- 时间线表单 -->
    <template v-else-if="entityType === 'timeline'">
      <view class="group">
        <view class="group-title">基本信息</view>
        <view class="field">
          <text class="label">名称 *</text>
          <input class="input" v-model="form.name" placeholder="如：成长记录" />
        </view>
        <view class="field">
          <text class="label">分类</text>
          <input class="input" v-model="form.category" placeholder="如：教育 / 旅行 / 健康" />
        </view>
      </view>
      <button class="save-btn" @click="save">保存</button>
    </template>

    <!-- 动态表单 -->
    <template v-else-if="entityType === 'event'">
      <view class="group">
        <view class="group-title">基本信息</view>
        <view class="field">
          <text class="label">标题 *</text>
          <input class="input" v-model="form.title" placeholder="如：本科毕业典礼" />
        </view>
        <view class="field">
          <text class="label">描述</text>
          <textarea class="input textarea" v-model="form.description" placeholder="记录当时的感受…" />
        </view>
      </view>

      <view class="group">
        <view class="group-title">时间信息</view>
        <view class="field" v-if="!isInitPoint">
          <text class="label">时间类型</text>
          <view class="seg">
            <view :class="['seg-item', form.date_type === 'point' ? 'active' : '']" @click="form.date_type = 'point'">时间点</view>
            <view :class="['seg-item', form.date_type === 'range' ? 'active' : '']" @click="form.date_type = 'range'">时间段</view>
          </view>
        </view>
        <view class="field" v-if="isInitPoint">
          <text class="label">时间类型</text>
          <view class="picker">时间点（初始点仅支持时间点）</view>
        </view>

        <view class="field" v-if="form.date_type === 'point'">
          <view class="label-row">
            <text class="label">日期</text>
            <view class="now-btn" @click="setNow">当前时间</view>
          </view>
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

        <template v-else-if="form.date_type === 'range'">
          <view class="field">
            <view class="label-row">
              <text class="label">开始日期</text>
              <view class="now-btn" @click="setStartNow">当前时间</view>
            </view>
            <picker mode="date" :value="form.date_start" @change="(e) => (form.date_start = e.detail.value)">
              <view class="picker">{{ form.date_start || '选择日期' }}</view>
            </picker>
          </view>
          <view class="field">
            <view class="label-row">
              <text class="label">结束日期（空 = 至今）</text>
              <view class="now-btn" @click="setEndNow">当前时间</view>
            </view>
            <picker mode="date" :value="form.date_end" @change="(e) => (form.date_end = e.detail.value)">
              <view class="picker">{{ form.date_end || '至今' }}</view>
            </picker>
          </view>

          <view class="field">
            <text class="label">时间精度（可选，开始与结束共用）</text>
            <view class="seg">
              <view :class="['seg-item', form.time_precision === 'none' ? 'active' : '']" @click="setPrecision('none')">仅日期</view>
              <view :class="['seg-item', form.time_precision === 'hour' ? 'active' : '']" @click="setPrecision('hour')">到时</view>
              <view :class="['seg-item', form.time_precision === 'minute' ? 'active' : '']" @click="setPrecision('minute')">到分</view>
              <view :class="['seg-item', form.time_precision === 'second' ? 'active' : '']" @click="setPrecision('second')">到秒</view>
            </view>
          </view>

          <template v-if="form.time_precision !== 'none'">
            <view class="field">
              <text class="label">开始时间</text>
              <view class="time-row">
                <picker class="time-picker" mode="selector" :range="hourRange" :value="form.start_hour" @change="(e) => (form.start_hour = Number(e.detail.value))">
                  <view class="picker">{{ pad(form.start_hour) }} 时</view>
                </picker>
                <picker v-if="form.time_precision === 'minute' || form.time_precision === 'second'" class="time-picker" mode="selector" :range="minuteRange" :value="form.start_minute" @change="(e) => (form.start_minute = Number(e.detail.value))">
                  <view class="picker">{{ pad(form.start_minute) }} 分</view>
                </picker>
                <picker v-if="form.time_precision === 'second'" class="time-picker" mode="selector" :range="secondRange" :value="form.start_second" @change="(e) => (form.start_second = Number(e.detail.value))">
                  <view class="picker">{{ pad(form.start_second) }} 秒</view>
                </picker>
              </view>
            </view>
            <view class="field" v-if="form.date_end">
              <text class="label">结束时间</text>
              <view class="time-row">
                <picker class="time-picker" mode="selector" :range="hourRange" :value="form.end_hour" @change="(e) => (form.end_hour = Number(e.detail.value))">
                  <view class="picker">{{ pad(form.end_hour) }} 时</view>
                </picker>
                <picker v-if="form.time_precision === 'minute' || form.time_precision === 'second'" class="time-picker" mode="selector" :range="minuteRange" :value="form.end_minute" @change="(e) => (form.end_minute = Number(e.detail.value))">
                  <view class="picker">{{ pad(form.end_minute) }} 分</view>
                </picker>
                <picker v-if="form.time_precision === 'second'" class="time-picker" mode="selector" :range="secondRange" :value="form.end_second" @change="(e) => (form.end_second = Number(e.detail.value))">
                  <view class="picker">{{ pad(form.end_second) }} 秒</view>
                </picker>
              </view>
            </view>
          </template>
        </template>
      </view>

      <view class="group">
        <view class="group-title">图片</view>
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
      </view>

      <button class="save-btn" @click="save">保存</button>
    </template>
  </view>
</template>

<script>
import { db } from '../../utils/db'
import { chooseAndStoreImages, chooseAvatar } from '../../utils/image'
import { parseEventDate, buildEventDate, nowParts } from '../../utils/date'
import { applyTheme, getThemePrimary } from '../../utils/theme'
import NavBar from '../../components/nav-bar.vue'

export default {
  components: { NavBar },
  data() {
    return {
      navTitle: '编辑',
      isInitPoint: false,
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
        start_hour: 0,
        start_minute: 0,
        start_second: 0,
        end_hour: 0,
        end_minute: 0,
        end_second: 0,
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
    const titles = { person: '编辑档案', timeline: '编辑时间线', event: '编辑动态' }
    this.navTitle = this.id ? titles[this.entityType] : `新建${this.entityType === 'person' ? '档案' : this.entityType === 'timeline' ? '时间线' : '动态'}`
    if (this.id) await this.loadForm()
  },
  onShow() {
    applyTheme(getThemePrimary())
    if (db.ready) db.ready.catch(() => {})
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
        // 初始点（时间线第一条动态）仅支持时间点：编辑时锁定，不提供时间段选项
        const tlEvents = ev.timeline_id ? await db.getEventsByTimeline(ev.timeline_id) : []
        this.isInitPoint = tlEvents.length > 0 && tlEvents[0].id === ev.id
        const dt = this.isInitPoint ? 'point' : ev.date_type
        // 时间点取 date_point，时间段取 date_start（回退 date_end）解析精度，开始/结束共用同一精度
        const p = parseEventDate(ev.date_point)
        const s = parseEventDate(ev.date_start)
        const e = parseEventDate(ev.date_end)
        const precision = ev.date_type === 'range'
          ? (s.precision !== 'none' ? s.precision : e.precision)
          : p.precision
        const [ph = 0, pm = 0, ps = 0] = p.time ? p.time.split(':').map(Number) : []
        const [sh = 0, sm = 0, ss = 0] = s.time ? s.time.split(':').map(Number) : []
        const [eh = 0, em = 0, es = 0] = e.time ? e.time.split(':').map(Number) : []
        this.form = {
          title: ev.title,
          description: ev.description || '',
          date_type: dt,
          date_point: p.date || '',
          date_start: s.date || '',
          date_end: e.date || '',
          time_precision: precision,
          hour: ph,
          minute: pm,
          second: ps,
          start_hour: sh,
          start_minute: sm,
          start_second: ss,
          end_hour: eh,
          end_minute: em,
          end_second: es,
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
    setNow() {
      const { date, hour, minute, second } = nowParts()
      this.form.date_point = date
      this.form.hour = hour
      this.form.minute = minute
      this.form.second = second
    },
    setStartNow() {
      const { date, hour, minute, second } = nowParts()
      this.form.date_start = date
      this.form.start_hour = hour
      this.form.start_minute = minute
      this.form.start_second = second
    },
    setEndNow() {
      const { date, hour, minute, second } = nowParts()
      this.form.date_end = date
      this.form.end_hour = hour
      this.form.end_minute = minute
      this.form.end_second = second
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
        // 初始点编辑时强制时间点（防御：即使表单状态被改动也不落时间段）
        const dt = this.isInitPoint ? 'point' : form.date_type
        const row = {
          id: this.id || undefined,
          timeline_id: this.timelineId,
          title: form.title,
          description: form.description || null,
          date_type: dt,
          date_point: dt === 'point' ? buildEventDate(form.date_point, form.time_precision, form.hour, form.minute, form.second) || null : null,
          date_start: dt === 'range' ? buildEventDate(form.date_start, form.time_precision, form.start_hour, form.start_minute, form.start_second) || null : null,
          date_end: dt === 'range' ? buildEventDate(form.date_end, form.time_precision, form.end_hour, form.end_minute, form.end_second) || null : null
        }
        await db.saveEvent({ ...row, images: form.images.map((im) => im._path) })
      }
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 140rpx; }
/* 分组卡片：把字段按"基本信息/时间信息/图片"分组，参考主流表单分段 */
.group { background: var(--bg-card); border-radius: 20rpx; padding: 28rpx 24rpx; margin-bottom: 24rpx; box-shadow: var(--shadow-card); }
.group-title { display: flex; align-items: center; gap: 16rpx; font-size: 28rpx; font-weight: 700; color: var(--text-main); margin-bottom: 24rpx; }
.group-title::before { content: ''; width: 8rpx; height: 28rpx; border-radius: 4rpx; background: var(--primary); }
.field { margin-bottom: 28rpx; }
.field:last-child { margin-bottom: 0; }
.label { font-size: 26rpx; color: var(--text-sub); display: block; margin-bottom: 12rpx; }
.label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.label-row .label { margin-bottom: 0; }
.input { background: var(--bg-muted); border-radius: 16rpx; padding: 20rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; height: 84rpx; min-height: 84rpx; }
.textarea { min-height: 160rpx; }
.picker { background: var(--bg-muted); border-radius: 16rpx; padding: 20rpx; font-size: 30rpx; color: var(--text-main); }
.seg { display: flex; gap: 16rpx; }
.seg-item { flex: 1; text-align: center; padding: 18rpx; border-radius: 16rpx; background: var(--bg-muted); color: var(--text-sub); }
.seg-item.active { background: var(--primary); color: var(--primary-contrast); }
.time-row { display: flex; gap: 16rpx; }
.time-picker { flex: 1; }
.time-picker .picker { text-align: center; }
.now-btn { flex-shrink: 0; background: var(--primary-soft); color: var(--primary-dark); font-size: 24rpx; border-radius: 24rpx; padding: 0 20rpx; display: flex; align-items: center; }
.img-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.img-wrap { position: relative; width: 180rpx; height: 180rpx; }
.img { width: 180rpx; height: 180rpx; border-radius: 16rpx; }
.img-del { position: absolute; top: -12rpx; right: -12rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,.6); color: var(--primary-contrast); display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.img-add { width: 180rpx; height: 180rpx; border: 2rpx dashed var(--text-light); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; color: var(--text-light); font-size: 48rpx; }
.save-btn { margin-top: 16rpx; background: var(--primary); color: var(--primary-contrast); font-size: 32rpx; border-radius: 48rpx; }
.save-btn::after { border: none; }

/* 头像选择 */
.avatar-picker { display: flex; align-items: center; gap: 24rpx; }
.avatar-wrap { width: 120rpx; height: 120rpx; border-radius: 50%; overflow: hidden; background: var(--bg-muted); }
.avatar-img { width: 100%; height: 100%; }
.avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: var(--text-light); border: 2rpx dashed var(--border); border-radius: 50%; }
.avatar-tip { font-size: 24rpx; color: var(--text-grey); }
</style>
