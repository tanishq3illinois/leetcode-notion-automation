import { LeetCode, Credential, Submission } from "leetcode-query";

let prev_submissions: Submission[] = [];

export const initLeetCode = async () => {
  const credential = new Credential();
  const session = process.env.LEETCODE_SESSION_COOKIE?.trim() ?? "";
  const envCsrf = process.env.LEETCODE_CSRF_TOKEN?.trim();

  if (!session) {
    console.warn(
      "Warning: LEETCODE_SESSION_COOKIE is not set. LeetCode requests will likely fail."
    );
  }

  credential.session = session;
  if (envCsrf) {
    credential.csrf = envCsrf;
  }

  const hasProvidedTokens = Boolean(session && envCsrf);
  if (!hasProvidedTokens) {
    try {
      await credential.init(session);
    } catch (err) {
      console.warn(
        "Failed to auto-initialize LeetCode credentials; proceeding with configured session/csrf.",
        err && (err as Error).message ? (err as Error).message : err
      );
      credential.session = session;
      if (envCsrf) {
        credential.csrf = envCsrf;
      }
    }
  }

  if (!credential.csrf) {
    console.warn(
      "Warning: LEETCODE_CSRF_TOKEN is not set. LeetCode requests may require a valid csrf token."
    );
  }

  return new LeetCode(credential);
};

/**
 * Fetch recent submissions in a robust way.
 * Prefer calling `recent_submissions(username, limit)` when a username is available,
 * otherwise fall back to `submissions()` and handle different response shapes.
 *
 * @param leetcode LeetCode client
 * @param username optional LeetCode username (if available)
 * @param limit number of submissions to fetch (when supported)
 */
export const getRecentSubmissions = async (
  leetcode: LeetCode,
  username?: string,
  limit = 4000
) : Promise<Submission[]> => {
  // If a username is provided, prefer the username-scoped endpoint which is more stable
  if (username) {
    try {
      // The library exposes recent_submissions(username, limit)
      const recent: any = await (leetcode as any).recent_submissions(username, limit);
      if (Array.isArray(recent)) return recent as Submission[];
      // Some responses may wrap the list; try common shapes
      if (recent && Array.isArray(recent.recentSubmissionList)) return recent.recentSubmissionList as Submission[];
      if (recent && Array.isArray(recent.submissionList)) return recent.submissionList as Submission[];
      // If shape unknown, return empty array but log the debug info
      console.warn("Unexpected shape from recent_submissions():", recent);
      return [];
    } catch (err) {
      console.warn("recent_submissions(username) failed:", err);
      // Fall through to the generic submissions() below as a best-effort fallback
    }
  }

  // Generic fallback: use submissions() and handle a few possible shapes safely
  try {
    const resp: any = await (leetcode as any).submissions({ limit, offset: 0 });

    // If the library returns an array directly
    if (Array.isArray(resp)) return resp as Submission[];

    // If the library returns an object with submissionList.submissions
    if (resp && resp.submissionList && Array.isArray(resp.submissionList.submissions)) {
      return resp.submissionList.submissions as Submission[];
    }

    // If the library returns a different wrapper (some versions), try common keys
    if (resp && Array.isArray(resp.recentSubmissionList)) return resp.recentSubmissionList as Submission[];

    // Unknown shape — log and return empty array rather than throwing a raw TypeError
    console.error("Unexpected response shape from leetcode.submissions():", resp);
    return [];
  } catch (err) {
    console.error("Error fetching submissions from leetcode-query:", err);
    return [];
  }
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
