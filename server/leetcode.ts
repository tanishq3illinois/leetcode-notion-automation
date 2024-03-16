import { LeetCode, Credential, Submission } from "leetcode-query";

let prev_submissions: Submission[] = [];

export const initLeetCode = async () => {
  const credential = new Credential();
  credential.init(process.env.LEETCODE_SESSION_COOKIE ?? "");
  return new LeetCode(credential);
};

export const getRecentSubmissions = async (leetcode: LeetCode) => {
  return await leetcode.submissions({ limit: 4000, offset: 0 });
};

/**
 * The function `getNewSubmissions` filters out submissions that have already been processed and
 * returns only the new submissions.
 * @param {Submission[]} submissions - The `submissions` parameter is an array of `Submission` objects.
 * @returns an array of new submissions.
 */
export const getNewSubmissions = (submissions: Submission[]) => {
  let new_submissions: Submission[] = submissions;

  if (prev_submissions.length !== 0) {
    new_submissions = submissions.filter(
      (s) => !prev_submissions.some((ps) => ps.timestamp === s.timestamp)
    );
  }
  prev_submissions = submissions;
  return new_submissions;
};

export const getAcceptedSubmissions = (submissions: Submission[]) => {
  return submissions.filter((s) => s.statusDisplay === "Accepted");
};

/**
 * The function removes duplicate submissions from an array based on the titleSlug and keeps the one
 * with the latest timestamp.
 * @param {Submission[]} submissions - An array of objects representing submissions. Each submission
 * object has the following properties:
 * @returns The function `removeDuplicateSubmissions` returns an array of `Submission` objects.
 */
export const removeDuplicateSubmissions = (
  submissions: Submission[]
): Submission[] => {
  const uniqueSubmissions: Submission[] = [];

  submissions.forEach((submission) => {
    const existingSubmission = uniqueSubmissions.find(
      (s) => s.titleSlug === submission.titleSlug
    );
    // If the submission does not exist in the array or if the submission has a more recent timestamp
    // (Note: this probably won't happen as the submissions are sorted by timestamp)
    if (
      !existingSubmission ||
      submission.timestamp > existingSubmission.timestamp
    ) {
      if (existingSubmission) {
        uniqueSubmissions.splice(
          uniqueSubmissions.indexOf(existingSubmission),
          1
        );
      }
      uniqueSubmissions.push(submission);
    }
  });

  return uniqueSubmissions;
};

/**
 * The function "getProblemFromSubmission" takes a LeetCode object and a Submission object as
 * parameters, and returns the problem associated with the submission.
 * @param {LeetCode} leetcode - The `leetcode` parameter is an instance of the `LeetCode` class, which
 * is used to interact with the LeetCode API and perform operations related to problems, submissions,
 * etc.
 * @param {Submission} submission - The `submission` parameter is an object that represents a
 * submission made by the user on LeetCode
 * @returns a promise that resolves to the problem object.
 */
export const getProblemFromSubmission = async (
  leetcode: LeetCode,
  submission: Submission
) => {
  const problem = await leetcode.problem(submission.titleSlug);
  return problem;
};
