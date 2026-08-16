// 所有实体使用 UUID 字符串主键（为将来对外分享铺路）。
export const TABLES = {
  person: {
    name: 'person',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      avatar_path: 'TEXT',
      birth_date: 'TEXT',
      note: 'TEXT',
      is_default: 'INTEGER DEFAULT 0',
      created_at: 'TEXT'
    }
  },
  timeline: {
    name: 'timeline',
    columns: {
      id: 'TEXT PRIMARY KEY',
      person_id: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      category: 'TEXT',
      is_private: 'INTEGER DEFAULT 1',
      is_main: 'INTEGER DEFAULT 0',
      created_at: 'TEXT',
      deleted_at: 'TEXT'
    }
  },
  event: {
    name: 'event',
    columns: {
      id: 'TEXT PRIMARY KEY',
      timeline_id: 'TEXT NOT NULL',
      title: 'TEXT NOT NULL',
      description: 'TEXT',
      date_type: 'TEXT NOT NULL',
      date_point: 'TEXT',
      date_start: 'TEXT',
      date_end: 'TEXT',
      cover_image_path: 'TEXT',
      created_at: 'TEXT',
      deleted_at: 'TEXT',
      trash_tl_name: 'TEXT'
    }
  },
  event_image: {
    name: 'event_image',
    columns: {
      id: 'TEXT PRIMARY KEY',
      event_id: 'TEXT NOT NULL',
      thumb_path: 'TEXT',
      image_path: 'TEXT',
      sort_order: 'INTEGER DEFAULT 0'
    }
  }
}

export function createTableSql(table) {
  const defs = Object.entries(table.columns)
    .map(([c, t]) => `"${c}" ${t}`)
    .join(', ')
  return `CREATE TABLE IF NOT EXISTS "${table.name}" (${defs})`
}

export function createAllTablesSql() {
  return Object.values(TABLES).map(createTableSql)
}
