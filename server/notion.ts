import { Client } from "@notionhq/client";
import { LeetCode, Submission } from "leetcode-query";
import { getProblemFromSubmission } from "./leetcode";

export const initNotion = () => {
  const conn = new Client({
    auth: process.env.NOTION_TOKEN,
  });
  return conn;
};

/**
 * Updates a Notion database with information from a
 * LeetCode submission.
 * @param {Client} notion - The `notion` parameter is an instance of the Notion client, which is used
 * to interact with the Notion API and perform operations on Notion pages.
 * @param {string} notion_database_id - The `notion_database_id` parameter is the ID of the Notion
 * database where you want to update the submission. It is a string value that uniquely identifies the
 * database in Notion.
 * @param {LeetCode} lc - The `lc` parameter is an instance of the `LeetCode` class, which is used to
 * interact with the LeetCode API and retrieve information about problems and submissions.
 * @param {Submission} submission - The `submission` parameter is an object that represents a
 * submission made by a user on a coding platform. It contains information such as the submission ID,
 * timestamp, and code.
 */
const updateDatabaseWithSubmission = async (
  notion: Client,
  lc: LeetCode,
  submission: Submission
) => {
  const problem = await getProblemFromSubmission(lc, submission);
  // Try to fetch full submission details (code). If it fails, continue without code.
  let submission_detail: any = { code: "" };
  try {
    if (submission && (submission as any).id) {
      submission_detail = await (lc as any).submission((submission as any).id);
    } else {
      throw new Error("submission.id is not available");
    }
  } catch (err) {
    console.warn("Could not fetch submission detail for", (submission as any).id, err && (err as any).message ? (err as any).message : err);
    submission_detail = { code: "" };
  }

  const createPage = async () => {
    try {
      const database_id = process.env.NOTION_DATABASE_ID ?? "";
      const parent = { type: "database_id" as const, database_id };

      // Build properties object and include Date only if valid
      const properties: any = {
        "Problem Number": {
          type: "number",
          number: parseInt(problem.questionFrontendId),
        },
        "Problem Name": {
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: problem.title,
              },
            },
          ],
        },
        Topics: {
          type: "multi_select",
          multi_select: problem.topicTags.map((tag) => ({ name: tag.name })),
        },
        Difficulty: {
          type: "select",
          select: {
            name: problem.difficulty,
            color:
              problem.difficulty === "Easy"
                ? "green"
                : problem.difficulty === "Medium"
                ? "orange"
                : "red",
          },
        },
        Link: {
          type: "url",
          url: `https://leetcode.com/problems/${problem.titleSlug}/`,
        },
        // Map completion status into your DB's `Importance` select property
        Importance: {
          type: "select",
          select: {
            name: "Done",
            color: "green",
          },
        },
        // Small notes field to capture submission status and language
        notes: {
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: {
                content: `Status: ${((submission as any).statusDisplay || "")} • Lang: ${((submission as any).lang || "")}`,
              },
            },
          ],
        },
      };

      // Normalize timestamp and attach Date property only when valid
      const ts = Number((submission as any).timestamp);
      let dateStart: string | undefined = undefined;
      if (Number.isFinite(ts) && ts !== 0) {
        const millis = ts < 1e12 ? ts * 1000 : ts;
        const d = new Date(millis);
        if (!isNaN(d.getTime())) {
          dateStart = d.toISOString();
        } else {
          console.warn("Could not parse submission.timestamp into a valid date:", (submission as any).timestamp);
        }
      } else {
        console.warn("Invalid or missing submission.timestamp:", (submission as any).timestamp);
      }

      if (dateStart) {
        properties.Date = { type: "date", date: { start: dateStart } };
      }

      const response = await notion.pages.create({ parent, properties,
  children: [
          {
            object: "block",
            type: "code",
            code: {
              caption: [],
              rich_text: [
                submission_detail ? {
                  type: "text",
                  text: {
                    content: submission_detail.code,
                  },
                } : {
                  type: "text",
                  text: {
                    content: "Submission detail not available.",
                  },
                },
              ],
              language: "python",
            },
          },
        ],
      });

      console.log("Page created:", response);
    } catch (error: any) {
      console.error("Error creating page:", error);
      if (error.code === "rate_limited") {
        // Retry after a delay using exponential backoff
        const delay = Math.pow(2, error.retryAfterSeconds) * 1000;
        console.log(`Retrying after ${delay}ms...`);
        setTimeout(createPage, delay);
      } else if (error.code === "validation_error") {
        console.error("Validation Error encountered");
        console.error(error);
      }
    }
  };

  await createPage();
};

