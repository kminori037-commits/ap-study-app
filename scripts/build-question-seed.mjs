import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const input = path.resolve(process.argv[2] ?? "data/questions/original-mvp.json");
const output = path.resolve(process.argv[3] ?? "work/question-bank-seed.json");
const bank = JSON.parse(await readFile(input, "utf8"));

const attribute = (value) => {
  if (typeof value === "string") return { S: value };
  if (typeof value === "number") return { N: String(value) };
  if (Array.isArray(value)) return { L: value.map(attribute) };
  if (value && typeof value === "object") return { M: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, attribute(item)])) };
  throw new Error(`Unsupported DynamoDB value: ${String(value)}`);
};

const requests = [];
for (const question of bank.questions) {
  const pk = `BANK#${bank.bankId}#${question.subject}`;
  const publicQuestion = {
    PK: pk,
    SK: `QUESTION#${question.questionId}`,
    recordType: "QUESTION",
    bankId: bank.bankId,
    questionId: question.questionId,
    subject: question.subject,
    group: question.group,
    category: question.category,
    prompt: question.prompt,
    ...(question.choices ? { choices: question.choices } : {}),
    answerKind: question.answer.kind,
    source: question.source
  };
  const answer = {
    PK: pk,
    SK: `ANSWER#${question.questionId}`,
    recordType: "ANSWER",
    questionId: question.questionId,
    ...question.answer
  };
  for (const item of [publicQuestion, answer]) {
    requests.push({ PutRequest: { Item: Object.fromEntries(Object.entries(item).map(([key, value]) => [key, attribute(value)])) } });
  }
}

if (requests.length > 25) throw new Error("A single seed batch cannot contain more than 25 items.");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ "ap-study-question-bank": requests }, null, 2) + "\n", "utf8");
console.log(`Built ${requests.length} DynamoDB items at ${output}`);
