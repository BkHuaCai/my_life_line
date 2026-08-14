import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// vitest 以 frontend/ 为 cwd 运行，直接读 src/pages.json
// 文件末尾的 HBuilderX condition 块含 // 注释（非标准 JSON），先按行剔除行注释再解析
const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/pages.json'), 'utf8')
const pagesJson = JSON.parse(raw.replace(/\/\/.*$/gm, ''))
const customNavPages = pagesJson.pages.filter((p) => p.style && p.style.navigationStyle === 'custom').map((p) => p.path)

describe('pages.json 顶部区域配置', () => {
  it('主页与我的页启用自定义导航（移除原生导航栏）', () => {
    expect(customNavPages).toEqual(expect.arrayContaining(['pages/index/index', 'pages/person-list/index']))
  })
  it('tabBar 全部页面都启用了自定义导航', () => {
    const tabPaths = pagesJson.tabBar.list.map((t) => t.pagePath)
    for (const t of tabPaths) expect(customNavPages).toContain(t)
  })
})
