import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore'
import offlineQueue from './offlineQueue'

let app = null
let auth = null

export async function initFirebase() {
  if (app && auth) return { app, auth }
  try {
    const mod = await import('./firebaseConfig.js')
    const firebaseConfig = mod.default || mod.firebaseConfig || mod
    if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('<')) {
      console.warn('Firebase: `src/firebaseConfig.js` contiene valores de ejemplo o está incompleto.')
      return { app: null, auth: null }
    }
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    // when firebase is ready, try to flush any queued offline items
    try {
      // processQueue will use remote handlers provided below
      offlineQueue.processQueue({ remoteSaveUserProfile, remoteSaveRecord, remoteUpdateRecord, remoteDeleteRecord })
    } catch (e) {
      // ignore
    }
    // also flush when the browser goes back online
    window.addEventListener('online', () => {
      offlineQueue.processQueue({ remoteSaveUserProfile, remoteSaveRecord, remoteUpdateRecord, remoteDeleteRecord })
    })
    return { app, auth }
  } catch (err) {
    console.warn('Firebase config not found (src/firebaseConfig.js). Skipping Firebase init.')
    return { app: null, auth: null }
  }
}

export async function signInWithGoogle() {
  const { auth } = await initFirebase()
  if (!auth) throw new Error('Firebase no inicializado')
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export async function signInWithEmail(email, password) {
  const { auth } = await initFirebase()
  if (!auth) throw new Error('Firebase no inicializado')
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  const { auth } = await initFirebase()
  if (!auth) return
  return fbSignOut(auth)
}

export async function onAuthChanged(callback) {
  const { auth } = await initFirebase()
  if (!auth) {
    // call with null to indicate no auth available
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

function emailToId(email) {
  return email
}

export async function getUserProfile(email) {
  const { app } = await initFirebase()
  if (!app) return null
  const db = getFirestore(app)
  const id = emailToId(email)
  const ref = doc(db, 'usuarios', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const remote = snap.data() || {}
  // merge with any pending local saves
  try {
    const pending = offlineQueue.getPendingForEmail(email)
    if (pending) return { ...remote, ...pending }
  } catch (e) {
    console.warn('Error merging pending profile', e)
  }
  return remote
}

export async function getUserRecords(email, fromDate, toDate) {
  const { app } = await initFirebase()
  if (!app) return []
  const db = getFirestore(app)
  const id = emailToId(email)
  const col = collection(db, 'usuarios', id, 'registros')
  const constraints = []
  if (fromDate && fromDate instanceof Date) constraints.push(where('ts', '>=', Timestamp.fromDate(fromDate)))
  if (toDate && toDate instanceof Date) constraints.push(where('ts', '<=', Timestamp.fromDate(toDate)))
  let q = col
  if (constraints.length) q = query(col, ...constraints, orderBy('ts', 'desc'))
  else q = query(col, orderBy('ts', 'desc'))
  const snaps = await getDocs(q)
  const items = []
  snaps.forEach(s => items.push({ id: s.id, ...(s.data() || {}) }))
  return items
}

// Return a single user record ordered by timestamp. Use order = 'asc' to get oldest, 'desc' for newest.
export async function getUserRecordExtreme(email, order = 'asc') {
  const { app } = await initFirebase()
  if (!app) return null
  const db = getFirestore(app)
  const id = emailToId(email)
  const col = collection(db, 'usuarios', id, 'registros')
  const q = query(col, orderBy('ts', order), limit(1))
  const snaps = await getDocs(q)
  let item = null
  snaps.forEach(s => { item = { id: s.id, ...(s.data() || {}) } })
  return item
}

export async function saveUserProfile(email, profile) {
  const { app } = await initFirebase()
  const id = emailToId(email)
  // If Firebase not initialized or offline, enqueue the change
  if (!app || !navigator.onLine) {
    offlineQueue.enqueue({ action: 'saveProfile', email, profile })
    return { offline: true }
  }
  try {
    const db = getFirestore(app)
    const ref = doc(db, 'usuarios', id)
    await setDoc(ref, profile, { merge: true })
    // try to flush any queued items (provide remote handler)
    offlineQueue.processQueue({ remoteSaveUserProfile })
    return { offline: false }
  } catch (e) {
    // on error, enqueue for retry
    offlineQueue.enqueue({ action: 'saveProfile', email, profile })
    throw e
  }
}

export async function saveUserRecord(email, record) {
  const { app } = await initFirebase()
  // If Firebase not initialized or offline, enqueue the change
  if (!app || !navigator.onLine) {
    offlineQueue.enqueue({ action: 'saveRecord', email, record })
    return { offline: true }
  }
  try {
    const db = getFirestore(app)
    const id = emailToId(email)
    const col = collection(db, 'usuarios', id, 'registros')
    // ensure timestamp field is a Firestore Timestamp
    const rec = { ...record }
      // normalize ts: accept Date, ISO string, or number
      if (rec.ts) {
        let d = null
        if (rec.ts instanceof Date) d = rec.ts
        else if (typeof rec.ts === 'number') d = new Date(rec.ts)
        else d = new Date(rec.ts)
        rec.ts = Timestamp.fromDate(d)
      } else {
        rec.ts = Timestamp.fromDate(new Date())
      }
    const docRef = await addDoc(col, rec)
    offlineQueue.processQueue({ remoteSaveUserProfile, remoteSaveRecord, remoteUpdateRecord, remoteDeleteRecord })
    return { offline: false, id: docRef.id }
    return { offline: false }
  } catch (e) {
    offlineQueue.enqueue({ action: 'saveRecord', email, record })
    throw e
  }
}

export async function updateUserRecord(email, idRecord, record) {
  const { app } = await initFirebase()
  if (!app || !navigator.onLine) {
    offlineQueue.enqueue({ action: 'updateRecord', email, idRecord, record })
    return { offline: true }
  }
  try {
    const db = getFirestore(app)
    const ref = doc(db, 'usuarios', emailToId(email), 'registros', idRecord)
    const rec = { ...record }
    if (rec.ts && !(rec.ts instanceof Timestamp)) {
      let d = rec.ts instanceof Date ? rec.ts : new Date(rec.ts)
      rec.ts = Timestamp.fromDate(d)
    }
    await setDoc(ref, rec, { merge: true })
    offlineQueue.processQueue({ remoteSaveUserProfile, remoteSaveRecord, remoteUpdateRecord, remoteDeleteRecord })
    return { offline: false }
  } catch (e) {
    offlineQueue.enqueue({ action: 'updateRecord', email, idRecord, record })
    throw e
  }
}

export async function deleteUserRecord(email, idRecord) {
  const { app } = await initFirebase()
  if (!app || !navigator.onLine) {
    offlineQueue.enqueue({ action: 'deleteRecord', email, idRecord })
    return { offline: true }
  }
  try {
    const db = getFirestore(app)
    const ref = doc(db, 'usuarios', emailToId(email), 'registros', idRecord)
    // Use setDoc with { deleted: true } or actually delete - Firestore delete is from 'deleteDoc'
    // We'll use deleteDoc
    const { deleteDoc } = await import('firebase/firestore')
    await deleteDoc(ref)
    offlineQueue.processQueue({ remoteSaveUserProfile, remoteSaveRecord, remoteUpdateRecord, remoteDeleteRecord })
    return { offline: false }
  } catch (e) {
    offlineQueue.enqueue({ action: 'deleteRecord', email, idRecord })
    throw e
  }
}

export async function remoteSaveUserProfile(email, profile) {
  const { app } = await initFirebase()
  if (!app) throw new Error('Firebase no inicializado')
  const db = getFirestore(app)
  const id = emailToId(email)
  const ref = doc(db, 'usuarios', id)
  await setDoc(ref, profile, { merge: true })
  return true
}

export async function remoteSaveRecord(email, record) {
  const { app } = await initFirebase()
  if (!app) throw new Error('Firebase no inicializado')
  const db = getFirestore(app)
  const id = emailToId(email)
  const col = collection(db, 'usuarios', id, 'registros')
  const rec = { ...record }
  // rec.ts may be ISO string when loaded from queue; normalize to Date then to Timestamp
  if (rec.ts) {
    let d = null
    if (rec.ts instanceof Date) d = rec.ts
    else if (typeof rec.ts === 'number') d = new Date(rec.ts)
    else d = new Date(rec.ts)
    rec.ts = Timestamp.fromDate(d)
  } else {
    rec.ts = Timestamp.fromDate(new Date())
  }
  await addDoc(col, rec)
  return true
}

export async function remoteUpdateRecord(email, idRecord, record) {
  const { app } = await initFirebase()
  if (!app) throw new Error('Firebase no inicializado')
  const db = getFirestore(app)
  const ref = doc(db, 'usuarios', emailToId(email), 'registros', idRecord)
  const rec = { ...record }
  if (rec.ts && !(rec.ts instanceof Timestamp)) {
    let d = rec.ts instanceof Date ? rec.ts : new Date(rec.ts)
    rec.ts = Timestamp.fromDate(d)
  }
  await setDoc(ref, rec, { merge: true })
  return true
}

export async function remoteDeleteRecord(email, idRecord) {
  const { app } = await initFirebase()
  if (!app) throw new Error('Firebase no inicializado')
  const db = getFirestore(app)
  const ref = doc(db, 'usuarios', emailToId(email), 'registros', idRecord)
  const { deleteDoc } = await import('firebase/firestore')
  await deleteDoc(ref)
  return true
}
