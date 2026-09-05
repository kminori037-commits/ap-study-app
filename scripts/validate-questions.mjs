import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve("data/questions");
const files = (await readdir(directory)).filter((name) => name.endsWith(".json") && name !== "schema.json");
const ids = new Set();
let count = 0;

for (const file of files) {
  const bank = JSON.parse(await readFile(path.join(directory, file), "utf8"));
  if (bank.schemaVersion !== 1 || !/^[A-Z0-9_-]+$/.test(bank.bankId) || !Array.isArray(bank.questions)) {
    throw new Error(`${file}: bank metadata is invalid`);
  }
  for (const question of bank.questions) {
    const required = ["questionId", "subject", "group", "category", "prompt", "answer", "source"];
    if (required.some((key) => !question[key])) throw new Error(`${file}: ${question.questionId ?? "unknown"} is missing a required field`);
    if (ids.has(question.questionId)) throw new Error(`${file}: duplicate questionId ${question.questionId}`);
    ids.add(question.questionId);
    if (!["A", "B"].includes(question.subject)) throw new Error(`${file}: invalid subject for ${question.questionId}`);
    if (!question.source.label) throw new Error(`${file}: source label is required for ${question.questionId}`);
    if (question.answer.kind === "CHOICE") {
      if (question.subject !== "A" || question.choices?.length !== 4 || !Number.isInteger(question.answer.correctIndex) || question.answer.correctIndex < 0 || question.answer.correctIndex > 3) {
        throw new Error(`${file}: invalid choice question ${question.questionId}`);
      }
    } else if (question.answer.kind === "SHORT") {
      if (!Array.isArray(question.answer.acceptedAnswers) || question.answer.acceptedAnswers.length === 0 || !question.answer.modelAnswer) {
        throw new Error(`${file}: invalid short-answer question ${question.questionId}`);
      }
    } else {
      throw new Error(`${file}: invalid answer kind for ${question.questionId}`);
    }
    count += 1;
  }
}

console.log(`Validated ${count} questions in ${files.length} bank file(s).`);
