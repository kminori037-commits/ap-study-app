import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve("data/questions");
const files = (await readdir(directory)).filter((name) => name.endsWith(".json") && name !== "schema.json");
const ids = new Set();
const prompts = new Set();
const subjectCounts = { A: 0, B: 0 };
let count = 0;

for (const file of files) {
  const bank = JSON.parse(await readFile(path.join(directory, file), "utf8"));
  if (bank.schemaVersion !== 1 || !/^[A-Z0-9_-]+$/.test(bank.bankId) || !Array.isArray(bank.questions)) {
    throw new Error(`${file}: bank metadata is invalid`);
  }
  for (const question of bank.questions) {
    const required = ["questionId", "subject", "group", "category", "prompt", "answer"];
    if (required.some((key) => !question[key])) throw new Error(`${file}: ${question.questionId ?? "unknown"} is missing a required field`);
    if (ids.has(question.questionId)) throw new Error(`${file}: duplicate questionId ${question.questionId}`);
    ids.add(question.questionId);
    if (prompts.has(question.prompt)) throw new Error(`${file}: duplicate prompt for ${question.questionId}`);
    prompts.add(question.prompt);
    if (!["A", "B"].includes(question.subject)) throw new Error(`${file}: invalid subject for ${question.questionId}`);
    if (question.source && !question.source.label) throw new Error(`${file}: source label is required when source is set for ${question.questionId}`);
    if (question.source?.label === "本アプリ独自問題") throw new Error(`${file}: original questions must omit source for ${question.questionId}`);
    if (question.answer.kind === "CHOICE") {
      if (question.subject !== "A" || question.choices?.length !== 4 || !Number.isInteger(question.answer.correctIndex) || question.answer.correctIndex < 0 || question.answer.correctIndex > 3) {
        throw new Error(`${file}: invalid choice question ${question.questionId}`);
      }
      if (new Set(question.choices).size !== 4 || question.choices[question.answer.correctIndex] !== question.answer.modelAnswer) {
        throw new Error(`${file}: choices and model answer do not match for ${question.questionId}`);
      }
    } else if (question.answer.kind === "SHORT") {
      if (!Array.isArray(question.answer.acceptedAnswers) || question.answer.acceptedAnswers.length === 0 || !question.answer.modelAnswer) {
        throw new Error(`${file}: invalid short-answer question ${question.questionId}`);
      }
    } else {
      throw new Error(`${file}: invalid answer kind for ${question.questionId}`);
    }
    subjectCounts[question.subject] += 1;
    count += 1;
  }
}

for (const [subject, minimum] of [["A", 800], ["B", 100]]) {
  if (subjectCounts[subject] < minimum) throw new Error(`Subject ${subject} requires at least ${minimum} questions; found ${subjectCounts[subject]}`);
}

console.log(`Validated ${count} questions (A: ${subjectCounts.A}, B: ${subjectCounts.B}) in ${files.length} bank file(s).`);
