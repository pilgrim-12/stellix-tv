/**
 * Script to delete the old `channels` collection from Firebase
 *
 * WARNING: This is destructive! Make sure you have migrated all channels
 * to curated_channels before running this.
 *
 * Run with: npx ts-node scripts/deleteOldChannelsCollection.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore'

// Firebase config - copy from your .env.local or firebase.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

async function deleteCollection(collectionName: string, batchSize: number = 100) {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const colRef = collection(db, collectionName)
  const snapshot = await getDocs(colRef)

  if (snapshot.empty) {
    console.log(`Collection "${collectionName}" is already empty or doesn't exist.`)
    return
  }

  console.log(`Found ${snapshot.size} documents in "${collectionName}"`)
  console.log('Starting deletion...')

  let deleted = 0
  let batch = writeBatch(db)
  let batchCount = 0

  for (const docSnap of snapshot.docs) {
    batch.delete(doc(db, collectionName, docSnap.id))
    batchCount++
    deleted++

    if (batchCount >= batchSize) {
      await batch.commit()
      console.log(`Deleted ${deleted} documents...`)
      batch = writeBatch(db)
      batchCount = 0
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit()
  }

  console.log(`✅ Deleted ${deleted} documents from "${collectionName}"`)
}

async function main() {
  console.log('===========================================')
  console.log('  DELETE OLD CHANNELS COLLECTION')
  console.log('===========================================')
  console.log('')
  console.log('⚠️  WARNING: This will permanently delete all documents')
  console.log('    in the "channels" collection!')
  console.log('')
  console.log('Make sure you have already:')
  console.log('  1. Migrated all channels to curated_channels')
  console.log('  2. Verified the migration was successful')
  console.log('')

  // Ask for confirmation
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "DELETE" to confirm: ', resolve)
  })
  rl.close()

  if (answer !== 'DELETE') {
    console.log('Aborted.')
    process.exit(0)
  }

  try {
    await deleteCollection('channels')
    console.log('')
    console.log('🎉 Old channels collection has been deleted!')
    console.log('   Firebase quota should now be much lower.')
  } catch (error) {
    console.error('Error deleting collection:', error)
    process.exit(1)
  }
}

main()
