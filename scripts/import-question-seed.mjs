import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";

const options = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);

const profile = options.profile || "ap-study-dev";
const region = options.region || "ap-northeast-1";
const inputDirectory = path.resolve(options.input || "work/question-bank-seed");

process.env.AWS_PROFILE = profile;
process.env.AWS_SDK_LOAD_CONFIG = "1";

const client = new DynamoDBClient({ region });
const batchFiles = (await readdir(inputDirectory))
  .filter((fileName) => /^batch-\d+\.json$/.test(fileName))
  .sort();

if (batchFiles.length === 0) {
  throw new Error(`No seed batches found at ${inputDirectory}`);
}

let submitted = 0;
for (const batchFile of batchFiles) {
  const batchPath = path.join(inputDirectory, batchFile);
  const original = JSON.parse(await readFile(batchPath, "utf8"));
  let pending = original;
  let attempt = 0;

  while ((pending["ap-study-question-bank"] || []).length > 0) {
    let response;
    try {
      response = await client.send(
        new BatchWriteItemCommand({ RequestItems: pending }),
      );
    } catch (error) {
      if (error?.name !== "ProvisionedThroughputExceededException") {
        throw error;
      }
      attempt += 1;
      if (attempt >= 100) {
        throw new Error(`Throughput remained unavailable after 100 attempts for ${batchFile}`);
      }
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
      console.log(`Throughput wait for ${batchFile}: ${delay} ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    pending = response.UnprocessedItems || {};
    attempt += 1;

    if ((pending["ap-study-question-bank"] || []).length > 0) {
      if (attempt >= 100) {
        throw new Error(`Unprocessed items remained after 100 attempts for ${batchFile}`);
      }
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
      console.log(
        `Retrying ${pending["ap-study-question-bank"].length} items for ${batchFile} in ${delay} ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  submitted += original["ap-study-question-bank"].length;
  console.log(`Imported ${batchFile}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

console.log(`Imported ${submitted} question-bank items from ${batchFiles.length} batches.`);
