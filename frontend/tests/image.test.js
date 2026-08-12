import { describe, it, expect } from 'vitest'
import { makeImagePaths } from '../src/utils/image'

describe('makeImagePaths', () => {
  it('生成原图与缩略图路径且同前缀', () => {
    const { imagePath, thumbPath } = makeImagePaths('evt-1', 'jpg')
    expect(imagePath).toMatch(/^_doc\/images\/evt-1_\d+\.jpg$/)
    expect(thumbPath).toBe(imagePath.replace('.jpg', '_thumb.jpg'))
  })
  it('不同调用生成不同时间戳', () => {
    const a = makeImagePaths('evt-1', 'jpg').imagePath
    const b = makeImagePaths('evt-1', 'jpg').imagePath
    expect(a).not.toBe(b)
  })
})
