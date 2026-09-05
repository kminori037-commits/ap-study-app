export const apiHandlerCode = String.raw`
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, BatchWriteCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("node:crypto");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.USER_LEARNING_TABLE;
const questionTableName = process.env.QUESTION_BANK_TABLE;
const questionBankId = process.env.QUESTION_BANK_ID;

const reply = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
  body: JSON.stringify(body),
});

const safeQuestionId = (value) => typeof value === "string" && /^[A-Za-z0-9_.#-]{1,120}$/.test(value);
const parseBody = (event) => {
  try { return event.body ? JSON.parse(event.body) : {}; }
  catch { return null; }
};
const bookmarkView = ({ questionId, subject, category, createdAt }) => ({
  questionId, subject, category, createdAt,
});
const sessionView = ({ sessionId, subject, mode, answeredCount, correctCount, scoreRate, durationSeconds, createdAt }) => ({
  sessionId, subject, mode, answeredCount, correctCount, scoreRate, durationSeconds, createdAt,
});
const questionView = ({ questionId, subject, group, category, prompt, choices, answerKind, source }) => ({
  questionId, subject, group, category, prompt, ...(choices ? { choices } : {}), answerKind, source,
});
const normalizeAnswer = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const getUserItems = async (pk, prefix) => {
  const result = await db.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": pk, ":prefix": prefix },
  }));
  return result.Items ?? [];
};
const deleteUserItems = async (pk, prefix) => {
  let lastKey;
  let deletedCount = 0;
  do {
    const names = prefix ? { "#pk": "PK", "#sk": "SK" } : { "#pk": "PK" };
    const values = prefix ? { ":pk": pk, ":prefix": prefix } : { ":pk": pk };
    const result = await db.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: prefix ? "#pk = :pk AND begins_with(#sk, :prefix)" : "#pk = :pk",
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ProjectionExpression: "PK, SK",
      ExclusiveStartKey: lastKey,
    }));
    const items = result.Items ?? [];
    for (let index = 0; index < items.length; index += 25) {
      const batch = items.slice(index, index + 25);
      let requests = batch.map((item) => ({ DeleteRequest: { Key: { PK: item.PK, SK: item.SK } } }));
      do {
        const response = await db.send(new BatchWriteCommand({
          RequestItems: { [tableName]: requests },
        }));
        requests = response.UnprocessedItems?.[tableName] ?? [];
      } while (requests.length > 0);
      deletedCount += batch.length;
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return deletedCount;
};

exports.handler = async (event) => {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub) return reply(401, { message: "認証が必要です。" });

  const pk = "USER#" + sub;
  const route = event.routeKey;
  const questionId = event.pathParameters?.questionId;
  console.info("request_received", { route });

  try {
    if (route === "GET /questions") {
      const subject = event.queryStringParameters?.subject;
      const category = event.queryStringParameters?.category ?? "全分野";
      const filter = event.queryStringParameters?.filter ?? "all";
      if (!["A", "B"].includes(subject)) return reply(400, { message: "科目が正しくありません。" });

      const result = await db.send(new QueryCommand({
        TableName: questionTableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": "BANK#" + questionBankId + "#" + subject, ":prefix": "QUESTION#" },
      }));
      let questions = (result.Items ?? []).filter((item) => category === "全分野" || item.category === category || item.group === category);

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

      const correct = answer.kind === "CHOICE"
        ? Number(body.answer) === answer.correctIndex
        : (answer.acceptedAnswers ?? []).some((accepted) => normalizeAnswer(accepted) === normalizeAnswer(body.answer));
      const now = new Date().toISOString();
      await db.send(new UpdateCommand({
        TableName: tableName,
        Key: { PK: pk, SK: "PROGRESS#" + questionId },
        UpdateExpression: "SET questionId = :questionId, subject = :subject, category = :category, lastCorrect = :correct, lastAnsweredAt = :now ADD attempts :one",
        ExpressionAttributeValues: {
          ":questionId": questionId,
          ":subject": body.subject,
          ":category": question.category,
          ":correct": correct,
          ":now": now,
          ":one": 1,
        },
      }));
      return reply(200, {
        correct,
        correctIndex: answer.kind === "CHOICE" ? answer.correctIndex : undefined,
        modelAnswer: answer.modelAnswer,
        explanation: answer.explanation,
        source: question.source,
      });
    }

    if (route === "GET /bookmarks") {
      const result = await db.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": pk, ":prefix": "BOOKMARK#" },
        ScanIndexForward: false,
        Limit: 100,
      }));
      return reply(200, { items: (result.Items ?? []).map(bookmarkView) });
    }

    if (route === "PUT /bookmarks/{questionId}") {
      if (!safeQuestionId(questionId)) return reply(400, { message: "問題IDが正しくありません。" });
      const body = parseBody(event);
      if (!body) return reply(400, { message: "リクエスト本文が正しくありません。" });
      const item = {
        PK: pk,
        SK: "BOOKMARK#" + questionId,
        questionId,
        subject: body.subject === "B" ? "B" : "A",
        category: String(body.category ?? "").slice(0, 80),
        createdAt: new Date().toISOString(),
      };
      await db.send(new PutCommand({ TableName: tableName, Item: item }));
      console.info("bookmark_saved", { questionId });
      return reply(200, { item: bookmarkView(item) });
    }

    if (route === "DELETE /bookmarks/{questionId}") {
      if (!safeQuestionId(questionId)) return reply(400, { message: "問題IDが正しくありません。" });
      await db.send(new DeleteCommand({ TableName: tableName, Key: { PK: pk, SK: "BOOKMARK#" + questionId } }));
      return { statusCode: 204 };
    }

    if (route === "GET /history") {
      const result = await db.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        FilterExpression: "recordType = :type AND expiresAt > :now",
        ExpressionAttributeValues: { ":pk": pk, ":prefix": "SESSION#", ":type": "SESSION_META", ":now": Math.floor(Date.now() / 1000) },
        ScanIndexForward: false,
        Limit: 100,
      }));
      return reply(200, { items: (result.Items ?? []).slice(0, 50).map(sessionView) });
    }

    if (route === "DELETE /history") {
      const deletedCount = await deleteUserItems(pk, "SESSION#");
      return reply(200, { deletedCount });
    }

    if (route === "DELETE /account-data") {
      const deletedCount = await deleteUserItems(pk);
      return reply(200, { deletedCount });
    }

    if (route === "POST /sessions") {
      const body = parseBody(event);
      if (!body || !["A", "B"].includes(body.subject) || !["QUIZ", "MOCK"].includes(body.mode)) {
        return reply(400, { message: "学習結果が正しくありません。" });
      }
      const answeredCount = Math.min(100, Math.max(0, Math.trunc(Number(body.answeredCount) || 0)));
      const correctCount = Math.min(answeredCount, Math.max(0, Math.trunc(Number(body.correctCount) || 0)));
      if (answeredCount === 0) return reply(400, { message: "解答数は1問以上にしてください。" });

      const now = new Date();
      const id = randomUUID();
      const item = {
        PK: pk,
        SK: "SESSION#" + now.toISOString() + "#" + id + "#META",
        recordType: "SESSION_META",
        sessionId: id,
        subject: body.subject,
        mode: body.mode,
        answeredCount,
        correctCount,
        scoreRate: Math.round((correctCount / answeredCount) * 1000) / 10,
        durationSeconds: Math.min(24 * 60 * 60, Math.max(0, Math.trunc(Number(body.durationSeconds) || 0))),
        createdAt: now.toISOString(),
        expiresAt: Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60,
      };
      await db.send(new PutCommand({ TableName: tableName, Item: item }));

      const sessions = await db.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": pk, ":prefix": "SESSION#" },
        ProjectionExpression: "PK, SK",
        ScanIndexForward: false,
        Limit: 100,
      }));
      for (const oldItem of (sessions.Items ?? []).slice(50)) {
        await db.send(new DeleteCommand({ TableName: tableName, Key: { PK: oldItem.PK, SK: oldItem.SK } }));
      }

      return reply(201, { item: sessionView(item) });
    }

    return reply(404, { message: "APIが見つかりません。" });
  } catch (error) {
    console.error("request_failed", { route, name: error?.name });
    return reply(500, { message: "サーバーでエラーが発生しました。" });
  }
};
`;
