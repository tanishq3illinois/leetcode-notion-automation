import express from "express";
import * as leetcode from "./leetcode";
import * as notion from "./notion";
import dotenv from "dotenv";
import path from "path";
// import cron from "node-cron";

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
  // Prefer using an explicit username (from env) so we hit the username-scoped endpoint
  const username = process.env.LEETCODE_USERNAME;
  let submissions = await leetcode.getRecentSubmissions(lc_connection, username);
  console.log(`Fetched ${submissions.length} submissions from LeetCode`);
  if (submissions.length > 0) {
    console.log(
      "Sample submissions:",
      submissions.slice(0, 5).map((s: any) => ({ title: s.title, id: s.id, titleSlug: s.titleSlug, timestamp: s.timestamp }))
    );
  }
  submissions = leetcode.getNewSubmissions(submissions);
  submissions = leetcode.getAcceptedSubmissions(submissions);
  submissions = leetcode.removeDuplicateSubmissions(submissions);
  submissions = await notion.removeAlreadySubmittedProblems(
    notion_connection,
    lc_connection,
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

// Removed scheduled updates; trigger manually via /update

app.get("/update", async (req, res) => {
  // Respond immediately to avoid client timeouts; run in background
  res.json({ message: "Update started." });
  try {
    await updateLeetcodeSubmissions();
  } catch (error) {
    console.error("Manual update failed:", error);
  }
});

// Lookup the companies that have asked a given LeetCode problem by titleSlug
app.get("/problem/:titleSlug/companies", async (req, res) => {
  const titleSlug = req.params.titleSlug;
  try {
    const lc = await lc_connection_promise;
    const problem = await (lc as any).problem(titleSlug);
    const companies = notion.getCompaniesFromProblem(problem);
    const hasGoogle = companies.some((c) => c.toLowerCase() === "google");
    res.json({ titleSlug, companies, hasGoogle });
  } catch (err) {
    console.error("Error fetching problem companies:", err);
    res.status(500).json({ error: "Failed to fetch problem companies" });
  }
});

// Check whether the most recent accepted submissions are asked at Google
app.get("/submissions/check-google", async (req, res) => {
  try {
    const lc = await lc_connection_promise;
    const username = process.env.LEETCODE_USERNAME;
    let submissions = await leetcode.getRecentSubmissions(lc, username);
    submissions = leetcode.getNewSubmissions(submissions);
    submissions = leetcode.getAcceptedSubmissions(submissions);
    submissions = leetcode.removeDuplicateSubmissions(submissions);
    submissions = await notion.removeAlreadySubmittedProblems(notion_connection, lc, submissions);

    const results = [] as any[];
    for (const submission of submissions) {
      try {
        const problem = await (lc as any).problem(submission.titleSlug);
        const companies = notion.getCompaniesFromProblem(problem);
        const hasGoogle = companies.some((c) => c.toLowerCase() === "google");
        results.push({ titleSlug: submission.titleSlug, companies, hasGoogle });
      } catch (err) {
        results.push({ titleSlug: submission.titleSlug, error: String(err) });
      }
    }

    res.json({ count: results.length, results });
  } catch (err) {
    console.error("Error checking Google presence for submissions:", err);
    res.status(500).json({ error: "Failed to check Google presence for submissions" });
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
