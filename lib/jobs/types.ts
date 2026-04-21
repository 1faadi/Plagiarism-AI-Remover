export type JobStatus = "queued" | "running" | "completed" | "failed";

export type HumanizeJobRecord = {
  id: string;
  status: JobStatus;
  progress: { current: number; total: number };
  sessionId: string;
  documentId: string;
  filename: string;
  error?: string;
  humanizedText?: string;
  createdAt: string;
  updatedAt: string;
};
