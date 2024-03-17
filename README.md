# LeetCode Notion Automation

A simple Express+Node server that uses the open-source [LeetCode Query API](https://jacoblin.cool/LeetCode-Query/index.html) and the [Notion JavaScript SDK](https://developers.notion.com/) to streamline the process of logging and tracking completed LeetCode problems by uploading them into a Notion database.

## Summary

Currently imports data about LeetCode Problem Submissions into a Notion database with the following schema:

```js
{
    "Problem Number": "1", // number
    "Problem Name": "Two Sum", // title
    "Topics": "Array, Hash Map", // multi_select
    "Difficulty": "Easy", // select
    "Link": "https://leetcode.com/problems/two-sum/", // url
    "Status": "Done" // select
    "Date": "2024-03-16" // date
}
```

Each entry in the database will also have page content that contains the code from the most recent submission for that particular LeetCode problem.

For the server to work, you will need to create an internal integration in Notion and get the token, as well as the database ID of the database you want to add the problems to. You will also need to have your `LEETCODE_SESSION_COOKIE` as requied by the LeetCode Query API (see [here](https://jacoblin.cool/LeetCode-Query/index.html)).

## Features Checklist

- [x] Leetcode problem completion tracking
- [x] Notion database integration
- [ ] Periodic updates using a cron job
- [ ] Automatically update problem status
- [ ] Track your progress and statistics
- [ ] Customizable settings and configurations
- [ ] Frontend UI

## Usage

To run this program, first clone this repository:

```
git clone https://github.com/taimurshaikh/leetcode-notion-automation
```

Currently, only the backend API is implemented - frontend is a WIP. So cd into the `server` folder and install the dependencies:

```
cd server
npm install
```

You will need the following environment variables to successfully run the program:

```bash
# Go to https://leetcode.com, login, inspect the page, go to the Application tab, and copy the named LEETCODE_SESSION and csrftoken into the following env vars
LEETCODE_SESSION_COOKIE
LEETCODE_CSRF_TOKEN

# Go to https://notion.so/my-integrations to create a new internal integration and get the token
NOTION_TOKEN

# Go to the Notion database you want to add the problems to and get the database ID from the URL
NOTION_DATABASE_ID
```

Make sure that your Notion Database is shared with the Notion Integration that you created to get the `NOTION_TOKEN`, and then run the dev server:

```
npm run dev
```

Ensure you run this in the `server` directory. The server will be running on `http://localhost:5050`. There is currently only one endpoint: `/update`. If you run this with an empty Notion database, you should see your most recent accepted submissions for all problems you've completed being added to the database. If the DB is not empty, only non-duplicate problems will be added.

## Feedback

I am open to any and all feedback/ suggested enhancements - feel free to submit a PR or open an issue. Thanks for checking this out!

## Sources and Acknowledgements

LeetCode Query API: https://jacoblin.cool/LeetCode-Query/index.html
Notion JavaScript SDK: https://developers.notion.com/
The structure and outline of this README was inspired by user [Gbillington1's Notion x Schoology Integration](https://github.com/Gbillington1/Notion-Schoology-Integration)

```

```
