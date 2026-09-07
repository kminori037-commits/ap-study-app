import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const options = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);

process.env.AWS_PROFILE = options.profile || "ap-study-dev";
process.env.AWS_SDK_LOAD_CONFIG = "1";

const client = new DynamoDBClient({ region: options.region || "ap-northeast-1" });
const tableName = options.table || "ap-study-question-bank";
const expected = {
  A: { QUESTION: 800, ANSWER: 800 },
  B: { QUESTION: 108, ANSWER: 108 },
};

async function readItems(subject, recordType) {
  const items = [];
  let exclusiveStartKey;
  do {
    const response = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": { S: `BANK#ORIGINAL_MVP#${subject}` },
          ":prefix": { S: `${recordType}#` },
        },
        ProjectionExpression: "PK, SK, #source",
        ExpressionAttributeNames: { "#source": "source" },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    items.push(...(response.Items || []));
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

let failed = false;
for (const subject of ["A", "B"]) {
  for (const recordType of ["QUESTION", "ANSWER"]) {
    const items = await readItems(subject, recordType);
    const expectedCount = expected[subject][recordType];
    const sourceCount = items.filter((item) => item.source !== undefined).length;
    console.log(`${subject} ${recordType}: ${items.length} (source fields: ${sourceCount})`);
    if (items.length !== expectedCount) failed = true;
    if (recordType === "QUESTION" && sourceCount !== 0) failed = true;
  }
}

if (failed) {
  throw new Error("Question bank verification failed.");
}
console.log("Question bank verification passed.");
