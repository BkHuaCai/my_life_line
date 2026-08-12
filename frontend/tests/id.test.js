import { describe, it, expect } from 'vitest'
import { uuid } from '../src/utils/id'

describe('uuid', () => {
  it('生成符合 UUID v4 格式的字符串', () => {
    const id = uuid()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('连续生成不重复', () => {
    expect(uuid()).not.toBe(uuid())
  })
})