/**
 * The function updates a database in Notion with submissions from LeetCode.
 * @param {Client} notion - The `notion` parameter is an instance of the Notion client, which is used
 * to interact with the Notion API and perform operations on the Notion database.
 * @param {LeetCode} lc - LeetCode API client used to fetch information about the submission.
 * @param {Submission[]} submissions - The `submissions` parameter is an array of objects representing
 * submissions. Each submission object should have the following properties:
 */
export const updateDatabaseWithSubmissions = async (
  notion: Client,
  lc: LeetCode,
  submissions: Submission[]
) => {
  for (const submission of submissions) {
    try {
      await updateDatabaseWithSubmission(notion, lc, submission);
    } catch (err) {
      console.error(`Failed to create Notion page for ${submission.titleSlug}:`, err);
    }
  }
};

/**
 * The function `getDatabaseEntriesByProblemNumber` retrieves database entries from a Notion database
 * based on a specified problem number.
 * @param {Client} notion - The `notion` parameter is an instance of the Notion client, which is used
 * to interact with the Notion API and perform operations on the database.
 * @param {string} database_id - The `database_id` parameter is the unique identifier of the database
 * in Notion. It is used to specify which database to query for entries.
 * @param {number} problem_number - The `problem_number` parameter is the number that you want to use
 * to filter the database entries. It is used in the filter condition to find entries that have a
 * property called "Problem Number" with a value equal to the provided `problem_number`.
 * @returns the results of the query made to the Notion database.
 */
export const getDatabaseEntriesByProblemNumber = async (
  notion: Client,
  problem_number: number
) => {
  const database_id = process.env.NOTION_DATABASE_ID ?? "";
  const response = await notion.databases.query({
    database_id,
    filter: {
      property: "Problem Number",
      number: {
        equals: problem_number,
      },
    },
  });
  return response.results;
};

/**
 * The function removes already submitted problems from a list of submissions.
 * @param {Client} notion - The `notion` parameter is an instance of the Notion client, which is used
 * to interact with the Notion API and perform operations on the Notion database.
 * @param {LeetCode} lc - The `lc` parameter is an instance of the `LeetCode` class, which is used to
 * interact with the LeetCode API and retrieve information about problems and submissions.
 * @param {string} database_id - The `database_id` parameter is the ID of the Notion database where the
 * problems are stored.
 * @param {Submission[]} submissions - An array of submission objects. Each submission object
 * represents a problem submission and contains information such as the problem number, submission
 * date, and submission status.
 * @returns an array of submissions that have not already been submitted.
 */
export const removeAlreadySubmittedProblems = async (
  notion: Client,
  lc: LeetCode,
  submissions: Submission[]
) => {
  const new_submissions: Submission[] = [];
  for (const submission of submissions) {
    const problem = await getProblemFromSubmission(lc, submission);
    const problemNumber = parseInt(problem.questionFrontendId);
    const entries = await getDatabaseEntriesByProblemNumber(notion, problemNumber);
    console.log(`Checked Notion for problem ${problemNumber} (${submission.titleSlug}) — entries found: ${entries.length}`);
    if (entries.length === 0) {
      new_submissions.push(submission);
    } else {
      // Optionally log the IDs of existing pages for debugging
      try {
        const ids = entries.map((e: any) => e.id).slice(0, 5);
        console.log(`Existing page ids for problem ${problemNumber}:`, ids);
      } catch (e) {}
    }
  }
  return new_submissions;
};
