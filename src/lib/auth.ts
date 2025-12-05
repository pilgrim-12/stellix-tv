import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()

// Register with email and password
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)

  // Update profile with display name
  await updateProfile(user, { displayName })

  // Create user document in Firestore
  await createUserDocument(user)

  return user
}

// Sign in with email and password
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

// Sign in with Google
export async function signInWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, googleProvider)

  // Create user document if it doesn't exist
  const userDoc = await getDoc(doc(db, 'users', user.uid))
  if (!userDoc.exists()) {
    await createUserDocument(user)
  }

  return user
}

// Sign out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

// Send password reset email
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

// Create user document in Firestore
async function createUserDocument(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid)

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isPremium: false,
    createdAt: serverTimestamp(),
    preferences: {
      theme: 'dark',
      autoplay: true,
      defaultQuality: 'auto',
      defaultVolume: 0.8,
      lastWatchedChannelId: null,
    },
  })
}

// Get user data from Firestore
export async function getUserData(uid: string) {
  const userDoc = await getDoc(doc(db, 'users', uid))
  return userDoc.exists() ? userDoc.data() : null
}
