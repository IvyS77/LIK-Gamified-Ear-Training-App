import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB1jOfSnwiSLdQLcs63vFzt7NJi58i0p3Q",
  authDomain: "ear-training-8f082.firebaseapp.com",
  projectId: "ear-training-8f082",
  storageBucket: "ear-training-8f082.firebasestorage.app",
  messagingSenderId: "669866371235",
  appId: "1:669866371235:web:2cf1681d853fef43327716",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const backend = "https://lik-gamified-ear-training-app.onrender.com";

/**
 * Uploads an image to Firebase Storage using XMLHttpRequest for React Native compatibility.
 * @param uri The local URI of the image from ImagePicker
 */
export async function uploadImage(uri: string): Promise<string> {
  // 1. Convert URI to Blob using XMLHttpRequest (Required for React Native)
  const blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.error("Blob conversion failed:", e);
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });

  try {
    const storage = getStorage();
    // 2. Generate a unique filename (Fix for missing 'crypto' in RN)
    const uniqueFileName = Math.random().toString(36).substring(7) + Date.now().toString();
    const storageRef = ref(storage, `avatars/${uniqueFileName}`);

    // 3. Upload the Blob
    const snapshot = await uploadBytes(storageRef, blob);
    
    // 4. Release the blob from memory
    // @ts-ignore
    if (typeof blob.close === 'function') {
      // @ts-ignore
      blob.close();
    }

    // 5. Get and return the public Download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Upload successful! URL:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Firebase Upload Error:", error);
    throw error;
  }
}