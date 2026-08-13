import { describe, it, expect } from 'vitest'
import { makeImagePaths } from '../src/utils/image'
import { createDb } from '../src/utils/db'
import { createMemoryAdapter } from '../src/utils/storage'

describe('makeImagePaths', () => {
  it('生成原图与缩略图路径且同前缀（下划线字段，与 event_image 表/展示代码一致）', () => {
    const { image_path, thumb_path } = makeImagePaths('evt-1', 'jpg')
    expect(image_path).toMatch(/^_doc\/images\/evt-1_\d+\.jpg$/)
    expect(thumb_path).toBe(image_path.replace('.jpg', '_thumb.jpg'))
  })
  it('不同调用生成不同时间戳', () => {
    const a = makeImagePaths('evt-1', 'jpg').image_path
    const b = makeImagePaths('evt-1', 'jpg').image_path
    expect(a).not.toBe(b)
  })
})

describe('事件图片存取契约（回归）', () => {
  it('image.js 产出字段经 db 保存后仍可被展示代码读取', async () => {
    const db = createDb(createMemoryAdapter())
    await db.init()
    const stored = [makeImagePaths('evt-1')]
    const id = await db.saveEvent({ timeline_id: 't1', title: 'x', date_type: 'point', date_point: '2020-01-01', images: stored })
    const rows = await db.getImagesByEvent(id)
    // 表单预览/事件详情/时间轴视图均读取 image_path 或 thumb_path
    expect(rows[0].image_path || rows[0].thumb_path).toBeTruthy()
  })
})
