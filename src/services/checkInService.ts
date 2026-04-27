import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  addDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../firebase";
import type {
  CheckIn,
  CheckInForm,
  CheckInSource,
  ConditionStatus,
  FocusStatus,
  MoodStatus,
  ProgressStatus,
} from "../types";

const COLLECTION_NAME = "checkIns";

const checkInsCollection = collection(db, COLLECTION_NAME);

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return new Date().toISOString();
}

function toCheckIn(snapshot: QueryDocumentSnapshot<DocumentData>): CheckIn {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    memberId: String(data.memberId ?? ""),
    date: String(data.date ?? ""),
    condition: (data.condition ?? "normal") as ConditionStatus,
    mood: (data.mood ?? "stable") as MoodStatus,
    focus: (data.focus ?? "normal") as FocusStatus,
    progress: (data.progress ?? "onTrack") as ProgressStatus,
    todayTask: String(data.todayTask ?? ""),
    concern: String(data.concern ?? ""),
    request: String(data.request ?? ""),
    source: (data.source ?? "manual") as CheckInSource,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export function subscribeToCheckIns(
  onData: (items: CheckIn[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const checkInsQuery = query(checkInsCollection, orderBy("createdAt", "desc"));

  return onSnapshot(
    checkInsQuery,
    (snapshot) => {
      const items = snapshot.docs.map(toCheckIn);
      onData(items);
    },
    (error) => {
      onError(error);
    }
  );
}

export async function createCheckIn(
  input: CheckInForm,
  source: CheckInSource = "manual"
): Promise<void> {
  await addDoc(checkInsCollection, {
    ...input,
    source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function bulkCreateCheckIns(
  items: CheckInForm[],
  source: CheckInSource = "csv"
): Promise<void> {
  if (items.length === 0) return;

  const batch = writeBatch(db);

  items.forEach((item) => {
    const ref = doc(checkInsCollection);

    batch.set(ref, {
      ...item,
      source,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function updateCheckInById(
  id: string,
  input: CheckInForm
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, id);

  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCheckInById(id: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, id);
  await deleteDoc(ref);
}

export async function replaceAllCheckIns(
  items: CheckInForm[],
  source: CheckInSource = "manual"
): Promise<void> {
  const snapshot = await getDocs(checkInsCollection);
  const batch = writeBatch(db);

  snapshot.docs.forEach((document) => {
    batch.delete(document.ref);
  });

  items.forEach((item) => {
    const ref = doc(checkInsCollection);

    batch.set(ref, {
      ...item,
      source,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}