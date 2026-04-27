import type {
  CheckInForm,
  ConditionStatus,
  CsvPreviewRow,
  FocusStatus,
  Member,
  MoodStatus,
  ProgressStatus,
} from "../types";

export function getLocalDateString(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function createPreviewId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeText(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  return (
    candidates
      .map((candidate) => headers.indexOf(candidate))
      .find((index) => index >= 0) ?? -1
  );
}

function getCell(cells: string[], index: number) {
  if (index < 0) return "";
  return normalizeText(cells[index] ?? "");
}

function toCondition(value: string): ConditionStatus | null {
  const normalized = normalizeText(value);

  if (["良い", "よい", "good", "Good"].includes(normalized)) return "good";
  if (["普通", "ふつう", "normal", "Normal"].includes(normalized)) {
    return "normal";
  }
  if (["悪い", "わるい", "bad", "Bad"].includes(normalized)) return "bad";

  return null;
}

function toMood(value: string): MoodStatus | null {
  const normalized = normalizeText(value);

  if (["安定", "stable", "Stable"].includes(normalized)) return "stable";
  if (["不安", "anxious", "Anxious"].includes(normalized)) return "anxious";
  if (
    ["イライラ", "いらいら", "irritated", "Irritated"].includes(normalized)
  ) {
    return "irritated";
  }
  if (["落ち込み", "落込み", "down", "Down"].includes(normalized)) {
    return "down";
  }

  return null;
}

function toFocus(value: string): FocusStatus | null {
  const normalized = normalizeText(value);

  if (["高い", "high", "High"].includes(normalized)) return "high";
  if (["普通", "normal", "Normal"].includes(normalized)) return "normal";
  if (["低い", "low", "Low"].includes(normalized)) return "low";

  return null;
}

function toProgress(value: string): ProgressStatus | null {
  const normalized = normalizeText(value);

  if (["順調", "onTrack", "OnTrack", "on_track"].includes(normalized)) {
    return "onTrack";
  }

  if (
    [
      "やや遅れ",
      "やや遅延",
      "slightDelay",
      "SlightDelay",
      "slight_delay",
    ].includes(normalized)
  ) {
    return "slightDelay";
  }

  if (["遅れ", "遅延", "delay", "Delay"].includes(normalized)) {
    return "delay";
  }

  return null;
}

function findMemberByName(members: Member[], name: string) {
  const normalizedName = normalizeText(name).replace(/\s/g, "");

  return members.find(
    (member) => member.name.replace(/\s/g, "") === normalizedName
  );
}

export function parseCheckInCsv(
  text: string,
  members: Member[],
  fallbackDate: string
): {
  rows: CsvPreviewRow[];
  errors: string[];
} {
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const errors: string[] = [];
  const rows: CsvPreviewRow[] = [];

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [
        "CSVにデータ行がありません。ヘッダー行と1行以上のデータが必要です。",
      ],
    };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeText);

  const dateIndex = findHeaderIndex(headers, ["日付", "date"]);
  const nameIndex = findHeaderIndex(headers, ["氏名", "名前", "name"]);
  const conditionIndex = findHeaderIndex(headers, ["体調", "condition"]);
  const moodIndex = findHeaderIndex(headers, ["気分", "mood"]);
  const focusIndex = findHeaderIndex(headers, ["集中度", "focus"]);
  const progressIndex = findHeaderIndex(headers, [
    "進捗",
    "作業進捗",
    "progress",
  ]);
  const taskIndex = findHeaderIndex(headers, [
    "今日の作業",
    "作業内容",
    "todayTask",
  ]);
  const concernIndex = findHeaderIndex(headers, ["困りごと", "concern"]);
  const requestIndex = findHeaderIndex(headers, [
    "支援依頼",
    "支援してほしいこと",
    "request",
  ]);

  const requiredHeaders = [
    { label: "氏名", index: nameIndex },
    { label: "体調", index: conditionIndex },
    { label: "気分", index: moodIndex },
    { label: "集中度", index: focusIndex },
    { label: "進捗", index: progressIndex },
  ];

  const missingHeaders = requiredHeaders
    .filter((item) => item.index < 0)
    .map((item) => item.label);

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        `必須ヘッダーが不足しています：${missingHeaders.join("、")}`,
        "必要なヘッダー例：日付,氏名,体調,気分,集中度,進捗,今日の作業,困りごと,支援依頼",
      ],
    };
  }

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = parseCsvLine(line);

    const dateValue = getCell(cells, dateIndex) || fallbackDate;
    const memberName = getCell(cells, nameIndex);
    const condition = toCondition(getCell(cells, conditionIndex));
    const mood = toMood(getCell(cells, moodIndex));
    const focus = toFocus(getCell(cells, focusIndex));
    const progress = toProgress(getCell(cells, progressIndex));

    const member = findMemberByName(members, memberName);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      errors.push(
        `${rowNumber}行目：日付は YYYY-MM-DD 形式で入力してください。`
      );
      return;
    }

    if (!member) {
      errors.push(
        `${rowNumber}行目：「${memberName}」は登録済みメンバーに存在しません。`
      );
      return;
    }

    if (!condition) {
      errors.push(
        `${rowNumber}行目：体調は「良い / 普通 / 悪い」のいずれかで入力してください。`
      );
      return;
    }

    if (!mood) {
      errors.push(
        `${rowNumber}行目：気分は「安定 / 不安 / イライラ / 落ち込み」のいずれかで入力してください。`
      );
      return;
    }

    if (!focus) {
      errors.push(
        `${rowNumber}行目：集中度は「高い / 普通 / 低い」のいずれかで入力してください。`
      );
      return;
    }

    if (!progress) {
      errors.push(
        `${rowNumber}行目：進捗は「順調 / やや遅れ / 遅れ」のいずれかで入力してください。`
      );
      return;
    }

    const checkIn: CheckInForm = {
      memberId: member.id,
      date: dateValue,
      condition,
      mood,
      focus,
      progress,
      todayTask: getCell(cells, taskIndex),
      concern: getCell(cells, concernIndex),
      request: getCell(cells, requestIndex),
    };

    rows.push({
      previewId: createPreviewId(),
      rowNumber,
      memberName: member.name,
      checkIn,
    });
  });

  return { rows, errors };
}

export function buildCsvContent(rows: string[][]) {
  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");
}

export function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}