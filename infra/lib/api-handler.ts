import { transformSync } from "esbuild";

const minify = (source: string) => transformSync(source, { minify: true, target: "node22", format: "cjs" }).code;

export const apiHandlerSource = String.raw`
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, BatchWriteCommand,
  BatchGetCommand, GetCommand, UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("node:crypto");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.USER_LEARNING_TABLE;
const questionTableName = process.env.QUESTION_BANK_TABLE;
const questionBankId = process.env.QUESTION_BANK_ID;
const mockDurationSeconds = 150 * 60;
const optionalBFields = ["サービスマネジメント", "プロジェクトマネジメント", "経営戦略", "システム監査", "データベース"];

const reply = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(body),
});
const safeQuestionId = (value) => typeof value === "string" && /^[A-Za-z0-9_.#-]{1,120}$/.test(value);
const parseBody = (event) => {
  try { return event.body ? JSON.parse(event.body) : {}; }
  catch { return null; }
};
const bookmarkView = ({ questionId, subject, category, createdAt }) => ({ questionId, subject, category, createdAt });
const sessionView = ({ sessionId, subject, mode, answeredCount, correctCount, scoreRate, durationSeconds, createdAt }) => ({
  sessionId, subject, mode, answeredCount, correctCount, scoreRate, durationSeconds, createdAt,
});
const questionView = ({ questionId, subject, group, category, prompt, choices, answerKind, source }) => ({
  questionId, subject, group, category, prompt, ...(choices ? { choices } : {}), answerKind, source,
});
const normalizeAnswer = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const activeKey = (subject) => "ACTIVE#" + subject + "#MOCK";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const queryAll = async (params) => {
  const items = [];
  let lastKey;
  do {
    const result = await db.send(new QueryCommand({ ...params, ExclusiveStartKey: lastKey }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
};
const getUserItems = (pk, prefix) => queryAll({
  TableName: tableName,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
  ExpressionAttributeValues: { ":pk": pk, ":prefix": prefix },
});
const getBankQuestions = (subject) => queryAll({
  TableName: questionTableName,
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
  ExpressionAttributeValues: { ":pk": "BANK#" + questionBankId + "#" + subject, ":prefix": "QUESTION#" },
});
const batchGet = async (table, keys) => {
  const items = [];
  for (let index = 0; index < keys.length; index += 100) {
    let pendingKeys = keys.slice(index, index + 100);
    for (let attempt = 0; pendingKeys.length > 0 && attempt < 8; attempt += 1) {
      const result = await db.send(new BatchGetCommand({ RequestItems: { [table]: { Keys: pendingKeys } } }));
      items.push(...(result.Responses?.[table] ?? []));
      pendingKeys = result.UnprocessedKeys?.[table]?.Keys ?? [];
      if (pendingKeys.length > 0) await wait(100 * (attempt + 1));
    }
    if (pendingKeys.length > 0) throw new Error("BatchGetIncomplete");
  }
  return items;
};
const batchWrite = async (table, requests) => {
  for (let index = 0; index < requests.length; index += 25) {
    let pending = requests.slice(index, index + 25);
    for (let attempt = 0; pending.length > 0 && attempt < 8; attempt += 1) {
      const result = await db.send(new BatchWriteCommand({ RequestItems: { [table]: pending } }));
      pending = result.UnprocessedItems?.[table] ?? [];
      if (pending.length > 0) await wait(100 * (attempt + 1));
    }
    if (pending.length > 0) throw new Error("BatchWriteIncomplete");
  }
};
const deleteUserItems = async (pk, prefix) => {
  const items = await queryAll({
    TableName: tableName,
    KeyConditionExpression: prefix ? "PK = :pk AND begins_with(SK, :prefix)" : "PK = :pk",
    ExpressionAttributeValues: prefix ? { ":pk": pk, ":prefix": prefix } : { ":pk": pk },
    ProjectionExpression: "PK, SK",
  });
  await batchWrite(tableName, items.map((item) => ({ DeleteRequest: { Key: { PK: item.PK, SK: item.SK } } })));
  return items.length;
};
const loadPublicQuestions = async (subject, questionIds) => {
  const bankPk = "BANK#" + questionBankId + "#" + subject;
  const items = await batchGet(questionTableName, questionIds.map((id) => ({ PK: bankPk, SK: "QUESTION#" + id })));
  const byId = new Map(items.map((item) => [item.questionId, item]));
  return questionIds.map((id) => byId.get(id)).filter(Boolean).map(questionView);
};
const activeView = async (item) => ({
  subject: item.subject,
  questions: await loadPublicQuestions(item.subject, item.questionIds),
  answers: item.answers ?? {},
  remainingSeconds: Math.max(0, item.remainingSeconds - Math.max(0, Math.floor((Date.now() - Date.parse(item.updatedAt)) / 1000))),
  startedAt: item.startedAt,
  updatedAt: item.updatedAt,
  selectedCategories: item.selectedCategories ?? [],
  configuredQuestionCount: item.configuredQuestionCount,
});
const gradeAnswer = (question, answer, value) => answer.kind === "CHOICE"
  ? Number(value) === answer.correctIndex
  : (answer.acceptedAnswers ?? []).some((accepted) => normalizeAnswer(accepted) === normalizeAnswer(value));
const sanitizeMockAnswers = (raw, questionIds) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const allowed = new Set(questionIds);
  const answers = {};
  for (const [questionId, value] of Object.entries(raw)) {
    if (!allowed.has(questionId)) continue;
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3) answers[questionId] = value;
    if (typeof value === "string" && value.length <= 2000) answers[questionId] = value;
  }
  return answers;
};
const cleanupOldSessions = async (pk) => {
  const sessionItems = await getUserItems(pk, "SESSION#");
  const metadata = sessionItems.filter((item) => item.recordType === "SESSION_META").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const oldPrefixes = metadata.slice(50).map((item) => item.SK.slice(0, -4));
  const oldItems = sessionItems.filter((item) => oldPrefixes.some((prefix) => item.SK.startsWith(prefix)));
  await batchWrite(tableName, oldItems.map((item) => ({ DeleteRequest: { Key: { PK: item.PK, SK: item.SK } } })));
};
const saveSession = async (pk, input, details = []) => {
  const now = new Date();
  const id = randomUUID();
  const answeredCount = Math.min(100, Math.max(1, Math.trunc(Number(input.answeredCount) || 1)));
  const correctCount = Math.min(answeredCount, Math.max(0, Math.trunc(Number(input.correctCount) || 0)));
  const expiresAt = Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60;
  const prefix = "SESSION#" + now.toISOString() + "#" + id + "#";
  const item = {
    PK: pk, SK: prefix + "META", recordType: "SESSION_META", sessionId: id,
    subject: input.subject, mode: input.mode, answeredCount, correctCount,
    scoreRate: Math.round((correctCount / answeredCount) * 1000) / 10,
    durationSeconds: Math.min(24 * 60 * 60, Math.max(0, Math.trunc(Number(input.durationSeconds) || 0))),
    createdAt: now.toISOString(), expiresAt,
  };
  const requests = [{ PutRequest: { Item: item } }, ...details.map((detail) => ({
    PutRequest: { Item: { PK: pk, SK: prefix + "ANSWER#" + detail.questionId, recordType: "SESSION_ANSWER", sessionId: id, expiresAt, ...detail } },
  }))];
  await batchWrite(tableName, requests);
  await cleanupOldSessions(pk);
  return item;
};

exports.handler = async (event) => {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub) return reply(401, { message: "認証が必要です。" });
  const pk = "USER#" + sub;
  const route = event.routeKey;
  const questionId = event.pathParameters?.questionId;
  const subjectParam = event.pathParameters?.subject;
  console.info("request_received", { route });

  try {
    if (route === "GET /questions") {
      const subject = event.queryStringParameters?.subject;
      const category = event.queryStringParameters?.category ?? "全分野";
      const filter = event.queryStringParameters?.filter ?? "all";
      if (!["A", "B"].includes(subject)) return reply(400, { message: "科目が正しくありません。" });
      let questions = (await getBankQuestions(subject)).filter((item) => category === "全分野" || item.category === category || item.group === category);
      if (filter === "bookmarked") {
        const bookmarked = new Set((await getUserItems(pk, "BOOKMARK#")).map((item) => item.questionId));
        questions = questions.filter((item) => bookmarked.has(item.questionId));
      } else if (filter === "incorrect" || filter === "unanswered") {
        const progress = new Map((await getUserItems(pk, "PROGRESS#")).map((item) => [item.questionId, item]));
        questions = questions.filter((item) => filter === "unanswered" ? !progress.has(item.questionId) : progress.get(item.questionId)?.lastCorrect === false);
      }
      for (let index = questions.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [questions[index], questions[other]] = [questions[other], questions[index]];
      }
      return reply(200, { items: questions.slice(0, 100).map(questionView) });
    }

    if (route === "POST /questions/{questionId}/grade") {
      if (!safeQuestionId(questionId)) return reply(400, { message: "問題IDが正しくありません。" });
      const body = parseBody(event);
      if (!body || !["A", "B"].includes(body.subject)) return reply(400, { message: "回答が正しくありません。" });
      const bankPk = "BANK#" + questionBankId + "#" + body.subject;
      const [questionResult, answerResult] = await Promise.all([
        db.send(new GetCommand({ TableName: questionTableName, Key: { PK: bankPk, SK: "QUESTION#" + questionId } })),
        db.send(new GetCommand({ TableName: questionTableName, Key: { PK: bankPk, SK: "ANSWER#" + questionId } })),
      ]);
      const question = questionResult.Item;
      const answer = answerResult.Item;
      if (!question || !answer) return reply(404, { message: "問題が見つかりません。" });
      const correct = gradeAnswer(question, answer, body.answer);
      await db.send(new UpdateCommand({
        TableName: tableName, Key: { PK: pk, SK: "PROGRESS#" + questionId },
        UpdateExpression: "SET questionId = :questionId, subject = :subject, category = :category, lastCorrect = :correct, lastAnsweredAt = :now ADD attempts :one",
        ExpressionAttributeValues: { ":questionId": questionId, ":subject": body.subject, ":category": question.category, ":correct": correct, ":now": new Date().toISOString(), ":one": 1 },
      }));
      return reply(200, { correct, correctIndex: answer.kind === "CHOICE" ? answer.correctIndex : undefined, modelAnswer: answer.modelAnswer, explanation: answer.explanation, source: question.source });
    }

    if (route === "GET /mock/{subject}/active") {
      if (!["A", "B"].includes(subjectParam)) return reply(400, { message: "科目が正しくありません。" });
      const result = await db.send(new GetCommand({ TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) } }));
      return reply(200, { active: result.Item ? await activeView(result.Item) : null });
    }

    if (route === "POST /mock/{subject}/start") {
      if (!["A", "B"].includes(subjectParam)) return reply(400, { message: "科目が正しくありません。" });
      const body = parseBody(event);
      if (!body) return reply(400, { message: "開始条件が正しくありません。" });
      const existing = await db.send(new GetCommand({ TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) } }));
      if (existing.Item) return reply(409, { message: "未完了の模擬テストがあります。" });
      let questions = await getBankQuestions(subjectParam);
      let selectedCategories = [];
      const configuredQuestionCount = subjectParam === "A" ? 80 : 5;
      if (subjectParam === "A") {
        for (let index = questions.length - 1; index > 0; index -= 1) {
          const other = Math.floor(Math.random() * (index + 1));
          [questions[index], questions[other]] = [questions[other], questions[index]];
        }
        questions = questions.slice(0, 80);
        if (questions.length !== 80) return reply(409, { message: "科目A模擬テストには80問必要です。問題データを確認してください。" });
      } else {
        selectedCategories = Array.isArray(body.selectedCategories) ? [...new Set(body.selectedCategories)] : [];
        if (selectedCategories.length !== 4 || selectedCategories.some((field) => !optionalBFields.includes(field))) {
          return reply(400, { message: "科目Bは選択分野を4つ指定してください。" });
        }
        const categories = ["情報セキュリティ", ...selectedCategories];
        questions = categories.map((category) => questions.find((question) => question.category === category)).filter(Boolean);
        if (questions.length !== 5) return reply(409, { message: "選択した分野の問題が不足しています。" });
      }
      if (questions.length === 0) return reply(409, { message: "模擬テスト用の問題がありません。" });
      const now = new Date().toISOString();
      const item = {
        PK: pk, SK: activeKey(subjectParam), recordType: "ACTIVE_MOCK", subject: subjectParam,
        questionIds: questions.map((question) => question.questionId), answers: {}, remainingSeconds: mockDurationSeconds,
        startedAt: now, updatedAt: now, selectedCategories, configuredQuestionCount,
      };
      await db.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: "attribute_not_exists(PK)" }));
      return reply(201, { active: await activeView(item) });
    }

    if (route === "PUT /mock/{subject}/active") {
      if (!["A", "B"].includes(subjectParam)) return reply(400, { message: "科目が正しくありません。" });
      const body = parseBody(event);
      const current = await db.send(new GetCommand({ TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) } }));
      if (!current.Item) return reply(404, { message: "未完了の模擬テストがありません。" });
      const answers = sanitizeMockAnswers(body?.answers, current.Item.questionIds);
      if (!answers) return reply(400, { message: "回答データが正しくありません。" });
      const remainingSeconds = Math.min(mockDurationSeconds, Math.max(0, Math.trunc(Number(body.remainingSeconds) || 0)));
      const updatedAt = new Date().toISOString();
      await db.send(new UpdateCommand({
        TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) },
        UpdateExpression: "SET answers = :answers, remainingSeconds = :remaining, updatedAt = :updatedAt",
        ExpressionAttributeValues: { ":answers": answers, ":remaining": remainingSeconds, ":updatedAt": updatedAt },
      }));
      return reply(200, { saved: true, updatedAt });
    }

    if (route === "DELETE /mock/{subject}/active") {
      if (!["A", "B"].includes(subjectParam)) return reply(400, { message: "科目が正しくありません。" });
      await db.send(new DeleteCommand({ TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) } }));
      return { statusCode: 204 };
    }

    if (route === "POST /mock/{subject}/submit") {
      if (!["A", "B"].includes(subjectParam)) return reply(400, { message: "科目が正しくありません。" });
      const activeResult = await db.send(new GetCommand({ TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) } }));
      const active = activeResult.Item;
      if (!active) return reply(404, { message: "提出する模擬テストがありません。" });
      const bankPk = "BANK#" + questionBankId + "#" + subjectParam;
      const keys = active.questionIds.flatMap((id) => [
        { PK: bankPk, SK: "QUESTION#" + id }, { PK: bankPk, SK: "ANSWER#" + id },
      ]);
      const bankItems = await batchGet(questionTableName, keys);
      const questions = new Map(bankItems.filter((item) => item.recordType === "QUESTION").map((item) => [item.questionId, item]));
      const answers = new Map(bankItems.filter((item) => item.recordType === "ANSWER").map((item) => [item.questionId, item]));
      const results = active.questionIds.map((id) => {
        const question = questions.get(id);
        const answer = answers.get(id);
        const hasAnswer = Object.prototype.hasOwnProperty.call(active.answers ?? {}, id) && String(active.answers[id]).trim() !== "";
        const correct = Boolean(hasAnswer && question && answer && gradeAnswer(question, answer, active.answers[id]));
        return {
          questionId: id, userAnswer: hasAnswer ? active.answers[id] : null, correct,
          correctIndex: answer?.kind === "CHOICE" ? answer.correctIndex : undefined,
          modelAnswer: answer?.modelAnswer ?? "", explanation: answer?.explanation ?? "", source: question?.source,
          question: question ? questionView(question) : null,
        };
      });
      const correctCount = results.filter((result) => result.correct).length;
      const effectiveRemaining = Math.max(0, active.remainingSeconds - Math.max(0, Math.floor((Date.now() - Date.parse(active.updatedAt)) / 1000)));
      const durationSeconds = mockDurationSeconds - effectiveRemaining;
      const detailItems = results.map(({ question, ...result }) => result);
      const session = await saveSession(pk, { subject: subjectParam, mode: "MOCK", answeredCount: active.questionIds.length, correctCount, durationSeconds }, detailItems);
      const progressRequests = results.filter((result) => result.userAnswer !== null).map((result) => ({ PutRequest: { Item: {
        PK: pk, SK: "PROGRESS#" + result.questionId, questionId: result.questionId, subject: subjectParam,
        category: result.question?.category ?? "", lastCorrect: result.correct, lastAnsweredAt: new Date().toISOString(), attempts: 1,
      } } }));
      await batchWrite(tableName, progressRequests);
      await db.send(new DeleteCommand({ TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) } }));
      return reply(200, { session: sessionView(session), results });
    }

    if (route === "GET /bookmarks") {
      const items = await getUserItems(pk, "BOOKMARK#");
      return reply(200, { items: items.slice(0, 100).map(bookmarkView) });
    }
    if (route === "PUT /bookmarks/{questionId}") {
      if (!safeQuestionId(questionId)) return reply(400, { message: "問題IDが正しくありません。" });
      const body = parseBody(event);
      if (!body) return reply(400, { message: "リクエスト本文が正しくありません。" });
      const item = { PK: pk, SK: "BOOKMARK#" + questionId, questionId, subject: body.subject === "B" ? "B" : "A", category: String(body.category ?? "").slice(0, 80), createdAt: new Date().toISOString() };
      await db.send(new PutCommand({ TableName: tableName, Item: item }));
      return reply(200, { item: bookmarkView(item) });
    }
    if (route === "DELETE /bookmarks/{questionId}") {
      if (!safeQuestionId(questionId)) return reply(400, { message: "問題IDが正しくありません。" });
      await db.send(new DeleteCommand({ TableName: tableName, Key: { PK: pk, SK: "BOOKMARK#" + questionId } }));
      return { statusCode: 204 };
    }
    if (route === "GET /history") {
      const now = Math.floor(Date.now() / 1000);
      const items = (await getUserItems(pk, "SESSION#")).filter((item) => item.recordType === "SESSION_META" && item.expiresAt > now).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return reply(200, { items: items.slice(0, 50).map(sessionView) });
    }
    if (route === "DELETE /history") return reply(200, { deletedCount: await deleteUserItems(pk, "SESSION#") });
    if (route === "DELETE /account-data") return reply(200, { deletedCount: await deleteUserItems(pk) });
    if (route === "POST /sessions") {
      const body = parseBody(event);
      if (!body || !["A", "B"].includes(body.subject) || !["QUIZ", "MOCK"].includes(body.mode) || Number(body.answeredCount) < 1) return reply(400, { message: "学習結果が正しくありません。" });
      return reply(201, { item: sessionView(await saveSession(pk, body)) });
    }
    return reply(404, { message: "APIが見つかりません。" });
  } catch (error) {
    if (error?.name === "ConditionalCheckFailedException") return reply(409, { message: "未完了の模擬テストがあります。" });
    console.error("request_failed", { route, name: error?.name });
    return reply(500, { message: "サーバーでエラーが発生しました。" });
  }
};
`;

export const apiHandlerCode = minify(apiHandlerSource);
