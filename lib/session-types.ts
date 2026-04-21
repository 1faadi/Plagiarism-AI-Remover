export type StoredDocument = {
  id: string;
  filename: string;
  mime: string;
  storagePath: string;
};

export type SessionRecord = {
  id: string;
  createdAt: string;
  documents: StoredDocument[];
};
