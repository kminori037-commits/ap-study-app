import { Script } from "node:vm";
import { apiHandlerCode, apiHandlerSource } from "../lib/api-handler";

test("Lambda inline handler is valid JavaScript", () => {
  expect(() => new Script(apiHandlerCode, { filename: "index.js" })).not.toThrow();
});

test("mock answers are graded only by the Lambda handler", () => {
  expect(apiHandlerSource).toContain('route === "POST /mock/{subject}/submit"');
  expect(apiHandlerSource).toContain('SK: "ANSWER#" + id');
  expect(apiHandlerSource).toContain('await db.send(new DeleteCommand({ TableName: tableName, Key: { PK: pk, SK: activeKey(subjectParam) } }))');
});
