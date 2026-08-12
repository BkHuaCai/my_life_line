export const EXPORT_VERSION = 1

export async function serialize(db) {
  const persons = await db.getPersons()
  const personsOut = []
  for (const p of persons) {
    const timelines = await db.getTimelinesByPerson(p.id)
    const timelinesOut = []
    for (const tl of timelines) {
      const events = await db.getEventsByTimeline(tl.id)
      const eventsOut = []
      for (const ev of events) {
        eventsOut.push({ ...ev, images: await db.getImagesByEvent(ev.id) })
      }
      timelinesOut.push({ ...tl, events: eventsOut })
    }
    personsOut.push({ ...p, timelines: timelinesOut })
  }
  return { version: EXPORT_VERSION, exported_at: new Date().toISOString(), persons: personsOut }
}

export async function importData(db, data) {
  for (const p of data.persons || []) {
    await db.savePerson(p)
    for (const tl of p.timelines || []) {
      await db.saveTimeline(tl)
      for (const ev of tl.events || []) {
        await db.saveEvent(ev)
      }
    }
  }
}
