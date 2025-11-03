import express from "express";
import * as leetcode from "./leetcode";
import * as notion from "./notion";
import dotenv from "dotenv";
import path from "path";
import cron from "node-cron";

// Load environment variables from multiple possible locations locally
dotenv.config(); // current working directory (e.g., server/)
dotenv.config({ path: path.resolve(__dirname, "../.env") }); // project root (leetcode-notion-automation/.env)
dotenv.config({ path: path.resolve(__dirname, "../../.env") }); // monorepo root if applicable

const app = express();
const port = 5050;

const notion_connection = notion.initNotion();
const lc_connection_promise = (async () => {
  const lc = await leetcode.initLeetCode();
  return lc;
})();

// Refactor the update logic into its own function for reusability
async function updateLeetcodeSubmissions() {
  const lc_connection = await lc_connection_promise;
  let submissions = await leetcode.getRecentSubmissions(lc_connection);
  submissions = leetcode.getNewSubmissions(submissions);
  submissions = leetcode.getAcceptedSubmissions(submissions);
  submissions = leetcode.removeDuplicateSubmissions(submissions);
  submissions = await notion.removeAlreadySubmittedProblems(
    notion_connection,
    lc_connection,
    process.env.NOTION_DATABASE_ID ?? "",
    submissions
  );

  await notion.updateDatabaseWithSubmissions(
    notion_connection,
    lc_connection,
    submissions
  );

  // Log or handle the submissions update result
  console.log("Submissions updated successfully.", submissions);
}

// Schedule the update function to run every 5 minutes
cron.schedule("*/5 * * * *", updateLeetcodeSubmissions);

app.get("/update", async (req, res) => {
  await updateLeetcodeSubmissions();
  res.json({ message: "Update initiated." });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
