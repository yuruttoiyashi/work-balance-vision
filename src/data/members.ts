import type { Member } from "../types";

export const members: Member[] = [
  {
    id: "m001",
    name: "佐藤 祐美",
    role: "業務改善サポート",
    department: "DX推進チーム",
    employmentType: "障害者雇用",
    considerations:
      "集中しやすい作業環境、予定変更時の事前共有、口頭だけでなく文章での指示があると安心。",
  },
  {
    id: "m002",
    name: "田中 美咲",
    role: "データ入力",
    department: "事務センター",
    employmentType: "パート",
    considerations:
      "午前中は集中力が高い。複数タスクよりも一つずつ完了する進め方が合っている。",
  },
  {
    id: "m003",
    name: "高橋 翔太",
    role: "在庫チェック",
    department: "物流サポート",
    employmentType: "契約社員",
    considerations:
      "急な呼び出しが苦手。作業手順書とチェックリストがあると安定して取り組める。",
  },
  {
    id: "m004",
    name: "鈴木 菜々",
    role: "書類確認",
    department: "管理部",
    employmentType: "短時間勤務",
    considerations:
      "疲労が出やすいため、午後の業務量調整と小休憩の声かけが有効。",
  },
];