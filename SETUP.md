# BD Claude Setup — Initial Configuration

This project manages Brilliant Directories widgets via their REST API. You need two environment variables to get started.

## Step 1: Get Your Credentials

1. Log into your Brilliant Directories admin panel
2. Navigate to **Developer Hub** → **API Documentation** (or **Settings** → **API Key**)
3. Copy your **API Key**
4. Note your **site URL** (e.g., `https://www.yoursite.com/`)

## Step 2: Set Environment Variables (Windows)

Open **PowerShell as Administrator** and run these commands:

```powershell
[System.Environment]::SetEnvironmentVariable("BD_API_KEY", "YOUR_API_KEY_HERE", "User")
[System.Environment]::SetEnvironmentVariable("BD_SITE_URL", "https://www.yoursite.com/", "User")
```

Replace:
- `YOUR_API_KEY_HERE` with the key from Step 1
- `https://www.yoursite.com/` with your site URL (must include `https://`, trailing slash, and `www.` if applicable)

**Important:** The URL must use `https://` and include the full domain. Examples:
- ✅ `https://www.example.com/`
- ✅ `https://example.com/`
- ❌ `http://example.com` (missing https and trailing slash)

## Step 3: Restart Claude Code

After setting the environment variables, close and reopen Claude Code so it picks up the new variables.

## Step 4: Verify Setup

Claude will automatically test the connection. You should see your widgets listed when you ask to "list widgets" or "render widgets".

---

## Troubleshooting

**"BD_API_KEY and BD_SITE_URL environment variables must be set"**
- Close Claude Code completely and reopen it
- Verify the environment variables are set: open PowerShell and run `$env:BD_API_KEY` — you should see your key

**"Widget not found" or "Invalid Request Method"**
- Ensure your `BD_SITE_URL` starts with `https://` (not `http://`)
- Ensure the URL ends with `/`
- If your domain redirects (e.g., `example.com` → `www.example.com`), use the target URL

**API key invalid**
- Verify you copied the full key with no extra spaces
- Regenerate the key in your BD admin panel if unsure
