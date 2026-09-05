export const subjects = {
  a: {
    key: "a",
    label: "科目A",
    description: "四択問題で、知識を幅広く確認",
    quizDescription: "選んだ分野からランダムに1問ずつ出題します。",
    mockDescription: "80問・150分の試験形式で取り組みます。",
  },
  b: {
    key: "b",
    label: "科目B",
    description: "記述式の問題で、考える力を鍛える",
    quizDescription: "選んだ分野の記述問題を1問ずつ学習します。",
    mockDescription: "必須1分野と選択4分野・150分で取り組みます。",
  },
} as const;

export type SubjectKey = keyof typeof subjects;

export function isSubjectKey(value: string): value is SubjectKey {
  return value === "a" || value === "b";
}
