import { Timestamp } from 'firebase/firestore';

export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  pinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NoteInput {
  title: string;
  content: string;
  userId: string;
  pinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
