import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import { members } from "./data/members";
import type {
  AlertSeverity,
  CheckIn,
  CheckInForm,
  CheckInSource,
  ConditionStatus,
  CsvPreviewRow,
  FocusStatus,
  GeneratedAlert,
  MoodStatus,
  ProgressStatus,
} from "./types";
import {
  buildCsvContent,
  downloadTextFile,
  getLocalDateString,
  parseCheckInCsv,
} from "./utils/csv";

type AppPage =
  | "dashboard"
  | "employee"
  | "input"
  | "import"
  | "members"
  | "alerts"
  | "history";

const STORAGE_KEY = "work-balance-vision-demo-checkins";
const today = getLocalDateString();

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

function formatDisplayDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString || "日付未選択";
  }

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

const initialCheckInForms: CheckInForm[] = [
  {
    memberId: "m001",
    date: today,
    condition: "normal",
    mood: "stable",
    focus: "high",
    progress: "onTrack",
    todayTask: "CSVデータ整理とダッシュボード確認",
    concern: "",
    request: "午後に仕様確認の時間があると助かります。",
  },
  {
    memberId: "m002",
    date: today,
    condition: "bad",
    mood: "down",
    focus: "low",
    progress: "slightDelay",
    todayTask: "申請書類の入力",
    concern: "朝から体調が重く、集中が続きにくいです。",
    request: "急ぎではない業務を明日に回せると助かります。",
  },
  {
    memberId: "m003",
    date: today,
    condition: "normal",
    mood: "anxious",
    focus: "normal",
    progress: "delay",
    todayTask: "倉庫備品の棚卸し確認",
    concern: "確認項目が多く、どこから進めるか迷っています。",
    request: "優先順位を整理してほしいです。",
  },
  {
    memberId: "m004",
    date: today,
    condition: "bad",
    mood: "irritated",
    focus: "low",
    progress: "delay",
    todayTask: "契約書類の確認",
    concern: "午後になると疲労が強く、確認ミスが不安です。",
    request: "確認作業のダブルチェックをお願いしたいです。",
  },
];

const conditionLabel: Record<ConditionStatus, string> = {
  good: "良い",
  normal: "普通",
  bad: "悪い",
};

const moodLabel: Record<MoodStatus, string> = {
  stable: "安定",
  anxious: "不安",
  irritated: "イライラ",
  down: "落ち込み",
};

const focusLabel: Record<FocusStatus, string> = {
  high: "高い",
  normal: "普通",
  low: "低い",
};

const progressLabel: Record<ProgressStatus, string> = {
  onTrack: "順調",
  slightDelay: "やや遅れ",
  delay: "遅れ",
};

