# BD Widget Manager

Manage your Brilliant Directories website widgets using Claude Code.

---

## Prerequisites

- A **Claude Max** subscription (includes Claude Code)
- **Claude Code** installed — download at https://claude.ai/download
- Your **BD API key** (from BD Admin → API settings)
- Your **BD site URL** (e.g. `https://yoursite.brilliantdirectories.com`)

---

## Setup

### Step 1 — Get the project

Clone this repo or download it as a ZIP and put it somewhere on your computer (e.g. your Desktop or Documents folder).

### Step 2 — Set your environment variables

These store your API credentials securely without hardcoding them in any file.

---

#### Windows

1. Press the **Windows key**, type **environment variables**, and click **"Edit the system environment variables"**
2. Click **"Environment Variables..."** near the bottom
3. Under **"System variables"**, click **"New..."** and add each variable:

   | Variable name | Variable value |
   |---------------|----------------|
   | `BD_API_KEY`  | your API key   |
   | `BD_SITE_URL` | `https://yoursite.com` |

4. Click **OK** on both dialogs to save
5. **Restart Claude Code** — it reads environment variables at launch

---

#### Mac

1. Open **Terminal** (search for it in Spotlight with `⌘ Space`)
2. Run this command to open your shell config file:
   ```
   open -e ~/.zshenv
   ```
   If TextEdit opens an empty file, that's fine — it's creating a new one.

3. Add these two lines to the file:
   ```
   export BD_API_KEY="your-api-key-here"
   export BD_SITE_URL="https://yoursite.com"
   ```

4. Save and close the file
5. In Terminal, run:
   ```
   source ~/.zshenv
   ```
6. **Restart Claude Code** so it picks up the new variables

---

### Step 3 — Open the project in Claude Code

1. Open Claude Code
2. Choose **"Open folder..."** and select the `BD Widget Manager` folder (wherever you put it in Step 1)
3. Claude will automatically read the project instructions and list your available widgets

That's it — Claude handles the rest from there.

---

## How it works

At the start of each session, Claude will:
1. List all your available widgets so you know what exists
2. Walk you through any edits safely: fetch → review → confirm → push
3. Remind you to clear your BD site cache after any change

You will always be asked to confirm before anything is pushed to your live site.

---

## Important notes

- **Never delete widgets** — this is disabled in the workflow
- **Always clear your BD cache** after a widget update (BD Admin → cache refresh tool)
- Your API key is stored in your system, not in any project file — it's safe to share this folder
