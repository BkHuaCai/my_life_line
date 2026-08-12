import { uuid } from './id'
import { createAllTablesSql } from './schema'
import { effectiveDate } from './date'

export function createDb(adapter) {
  const now = () => new Date().toISOString()

  const upsert = async (table, id, row, getter) => {
    if (id) {
      const existing = await getter(id)
      if (existing) {
        await adapter.update(table, id, row)
        return id
      }
      await adapter.insert(table, { ...row, id, created_at: row.created_at || now() })
      return id
    }
    const newId = uuid()
    await adapter.insert(table, { ...row, id: newId, created_at: now() })
    return newId
  }

  return {
    async init() {
      await adapter.init(createAllTablesSql())
    },

    // ---------- person ----------
    async getPersons() {
      const rows = await adapter.all('person')
      return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },
    async getPerson(id) {
      const rows = await adapter.all('person')
      return rows.find((r) => r.id === id) || null
    },
    async savePerson(p) {
      return upsert('person', p.id, p, (id) => this.getPerson(id))
    },
    async deletePerson(id) {
      const timelines = await this.getTimelinesByPerson(id)
      for (const tl of timelines) await this.deleteTimeline(tl.id)
      await adapter.delete('person', id)
    },

    // ---------- timeline ----------
    async getTimelinesByPerson(personId) {
      const rows = await adapter.all('timeline')
      return rows.filter((r) => r.person_id === personId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    },
    async getTimeline(id) {
      const rows = await adapter.all('timeline')
      return rows.find((r) => r.id === id) || null
    },
    async saveTimeline(t) {
      return upsert('timeline', t.id, t, (id) => this.getTimeline(id))
    },
    async deleteTimeline(id) {
      const events = await this.getEventsByTimeline(id)
      for (const ev of events) await this.deleteEvent(ev.id)
      await adapter.delete('timeline', id)
    },

    // ---------- event ----------
    async getEventsByTimeline(timelineId) {
      const rows = await adapter.all('event')
      return rows
        .filter((r) => r.timeline_id === timelineId)
        .sort((a, b) => (effectiveDate(a) < effectiveDate(b) ? -1 : effectiveDate(a) > effectiveDate(b) ? 1 : 0))
    },
    async getEvent(id) {
      const rows = await adapter.all('event')
      return rows.find((r) => r.id === id) || null
    },
    async saveEvent(e) {
      const { images = [], ...row } = e
      const id = await upsert('event', e.id, row, (i) => this.getEvent(i))
      await adapter.deleteWhere('event_image', 'event_id', id)
      for (let i = 0; i < images.length; i++) {
        await adapter.insert('event_image', { id: uuid(), event_id: id, ...images[i], sort_order: i })
      }
      return id
    },
    async deleteEvent(id) {
      await adapter.deleteWhere('event_image', 'event_id', id)
      await adapter.delete('event', id)
    },
    async getImagesByEvent(eventId) {
      const rows = await adapter.all('event_image')
      return rows.filter((r) => r.event_id === eventId).sort((a, b) => a.sort_order - b.sort_order)
    },

    // ---------- search ----------
    async searchEvents(keyword) {
      const k = (keyword || '').trim().toLowerCase()
      if (!k) return []
      const rows = await adapter.all('event')
      return rows.filter((r) => ((r.title || '') + ' ' + (r.description || '')).toLowerCase().includes(k))
    }
  }
}