const sourceLabel: Record<CheckInSource, string> = {
  manual: "管理者入力",
  csv: "CSV取込",
  employee: "本人入力",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createCheckInFromForm(
  form: CheckInForm,
  source: CheckInSource
): CheckIn {
  const now = new Date().toISOString();

  return {
    id: createId(),
    ...form,
    source,
    createdAt: now,
    updatedAt: now,
  };
}

function createInitialCheckIns(): CheckIn[] {
  return initialCheckInForms.map((form) => createCheckInFromForm(form, "manual"));
}

function normalizeSavedCheckIns(value: unknown): CheckIn[] {
  if (!Array.isArray(value)) return createInitialCheckIns();

  return value.map((item) => {
    const raw = item as Partial<CheckIn>;
    const now = new Date().toISOString();

    return {
      id: raw.id ?? createId(),
      memberId: raw.memberId ?? members[0].id,
      date: raw.date ?? today,
      condition: raw.condition ?? "normal",
      mood: raw.mood ?? "stable",
      focus: raw.focus ?? "normal",
      progress: raw.progress ?? "onTrack",
      todayTask: raw.todayTask ?? "",
      concern: raw.concern ?? "",
      request: raw.request ?? "",
      source: raw.source ?? "manual",
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? raw.createdAt ?? now,
    };
  });
}

function loadCheckIns(): CheckIn[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const initial = createInitialCheckIns();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(saved);
    const normalized = normalizeSavedCheckIns(parsed);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const initial = createInitialCheckIns();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function conditionClass(value: ConditionStatus) {
  if (value === "good") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value === "normal") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function moodClass(value: MoodStatus) {
  if (value === "stable") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value === "anxious") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (value === "irritated") {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function progressClass(value: ProgressStatus) {
  if (value === "onTrack") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value === "slightDelay") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function severityClass(value: AlertSeverity) {
  if (value === "high") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (value === "middle") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-blue-50 text-blue-700 border-blue-200";
}

function getSortTime(item: CheckIn) {
  return new Date(item.updatedAt || item.createdAt).getTime();
}

export default function App() {
  const [page, setPage] = useState<AppPage>("dashboard");
  const [checkIns, setCheckIns] = useState<CheckIn[]>(loadCheckIns);
  const [operationMessage, setOperationMessage] = useState("");
  const [dashboardDate, setDashboardDate] = useState(today);

  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CheckInForm | null>(null);

  const [form, setForm] = useState<CheckInForm>({
    memberId: members[0].id,
    date: today,
    condition: "normal",
    mood: "stable",
    focus: "normal",
    progress: "onTrack",
    todayTask: "",
    concern: "",
    request: "",
  });

  const [employeeForm, setEmployeeForm] = useState<CheckInForm>({
    memberId: members[0].id,
    date: today,
    condition: "normal",
    mood: "stable",
    focus: "normal",
    progress: "onTrack",
    todayTask: "",
    concern: "",
    request: "",
  });

  const memberMap = useMemo(() => {
    return members.reduce<Record<string, (typeof members)[number]>>(
      (acc, member) => {
        acc[member.id] = member;
        return acc;
      },
      {}
    );
  }, []);

  const selectedDateCheckIns = useMemo(() => {
    return checkIns.filter((item) => item.date === dashboardDate);
  }, [checkIns, dashboardDate]);

  const latestSelectedDateCheckIns = useMemo(() => {
    const sorted = [...selectedDateCheckIns].sort(
      (a, b) => getSortTime(b) - getSortTime(a)
    );

    const latestMap = sorted.reduce<Record<string, CheckIn>>((acc, item) => {
      if (!acc[item.memberId]) {
        acc[item.memberId] = item;
      }

      return acc;
    }, {});

    return Object.values(latestMap);
  }, [selectedDateCheckIns]);

  const latestByMember = useMemo(() => {
    const sorted = [...checkIns].sort((a, b) => getSortTime(b) - getSortTime(a));

    return sorted.reduce<Record<string, CheckIn>>((acc, item) => {
      if (!acc[item.memberId]) {
        acc[item.memberId] = item;
      }

      return acc;
    }, {});
  }, [checkIns]);

  const employeeHistory = useMemo(() => {
    return checkIns
      .filter((item) => item.memberId === employeeForm.memberId)
      .sort((a, b) => getSortTime(b) - getSortTime(a))
      .slice(0, 5);
  }, [checkIns, employeeForm.memberId]);

  const supportNeeded = useMemo(() => {
    return latestSelectedDateCheckIns.filter((item) => {
      return (
        item.condition === "bad" ||
        item.mood === "anxious" ||
        item.mood === "irritated" ||
        item.mood === "down" ||
        item.focus === "low" ||
        item.progress === "delay" ||
        item.concern.trim() !== "" ||
        item.request.trim() !== ""
      );
    });
  }, [latestSelectedDateCheckIns]);

  const alerts = useMemo<GeneratedAlert[]>(() => {
    const result: GeneratedAlert[] = [];

    latestSelectedDateCheckIns.forEach((item) => {
      const member = memberMap[item.memberId];
      if (!member) return;

      if (item.condition === "bad") {
        result.push({
          id: `condition-${item.id}`,
          memberId: item.memberId,
          memberName: member.name,
          title: "体調不良の申告があります",
          message:
            "選択日の最新入力で体調が「悪い」と入力されています。業務量や休憩の調整を検討してください。",
          severity: "high",
          date: item.date,
        });
      }

      if (item.progress === "delay") {
        result.push({
          id: `progress-${item.id}`,
          memberId: item.memberId,
          memberName: member.name,
          title: "作業遅れの可能性があります",
          message:
            "選択日の最新入力で進捗が「遅れ」と入力されています。優先順位の整理や担当者フォローが必要です。",
          severity: "middle",
          date: item.date,
        });
      }

      if (item.request.trim() !== "") {
        result.push({
          id: `request-${item.id}`,
          memberId: item.memberId,
          memberName: member.name,
          title: "支援リクエストがあります",
          message: item.request,
          severity: "middle",
          date: item.date,
        });
      }

      if (item.concern.trim() !== "") {
        result.push({
          id: `concern-${item.id}`,
          memberId: item.memberId,
          memberName: member.name,
          title: "困りごとの記入があります",
          message: item.concern,
          severity: "low",
          date: item.date,
        });
      }
    });

    members.forEach((member) => {
      const hasSelectedDateLatest = latestSelectedDateCheckIns.some(
        (item) => item.memberId === member.id
      );

      if (!hasSelectedDateLatest) return;

      const memberItemsUpToSelectedDate = checkIns
        .filter((item) => item.memberId === member.id && item.date <= dashboardDate)
        .sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }

          return getSortTime(b) - getSortTime(a);
        });

      const latestTwo = memberItemsUpToSelectedDate.slice(0, 2);

      if (
        latestTwo.length >= 2 &&
        latestTwo.every((item) => item.condition === "bad")
      ) {
        result.push({
          id: `continuous-bad-${member.id}-${dashboardDate}`,
          memberId: member.id,
          memberName: member.name,
          title: "体調不良が連続しています",
          message:
            "選択日までの直近2回の入力で体調不良が続いています。早めの面談や業務調整を検討してください。",
          severity: "high",
          date: latestTwo[0].date,
        });
      }

      if (
        latestTwo.length >= 2 &&
        latestTwo.every((item) => item.focus === "low")
      ) {
        result.push({
          id: `continuous-focus-${member.id}-${dashboardDate}`,
          memberId: member.id,
          memberName: member.name,
          title: "集中度の低下が続いています",
          message:
            "選択日までの直近2回の入力で集中度が低い状態です。作業環境やタスク量の見直しが必要かもしれません。",
          severity: "middle",
          date: latestTwo[0].date,
        });
      }
    });

    return result;
  }, [checkIns, dashboardDate, latestSelectedDateCheckIns, memberMap]);

  const badConditionCount = latestSelectedDateCheckIns.filter(
    (item) => item.condition === "bad"
  ).length;

  const delayCount = latestSelectedDateCheckIns.filter(
    (item) => item.progress === "delay" || item.progress === "slightDelay"
  ).length;

  const checkInRate = Math.round(
    (latestSelectedDateCheckIns.length / members.length) * 100
  );

  function saveCheckIns(next: CheckIn[]) {
    setCheckIns(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newItem = createCheckInFromForm(form, "manual");
    const next = [newItem, ...checkIns];

    saveCheckIns(next);
    setDashboardDate(form.date);

    setForm({
      memberId: form.memberId,
      date: today,
      condition: "normal",
      mood: "stable",
      focus: "normal",
      progress: "onTrack",
      todayTask: "",
      concern: "",
      request: "",
    });

    setOperationMessage(
      "管理者入力データをこのブラウザのlocalStorageに登録しました。"
    );
    setPage("dashboard");
  }

  function handleEmployeeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newItem = createCheckInFromForm(employeeForm, "employee");
    const next = [newItem, ...checkIns];

    saveCheckIns(next);
    setDashboardDate(employeeForm.date);

    const memberName = memberMap[employeeForm.memberId]?.name ?? "従業員";

    setEmployeeForm({
      memberId: employeeForm.memberId,
      date: today,
      condition: "normal",
      mood: "stable",
      focus: "normal",
      progress: "onTrack",
      todayTask: "",
      concern: "",
      request: "",
    });

    setOperationMessage(
      `${memberName} さんの本人入力を登録しました。管理者ダッシュボードに反映されています。`
    );
    setPage("dashboard");
  }

  function resetDemoData() {
    const ok = window.confirm(
      "このブラウザ内のデータを初期デモデータに戻します。よろしいですか？"
    );

    if (!ok) return;

    const initial = createInitialCheckIns();
    saveCheckIns(initial);

    setDashboardDate(today);
    setCsvFileName("");
    setCsvPreviewRows([]);
    setCsvErrors([]);
    setEditingCheckInId(null);
    setEditForm(null);
    setOperationMessage("デモデータに戻しました。");
    setPage("dashboard");
  }

  function exportCsv() {
    const header = [
      "日付",
      "氏名",
      "部署",
      "役割",
      "体調",
      "気分",
      "集中度",
      "進捗",
      "今日の作業",
      "困りごと",
      "支援依頼",
      "登録元",
      "作成日時",
      "更新日時",
    ];

    const rows = checkIns.map((item) => {
      const member = memberMap[item.memberId];

      return [
        item.date,
        member?.name ?? "",
        member?.department ?? "",
        member?.role ?? "",
        conditionLabel[item.condition],
        moodLabel[item.mood],
        focusLabel[item.focus],
        progressLabel[item.progress],
        item.todayTask,
        item.concern,
        item.request,
        sourceLabel[item.source],
        item.createdAt,
        item.updatedAt,
      ];
    });

    const csv = buildCsvContent([header, ...rows]);
    downloadTextFile(`work-balance-vision-demo-${today}.csv`, csv);
  }

  function downloadSampleCsv() {
    const rows = [
      [
        "日付",
        "氏名",
        "体調",
        "気分",
        "集中度",
        "進捗",
        "今日の作業",
        "困りごと",
        "支援依頼",
      ],
      [
        today,
        "佐藤 祐美",
        "普通",
        "安定",
        "高い",
        "順調",
        "データ集計と進捗確認",
        "",
        "午後に仕様確認の時間があると助かります。",
      ],
      [
        today,
        "田中 美咲",
        "悪い",
        "落ち込み",
        "低い",
        "やや遅れ",
        "申請書類の入力",
        "朝から体調が重く、集中が続きにくいです。",
        "急ぎではない業務を明日に回せると助かります。",
      ],
      [
        today,
        "高橋 翔太",
        "普通",
        "不安",
        "普通",
        "遅れ",
        "備品棚卸し",
        "確認項目が多く、優先順位がわかりにくいです。",
        "作業手順の確認をお願いしたいです。",
      ],
    ];

    downloadTextFile(
      "work-balance-vision-import-sample.csv",
      buildCsvContent(rows)
    );
  }

  function handleCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setCsvFileName(file.name);
    setCsvPreviewRows([]);
    setCsvErrors([]);
    setOperationMessage("");

    void file
      .text()
      .then((text) => {
        const result = parseCheckInCsv(text, members, today);
        setCsvPreviewRows(result.rows);
        setCsvErrors(result.errors);
      })
      .catch(() => {
        setCsvErrors(["CSVファイルの読み込みに失敗しました。"]);
      });
  }

  function importPreviewRows() {
    if (csvPreviewRows.length === 0) return;

    const importedCheckIns = csvPreviewRows.map((row) =>
      createCheckInFromForm(row.checkIn, "csv")
    );

    const next = [...importedCheckIns, ...checkIns];
    saveCheckIns(next);

    const firstImportedDate = importedCheckIns[0]?.date;
    if (firstImportedDate) {
      setDashboardDate(firstImportedDate);
    }

    setCsvPreviewRows([]);
    setCsvErrors([]);
    setCsvFileName("");
    setOperationMessage(
      "CSVデータをこのブラウザのlocalStorageに取り込みました。"
    );
    setPage("dashboard");
  }

  function clearCsvPreview() {
    setCsvFileName("");
    setCsvPreviewRows([]);
    setCsvErrors([]);
  }

  function startEditCheckIn(item: CheckIn) {
    setEditingCheckInId(item.id);
    setEditForm({
      memberId: item.memberId,
      date: item.date,
      condition: item.condition,
      mood: item.mood,
      focus: item.focus,
      progress: item.progress,
      todayTask: item.todayTask,
      concern: item.concern,
      request: item.request,
    });
    setPage("history");
  }

  function cancelEditCheckIn() {
    setEditingCheckInId(null);
    setEditForm(null);
  }

  function updateCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingCheckInId || !editForm) return;

    const now = new Date().toISOString();

    const next = checkIns.map((item) => {
      if (item.id !== editingCheckInId) return item;

      return {
        ...item,
        ...editForm,
        updatedAt: now,
      };
    });

    saveCheckIns(next);
    setDashboardDate(editForm.date);
    setEditingCheckInId(null);
    setEditForm(null);
    setOperationMessage("入力履歴をこのブラウザ内で更新しました。");
    setPage("dashboard");
  }

  function deleteCheckIn(id: string) {
    const target = checkIns.find((item) => item.id === id);
    const memberName = target
      ? memberMap[target.memberId]?.name ?? "対象データ"
      : "対象データ";

    const ok = window.confirm(
      `${memberName} の入力履歴をこのブラウザ内から削除します。よろしいですか？`
    );

    if (!ok) return;

    const next = checkIns.filter((item) => item.id !== id);
    saveCheckIns(next);

    if (editingCheckInId === id) {
      setEditingCheckInId(null);
      setEditForm(null);
    }

    setOperationMessage("入力履歴をこのブラウザ内から削除しました。");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Work Balance Vision
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              就労コンディション・業務支援ダッシュボード
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              採用担当者がログインなしで操作できる公開デモ版です。従業員チェックインから入力すると、管理者ダッシュボードへ反映されます。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCsv}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              CSV出力
            </button>
            <button
              onClick={resetDemoData}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              デモデータに戻す
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <nav className="grid gap-2">
            <NavButton
              active={page === "dashboard"}
              onClick={() => setPage("dashboard")}
              label="ダッシュボード"
            />
            <NavButton
              active={page === "employee"}
              onClick={() => setPage("employee")}
              label="従業員チェックイン"
            />
            <NavButton
              active={page === "input"}
              onClick={() => setPage("input")}
              label="管理者入力"
            />
            <NavButton
              active={page === "import"}
              onClick={() => setPage("import")}
              label="CSV取込"
            />
            <NavButton
              active={page === "members"}
              onClick={() => setPage("members")}
              label="メンバー一覧"
            />
            <NavButton
              active={page === "alerts"}
              onClick={() => setPage("alerts")}
              label="アラート"
              count={alerts.length}
            />
            <NavButton
              active={page === "history"}
              onClick={() => setPage("history")}
              label="履歴"
            />
          </nav>
        </aside>

        <main className="space-y-6">
          {operationMessage && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
              {operationMessage}
            </div>
          )}

          {page === "dashboard" && (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-600">
                      Dashboard Date
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {formatDisplayDate(dashboardDate)} のダッシュボード
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      日付を切り替えて、過去のコンディションやアラートを確認できます。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDashboardDate(addDays(dashboardDate, -1))}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      前日
                    </button>

                    <input
                      type="date"
                      value={dashboardDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDashboardDate(e.target.value);
                        }
                      }}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() => setDashboardDate(addDays(dashboardDate, 1))}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      翌日
                    </button>

                    <button
                      type="button"
                      onClick={() => setDashboardDate(today)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                    >
                      今日
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title="選択日の入力率"
                  value={`${checkInRate}%`}
                  description={`${latestSelectedDateCheckIns.length} / ${members.length}名が入力済み`}
                />
                <KpiCard
                  title="支援が必要な可能性"
                  value={`${supportNeeded.length}名`}
                  description="選択日の各メンバー最新入力から検知"
                />
                <KpiCard
                  title="体調不良"
                  value={`${badConditionCount}名`}
                  description="選択日の最新入力で体調「悪い」"
                />
                <KpiCard
                  title="進捗遅れ"
                  value={`${delayCount}件`}
                  description="選択日の最新入力でやや遅れ・遅れ"
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        選択日のコンディション
                      </h2>
                      <p className="text-sm text-slate-500">
                        各メンバーの選択日最新入力を一覧で確認できます。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setPage("employee")}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                      >
                        従業員として入力
                      </button>
                      <button
                        onClick={() => setPage("input")}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        管理者入力
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <Th>氏名</Th>
                          <Th>体調</Th>
                          <Th>気分</Th>
                          <Th>集中度</Th>
                          <Th>進捗</Th>
                          <Th>登録元</Th>
                          <Th>今日の作業</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {latestSelectedDateCheckIns.map((item) => {
                          const member = memberMap[item.memberId];

                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <Td>
                                <div className="font-semibold text-slate-900">
                                  {member?.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {member?.department}
                                </div>
                              </Td>
                              <Td>
                                <Badge
                                  className={conditionClass(item.condition)}
                                >
                                  {conditionLabel[item.condition]}
                                </Badge>
                              </Td>
                              <Td>
                                <Badge className={moodClass(item.mood)}>
                                  {moodLabel[item.mood]}
                                </Badge>
                              </Td>
                              <Td>{focusLabel[item.focus]}</Td>
                              <Td>
                                <Badge className={progressClass(item.progress)}>
                                  {progressLabel[item.progress]}
                                </Badge>
                              </Td>
                              <Td>{sourceLabel[item.source]}</Td>
                              <Td>{item.todayTask || "未入力"}</Td>
                            </tr>
                          );
                        })}

                        {latestSelectedDateCheckIns.length === 0 && (
                          <tr>
                            <Td>
                              <span className="text-slate-400">
                                選択日の入力はまだありません
                              </span>
                            </Td>
                            <Td />
                            <Td />
                            <Td />
                            <Td />
                            <Td />
                            <Td />
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    優先フォロー
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    選択日の最新入力から、確認した方がよい内容を表示します。
                  </p>

                  <div className="mt-4 space-y-3">
                    {alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-2xl border p-4 ${severityClass(
                          alert.severity
                        )}`}
                      >
                        <div className="text-sm font-bold">{alert.title}</div>
                        <div className="mt-1 text-xs font-semibold">
                          {alert.memberName}
                        </div>
                        <p className="mt-2 text-sm leading-6">
                          {alert.message}
                        </p>
                      </div>
                    ))}

                    {alerts.length === 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        選択日に優先フォローが必要なアラートはありません。
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {page === "employee" && (
            <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-blue-600">
                  Employee Check-in
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  従業員チェックイン
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  従業員本人が今日の体調・気分・集中度・業務進捗を入力する画面です。
                  送信すると、管理者ダッシュボードに「本人入力」として反映されます。
                </p>

                <form onSubmit={handleEmployeeSubmit} className="mt-6 grid gap-5">
                  <EmployeeFormFields
                    form={employeeForm}
                    setForm={setEmployeeForm}
                  />

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPage("dashboard")}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      ダッシュボードへ戻る
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500"
                    >
                      本人入力として送信
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">
                    この画面の想定
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    実運用では、従業員がログインして自分のチェックインだけを登録・確認する画面として利用します。
                    公開デモでは、名前を選んで入力の流れを体験できます。
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      1. 従業員が自分の状態を入力
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      2. 管理者ダッシュボードに反映
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      3. 不調や支援依頼を自動アラート化
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">
                    選択中メンバーの直近履歴
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    デモでは、選択したメンバーの直近5件を表示します。
                  </p>

                  <div className="mt-4 space-y-3">
                    {employeeHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {item.date}
                          </span>
                          <Badge className={conditionClass(item.condition)}>
                            {conditionLabel[item.condition]}
                          </Badge>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                            {sourceLabel[item.source]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {item.todayTask || "作業内容未入力"}
                        </p>
                      </div>
                    ))}

                    {employeeHistory.length === 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        まだ履歴がありません。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {page === "input" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                管理者入力
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                管理者・支援者が代理入力する想定の画面です。
              </p>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
                <ConditionFormFields form={form} setForm={setForm} />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500"
                  >
                    管理者入力として登録
                  </button>
                </div>
              </form>
            </section>
          )}

          {page === "import" && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-600">
                      CSV Import
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      CSV取込
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      CSVを取り込み、このブラウザ内のデモデータに追加します。
                      共有データは壊れないため、採用担当者が自由に操作できます。
                    </p>
                  </div>

                  <button
                    onClick={downloadSampleCsv}
                    className="w-fit rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    サンプルCSVをダウンロード
                  </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                    <p className="text-sm font-bold text-slate-700">
                      CSVファイルを選択
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      文字コードはUTF-8推奨です。Excelで作成したCSVも取り込みできます。
                    </p>

                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFile}
                      className="mt-4 block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-slate-700"
                    />

                    {csvFileName && (
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        選択中：{csvFileName}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-bold text-slate-700">
                      必要な列
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "日付",
                        "氏名",
                        "体調",
                        "気分",
                        "集中度",
                        "進捗",
                        "今日の作業",
                        "困りごと",
                        "支援依頼",
                      ].map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-xs leading-6 text-slate-500">
                      体調：良い / 普通 / 悪い
                      <br />
                      気分：安定 / 不安 / イライラ / 落ち込み
                      <br />
                      集中度：高い / 普通 / 低い
                      <br />
                      進捗：順調 / やや遅れ / 遅れ
                    </p>
                  </div>
                </div>
              </div>

              {csvErrors.length > 0 && (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
                  <h3 className="font-bold">取込エラー</h3>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                    {csvErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      取込プレビュー
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      有効なデータのみ表示しています。内容を確認してから取り込めます。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={clearCsvPreview}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      クリア
                    </button>
                    <button
                      onClick={importPreviewRows}
                      disabled={csvPreviewRows.length === 0}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {csvPreviewRows.length}件を取り込む
                    </button>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <Th>行</Th>
                        <Th>日付</Th>
                        <Th>氏名</Th>
                        <Th>体調</Th>
                        <Th>気分</Th>
                        <Th>集中度</Th>
                        <Th>進捗</Th>
                        <Th>今日の作業</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {csvPreviewRows.map((row) => (
                        <tr key={row.previewId} className="hover:bg-slate-50">
                          <Td>{row.rowNumber}</Td>
                          <Td>{row.checkIn.date}</Td>
                          <Td>
                            <div className="font-semibold text-slate-900">
                              {row.memberName}
                            </div>
                          </Td>
                          <Td>
                            <Badge
                              className={conditionClass(row.checkIn.condition)}
                            >
                              {conditionLabel[row.checkIn.condition]}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge className={moodClass(row.checkIn.mood)}>
                              {moodLabel[row.checkIn.mood]}
                            </Badge>
                          </Td>
                          <Td>{focusLabel[row.checkIn.focus]}</Td>
                          <Td>
                            <Badge
                              className={progressClass(row.checkIn.progress)}
                            >
                              {progressLabel[row.checkIn.progress]}
                            </Badge>
                          </Td>
                          <Td>{row.checkIn.todayTask || "未入力"}</Td>
                        </tr>
                      ))}

                      {csvPreviewRows.length === 0 && (
                        <tr>
                          <Td>
                            <span className="text-slate-400">未選択</span>
                          </Td>
                          <Td>
                            <span className="text-slate-400">
                              CSVを選択してください
                            </span>
                          </Td>
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {page === "members" && (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  メンバー一覧
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  配慮事項と直近のコンディションを確認できます。
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {members.map((member) => {
                  const latest = latestByMember[member.id];

                  return (
                    <div
                      key={member.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {member.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {member.department} / {member.role}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {member.employmentType}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-500">
                          配慮事項
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {member.considerations}
                        </p>
                      </div>

                      {latest ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge className={conditionClass(latest.condition)}>
                            体調：{conditionLabel[latest.condition]}
                          </Badge>
                          <Badge className={moodClass(latest.mood)}>
                            気分：{moodLabel[latest.mood]}
                          </Badge>
                          <Badge className={progressClass(latest.progress)}>
                            進捗：{progressLabel[latest.progress]}
                          </Badge>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {sourceLabel[latest.source]}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-slate-500">
                          まだ入力履歴がありません。
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {page === "alerts" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                アラート一覧
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                体調不良・進捗遅れ・支援依頼などを自動検知します。
              </p>

              <div className="mt-5 space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-5 ${severityClass(
                      alert.severity
                    )}`}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-bold">{alert.title}</h3>
                        <p className="mt-1 text-sm font-semibold">
                          {alert.memberName} / {alert.date}
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                        {alert.severity === "high"
                          ? "高"
                          : alert.severity === "middle"
                            ? "中"
                            : "低"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6">{alert.message}</p>
                  </div>
                ))}

                {alerts.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    現在、アラートはありません。
                  </div>
                )}
              </div>
            </section>
          )}

          {page === "history" && (
            <section className="space-y-6">
              {editForm && (
                <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-blue-600">
                        Edit Record
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        入力履歴の編集
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        CSV取込データ・手入力データ・本人入力データを、このブラウザ内で修正できます。
                      </p>
                    </div>

                    <button
                      onClick={cancelEditCheckIn}
                      className="w-fit rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      編集をキャンセル
                    </button>
                  </div>

                  <form onSubmit={updateCheckIn} className="mt-6 grid gap-5">
                    <ConditionFormFields
                      form={editForm}
                      setForm={(next) => setEditForm(next)}
                    />

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditCheckIn}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500"
                      >
                        更新する
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">入力履歴</h2>
                <p className="mt-1 text-sm text-slate-500">
                  これまでのコンディション入力を確認できます。編集・削除はこのブラウザ内だけに反映されます。
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <Th>日付</Th>
                        <Th>氏名</Th>
                        <Th>体調</Th>
                        <Th>気分</Th>
                        <Th>集中度</Th>
                        <Th>進捗</Th>
                        <Th>登録元</Th>
                        <Th>困りごと・支援依頼</Th>
                        <Th>操作</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {checkIns.map((item) => {
                        const member = memberMap[item.memberId];

                        return (
                          <tr
                            key={item.id}
                            className={
                              editingCheckInId === item.id
                                ? "bg-blue-50"
                                : "hover:bg-slate-50"
                            }
                          >
                            <Td>{item.date}</Td>
                            <Td>
                              <div className="font-semibold text-slate-900">
                                {member?.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {member?.role}
                              </div>
                            </Td>
                            <Td>
                              <Badge className={conditionClass(item.condition)}>
                                {conditionLabel[item.condition]}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge className={moodClass(item.mood)}>
                                {moodLabel[item.mood]}
                              </Badge>
                            </Td>
                            <Td>{focusLabel[item.focus]}</Td>
                            <Td>
                              <Badge className={progressClass(item.progress)}>
                                {progressLabel[item.progress]}
                              </Badge>
                            </Td>
                            <Td>{sourceLabel[item.source]}</Td>
                            <Td>
                              <div className="max-w-md space-y-1">
                                {item.concern && (
                                  <p>
                                    <span className="font-bold">
                                      困りごと：
                                    </span>
                                    {item.concern}
                                  </p>
                                )}
                                {item.request && (
                                  <p>
                                    <span className="font-bold">
                                      支援依頼：
                                    </span>
                                    {item.request}
                                  </p>
                                )}
                                {!item.concern && !item.request && (
                                  <span className="text-slate-400">なし</span>
                                )}
                              </div>
                            </Td>
                            <Td>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => startEditCheckIn(item)}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => deleteCheckIn(item.id)}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                                >
                                  削除
                                </button>
                              </div>
                            </Td>
                          </tr>
                        );
                      })}

                      {checkIns.length === 0 && (
                        <tr>
                          <Td>
                            <span className="text-slate-400">
                              履歴がありません
                            </span>
                          </Td>
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                          <Td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function ConditionFormFields({
  form,
  setForm,
}: {
  form: CheckInForm;
  setForm: (next: CheckInForm) => void;
}) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="対象メンバー">
          <select
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} / {member.role}
              </option>
            ))}
          </select>
        </Field>

        <Field label="日付">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </Field>

        <Field label="体調">
          <select
            value={form.condition}
            onChange={(e) =>
              setForm({
                ...form,
                condition: e.target.value as ConditionStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="good">良い</option>
            <option value="normal">普通</option>
            <option value="bad">悪い</option>
          </select>
        </Field>

        <Field label="気分">
          <select
            value={form.mood}
            onChange={(e) =>
              setForm({
                ...form,
                mood: e.target.value as MoodStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="stable">安定</option>
            <option value="anxious">不安</option>
            <option value="irritated">イライラ</option>
            <option value="down">落ち込み</option>
          </select>
        </Field>

        <Field label="集中度">
          <select
            value={form.focus}
            onChange={(e) =>
              setForm({
                ...form,
                focus: e.target.value as FocusStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="high">高い</option>
            <option value="normal">普通</option>
            <option value="low">低い</option>
          </select>
        </Field>

        <Field label="作業進捗">
          <select
            value={form.progress}
            onChange={(e) =>
              setForm({
                ...form,
                progress: e.target.value as ProgressStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="onTrack">順調</option>
            <option value="slightDelay">やや遅れ</option>
            <option value="delay">遅れ</option>
          </select>
        </Field>
      </div>

      <Field label="今日の作業予定・実施内容">
        <textarea
          value={form.todayTask}
          onChange={(e) => setForm({ ...form, todayTask: e.target.value })}
          rows={3}
          placeholder="例：CSVデータ整理、備品チェック、書類確認など"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </Field>

      <Field label="困っていること">
        <textarea
          value={form.concern}
          onChange={(e) => setForm({ ...form, concern: e.target.value })}
          rows={3}
          placeholder="例：作業量が多く優先順位がわからない、体調が不安定など"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </Field>

      <Field label="管理者に伝えたいこと・支援してほしいこと">
        <textarea
          value={form.request}
          onChange={(e) => setForm({ ...form, request: e.target.value })}
          rows={3}
          placeholder="例：午後の業務量を調整してほしい、手順確認の時間がほしいなど"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </Field>
    </>
  );
}

function EmployeeFormFields({
  form,
  setForm,
}: {
  form: CheckInForm;
  setForm: (next: CheckInForm) => void;
}) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="あなたの名前">
          <select
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} / {member.role}
              </option>
            ))}
          </select>
        </Field>

        <Field label="日付">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </Field>

        <Field label="今日の体調">
          <select
            value={form.condition}
            onChange={(e) =>
              setForm({
                ...form,
                condition: e.target.value as ConditionStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="good">良い</option>
            <option value="normal">普通</option>
            <option value="bad">悪い</option>
          </select>
        </Field>

        <Field label="今の気分">
          <select
            value={form.mood}
            onChange={(e) =>
              setForm({
                ...form,
                mood: e.target.value as MoodStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="stable">安定</option>
            <option value="anxious">不安</option>
            <option value="irritated">イライラ</option>
            <option value="down">落ち込み</option>
          </select>
        </Field>

        <Field label="集中できそうか">
          <select
            value={form.focus}
            onChange={(e) =>
              setForm({
                ...form,
                focus: e.target.value as FocusStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="high">高い</option>
            <option value="normal">普通</option>
            <option value="low">低い</option>
          </select>
        </Field>

        <Field label="作業の進み具合">
          <select
            value={form.progress}
            onChange={(e) =>
              setForm({
                ...form,
                progress: e.target.value as ProgressStatus,
              })
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="onTrack">順調</option>
            <option value="slightDelay">やや遅れ</option>
            <option value="delay">遅れ</option>
          </select>
        </Field>
      </div>

      <Field label="今日やること・やったこと">
        <textarea
          value={form.todayTask}
          onChange={(e) => setForm({ ...form, todayTask: e.target.value })}
          rows={3}
          placeholder="例：書類確認、データ入力、備品チェックなど"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </Field>

      <Field label="困っていること・不安なこと">
        <textarea
          value={form.concern}
          onChange={(e) => setForm({ ...form, concern: e.target.value })}
          rows={3}
          placeholder="例：作業量が多い、優先順位がわからない、体調が不安定など"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </Field>

      <Field label="管理者に伝えたいこと・支援してほしいこと">
        <textarea
          value={form.request}
          onChange={(e) => setForm({ ...form, request: e.target.value })}
          rows={3}
          placeholder="例：作業量を調整してほしい、確認の時間がほしい、休憩を入れたいなど"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </Field>
    </>
  );
}

function NavButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-white text-blue-600" : "bg-rose-100 text-rose-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function KpiCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function Td({ children }: { children?: ReactNode }) {
  return <td className="px-4 py-4 align-top text-slate-700">{children}</td>;
}