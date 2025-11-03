import dotenv from "dotenv";
import path from "path";
import * as leetcode from "./leetcode";
import * as notion from "./notion";

// Load env from common locations
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

(async () => {
  try {
    const lc = await leetcode.initLeetCode();
    const notionConn = notion.initNotion();
    const username = process.env.LEETCODE_USERNAME;

    let submissions = await leetcode.getRecentSubmissions(lc, username);
    submissions = leetcode.getNewSubmissions(submissions);
    submissions = leetcode.getAcceptedSubmissions(submissions);
    submissions = leetcode.removeDuplicateSubmissions(submissions);
    submissions = await notion.removeAlreadySubmittedProblems(notionConn, lc, submissions);

    await notion.updateDatabaseWithSubmissions(notionConn, lc, submissions);

    console.log("runUpdate finished. Submissions processed:", submissions.length);
    process.exit(0);
  } catch (err) {
    console.error("runUpdate failed:", err);
    process.exit(1);
  }
})();
