export const apiHandlerCode = String.raw`
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("node:crypto");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.USER_LEARNING_TABLE;

const reply = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const safeQuestionId = (value) => typeof value === "string" && /^[A-Za-z0-9_.#-]{1,120}$/.test(value);
const parseBody = (event) => {
  try { return event.body ? JSON.parse(event.body) : {}; }
  catch { return null; }
};

exports.handler = async (event) => {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub) return reply(401, { message: "認証が必要です。" });

  const pk = "USER#" + sub;
  const route = event.routeKey;
  const questionId = event.pathParameters?.questionId;

  try {
    if (route === "GET /bookmarks") {
      const result = await db.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": pk, ":prefix": "BOOKMARK#" },
        ScanIndexForward: false,
        Limit: 100,
      }));
      return reply(200, { items: result.Items ?? [] });
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
      return reply(200, { item });
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
      return reply(200, { items: (result.Items ?? []).slice(0, 50) });
    }

    if (route === "POST /sessions") {
      const body = parseBody(event);
      if (!body || !["A", "B"].includes(body.subject) || !["QUIZ", "MOCK"].includes(body.mode)) {
        return reply(400, { message: "学習結果が正しくありません。" });
      }
      const now = new Date();
      const id = randomUUID();
      const item = {
        PK: pk,
        SK: "SESSION#" + now.toISOString() + "#" + id + "#META",
        recordType: "SESSION_META",
        sessionId: id,
        subject: body.subject,
        mode: body.mode,
        answeredCount: Math.max(0, Number(body.answeredCount) || 0),
        correctCount: Math.max(0, Number(body.correctCount) || 0),
        scoreRate: Math.max(0, Math.min(100, Number(body.scoreRate) || 0)),
        durationSeconds: Math.max(0, Number(body.durationSeconds) || 0),
        createdAt: now.toISOString(),
        expiresAt: Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60,
      };
      await db.send(new PutCommand({ TableName: tableName, Item: item }));
      return reply(201, { item });
    }

    return reply(404, { message: "APIが見つかりません。" });
  } catch (error) {
    console.error("request_failed", { route, name: error?.name });
    return reply(500, { message: "サーバーでエラーが発生しました。" });
  }
};
`;
