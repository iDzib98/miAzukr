// Simple offline queue using localStorage
const STORAGE_KEY = 'miAzukr_offline_queue_v1'

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('offlineQueue: read error', e)
    return []
  }
}

function writeQueue(q) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(q)) } catch (e) { console.error('offlineQueue: write error', e) }
}

export function enqueue(item) {
  const q = readQueue()
  item.id = item.id || Date.now() + '-' + Math.random().toString(36).slice(2, 9)
  item.ts = Date.now()
  q.push(item)
  writeQueue(q)
  return item.id
}

export function getAll() { return readQueue() }

export function removeById(id) {
  const q = readQueue().filter(i => i.id !== id)
  writeQueue(q)
}

export function getPendingForEmail(email) {
  const q = readQueue()
  // return merged profile changes for this email (last-wins)
  const saves = q.filter(i => (i.action === 'saveProfile' || i.action === 'saveRecord') && i.email === email)
  if (!saves.length) return null
  // For profiles merge profile objects; for records just return list (not used here)
  const profileSaves = saves.filter(s => s.action === 'saveProfile')
  if (profileSaves.length) {
    const merged = {}
    for (const s of profileSaves) Object.assign(merged, s.profile || {})
    return merged
  }
  return null
}

let _processing = false

export async function processQueue(remoteHandlers = {}) {
  if (_processing) return
  if (!navigator.onLine) return
  _processing = true
  try {
    const q = readQueue()
    for (const item of q.slice()) {
      try {
        if (item.action === 'saveProfile') {
          if (remoteHandlers.remoteSaveUserProfile) {
            await remoteHandlers.remoteSaveUserProfile(item.email, item.profile)
            removeById(item.id)
          } else {
            console.warn('offlineQueue: no remote handler for saveProfile, skipping', item)
          }
        } else if (item.action === 'saveRecord') {
          if (remoteHandlers.remoteSaveRecord) {
            await remoteHandlers.remoteSaveRecord(item.email, item.record)
            removeById(item.id)
          } else {
            console.warn('offlineQueue: no remote handler for saveRecord, skipping', item)
          }
        } else {
          console.warn('offlineQueue: unknown action', item.action)
          removeById(item.id)
        }
      } catch (e) {
        console.warn('offlineQueue: item failed, keep for retry', item.id, e)
        // stop processing further to avoid repeated failures
        break
      }
    }
  } finally {
    _processing = false
  }
}

// Start auto flush when online
window.addEventListener('online', () => {
  // eslint-disable-next-line no-console
  console.log('offlineQueue: online, will try to flush')
  // processQueue requires remoteHandlers; firebaseClient will call processQueue with handlers on init
})

export default { enqueue, getAll, removeById, getPendingForEmail, processQueue }
