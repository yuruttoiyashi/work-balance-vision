export type Page =
  | "dashboard"
  | "input"
  | "import"
  | "members"
  | "alerts"
  | "history";

export type ConditionStatus = "good" | "normal" | "bad";
export type MoodStatus = "stable" | "anxious" | "irritated" | "down";
export type FocusStatus = "high" | "normal" | "low";
export type ProgressStatus = "onTrack" | "slightDelay" | "delay";
export type AlertSeverity = "high" | "middle" | "low";

export type CheckInSource = "manual" | "csv" | "employee";

export type Member = {
  id: string;
  name: string;
  role: string;
  department: string;
  employmentType: string;
  considerations: string;
};

export type CheckIn = {
  id: string;
  memberId: string;
  date: string;
  condition: ConditionStatus;
  mood: MoodStatus;
  focus: FocusStatus;
  progress: ProgressStatus;
  todayTask: string;
  concern: string;
  request: string;
  source: CheckInSource;
  createdAt: string;
  updatedAt: string;
};

export type CheckInForm = {
  memberId: string;
  date: string;
  condition: ConditionStatus;
  mood: MoodStatus;
  focus: FocusStatus;
  progress: ProgressStatus;
  todayTask: string;
  concern: string;
  request: string;
};

export type GeneratedAlert = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  date: string;
};

export type CsvPreviewRow = {
  previewId: string;
  rowNumber: number;
  memberName: string;
  checkIn: CheckInForm;
};