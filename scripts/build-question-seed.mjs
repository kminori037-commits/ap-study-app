import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const input = path.resolve(process.argv[2] ?? "data/questions/original-mvp.json");
const outputDirectory = path.resolve(process.argv[3] ?? "work/question-bank-seed");
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
    ...(question.source ? { source: question.source } : {})
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

await mkdir(outputDirectory, { recursive: true });
const batchCount = Math.ceil(requests.length / 25);
for (let index = 0; index < batchCount; index += 1) {
  const batch = requests.slice(index * 25, (index + 1) * 25);
  const output = path.join(outputDirectory, `batch-${String(index + 1).padStart(3, "0")}.json`);
  await writeFile(output, JSON.stringify({ "ap-study-question-bank": batch }, null, 2) + "\n", "utf8");
}
console.log(`Built ${requests.length} DynamoDB items in ${batchCount} batches at ${outputDirectory}`);
