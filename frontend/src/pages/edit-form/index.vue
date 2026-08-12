<template>
  <view class="page">
    <!-- 人物表单 -->
    <template v-if="entityType === 'person'">
      <view class="field">
        <text class="label">姓名 *</text>
        <input class="input" v-model="form.name" placeholder="如：小明" />
      </view>
      <view class="field">
        <text class="label">出生日期</text>
        <picker mode="date" :value="form.birth_date" @change="(e) => (form.birth_date = e.detail.value)">
          <view class="picker">{{ form.birth_date || '选择日期' }}</view>
        </picker>
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
import { chooseAndStoreImages } from '../../utils/image'

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
        note: '',
        // timeline
        category: '',
        // event
        title: '',
        description: '',
        date_type: 'point',
        date_point: '',
        date_start: '',
        date_end: '',
        images: []
      }
    }
  },
  async onLoad(options) {
    this.entityType = options.entityType || 'person'
    this.id = options.id || ''
    this.personId = options.personId || ''
    this.timelineId = options.timelineId || ''
    const titles = { person: '编辑人物', timeline: '编辑时间线', event: '编辑事件' }
    uni.setNavigationBarTitle({ title: this.id ? titles[this.entityType] : `新建${this.entityType === 'person' ? '人物' : this.entityType === 'timeline' ? '时间线' : '事件'}` })
    if (this.id) await this.loadForm()
  },
  methods: {
    async loadForm() {
      if (this.entityType === 'person') {
        const p = await db.getPerson(this.id)
        this.form = { name: p.name, birth_date: p.birth_date || '', note: p.note || '' }
      } else if (this.entityType === 'timeline') {
        const tl = await db.getTimeline(this.id)
        this.form = { name: tl.name, category: tl.category || '' }
      } else {
        const ev = await db.getEvent(this.id)
        this.form = {
          title: ev.title,
          description: ev.description || '',
          date_type: ev.date_type,
          date_point: ev.date_point || '',
          date_start: ev.date_start || '',
          date_end: ev.date_end || '',
          images: (await db.getImagesByEvent(ev.id)).map((im) => ({ preview: im.thumb_path || im.image_path, _path: im }))
        }
      }
    },
    addImages() {
      chooseAndStoreImages(this.id || 'new').then((stored) => {
        for (const s of stored) this.form.images.push({ preview: s.thumb_path || s.image_path, _path: s })
      }).catch(() => uni.showToast({ title: '选择图片失败', icon: 'none' }))
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
        if (!form.name) return uni.showToast({ title: '请填写姓名', icon: 'none' })
        await db.savePerson({ id: this.id || undefined, name: form.name, birth_date: form.birth_date || null, note: form.note || null })
      } else if (entityType === 'timeline') {
        if (!form.name) return uni.showToast({ title: '请填写名称', icon: 'none' })
        await db.saveTimeline({ id: this.id || undefined, person_id: this.personId, name: form.name, category: form.category || null, is_private: 1 })
      } else {
        if (!form.title) return uni.showToast({ title: '请填写标题', icon: 'none' })
        const row = {
          id: this.id || undefined,
          timeline_id: this.timelineId,
          title: form.title,
          description: form.description || null,
          date_type: form.date_type,
          date_point: form.date_type === 'point' ? form.date_point || null : null,
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
.label { font-size: 26rpx; color: #888; display: block; margin-bottom: 12rpx; }
.input { background: #fff; border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; height: 84rpx; min-height: 84rpx; }
.textarea { min-height: 160rpx; }
.picker { background: #fff; border-radius: 12rpx; padding: 20rpx; font-size: 30rpx; color: #333; }
.seg { display: flex; gap: 16rpx; }
.seg-item { flex: 1; text-align: center; padding: 18rpx; border-radius: 12rpx; background: #fff; color: #666; }
.seg-item.active { background: #ffb400; color: #fff; }
.img-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.img-wrap { position: relative; width: 180rpx; height: 180rpx; }
.img { width: 180rpx; height: 180rpx; border-radius: 12rpx; }
.img-del { position: absolute; top: -12rpx; right: -12rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.img-add { width: 180rpx; height: 180rpx; border: 2rpx dashed #ccc; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 48rpx; }
.save-btn { margin-top: 40rpx; background: #ffb400; color: #fff; font-size: 32rpx; border-radius: 48rpx; }
</style>
