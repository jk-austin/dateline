# Dateline

A batch PDF renaming tool for Lancaster Farming. Upload a batch of PDFs, and Dateline automatically renames each file to a standardized naming convention by reading the page content.

**Output format:** `LF_20260124_MAIN_A_001.PDF`

[Lancaster Farming Dateline Renaming App](https://dateline-six.vercel.app/)

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Using the App](#using-the-app)
- [Configuration](#configuration)
- [Known Limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## How It Works

1. You select one or more PDF files using the file picker
2. Dateline sends each file to the backend server
3. The server extracts the text from the PDF
4. A pattern-matching rule (regex) looks for the page header, e.g. `Lancaster Farming, Saturday, January 24, 2026 - A3`
5. If the header is found, the date, section letter, and page number are extracted and used to build the new filename
6. If the header is not found (e.g. front pages), the page text is sent to the Claude AI API as a fallback
7. Claude reads the content and returns the same metadata
8. The renamed file is made available for download
9. When all files are processed, you can download everything as a single zip file

---

## Architecture

```
dateline/
├── index.js                      # Express server entry point
├── .env                          # API key (not committed to Git)
├── uploads/                      # Temporary storage for incoming PDFs
├── middleware/
│   ├── multerConfig.js           # File upload handling
│   └── extractMetadata.js        # Regex extraction logic and section name mapping
└── routes/
    ├── upload.js                 # Main pipeline: extract text, run regex, Claude fallback
    ├── rename.js                 # Standalone rename endpoint
    └── downloadAll.js            # Zip and download all processed files

dateline/client/                  # React frontend (Vite)
└── src/
    └── App.jsx                   # Main UI component
```

**Tech stack:**
- Backend: Node.js, Express, Multer, pdfjs-dist
- Frontend: React, Vite, Tailwind CSS
- AI fallback: Anthropic Claude API (`claude-sonnet-4-6`)
- File packaging: archiver (zip)

---

## Requirements

Before installing, make sure you have the following:

- **Node.js** v18 or higher — download at [nodejs.org](https://nodejs.org)
- **npm** v9 or higher (comes with Node.js)
- **Git** — download at [git-scm.com](https://git-scm.com)
- **An Anthropic API key** — required for the Claude fallback. Get one at [console.anthropic.com](https://console.anthropic.com)
- **Git Bash** (Windows only) — recommended terminal. Comes bundled with Git for Windows.

---

## Installation

### Step 1: Clone the repository

Open Git Bash (Windows) or Terminal (Mac/Linux) and run:

```bash
git clone https://github.com/jk-austin/dateline.git
cd dateline
```

### Step 2: Create the uploads folder

This folder is required. Dateline will fail without it.

```bash
mkdir uploads
```

### Step 3: Install backend dependencies

```bash
npm install
```

### Step 4: Set up your API key

Create a file called `.env` in the `dateline/` root folder. Add this line, replacing the placeholder with your actual key:

```
ANTHROPIC_API_KEY=your_key_here
```

To get a key:
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Go to **API Keys** in the left sidebar
4. Click **Create Key** and copy the result

> **Important:** Never share your `.env` file or commit it to Git. It is already listed in `.gitignore`.

### Step 5: Install frontend dependencies

```bash
cd client
npm install
cd ..
```

---

## Running the App

Dateline requires two servers running at the same time. Open two terminal windows.

**Terminal 1 — Backend server:**

```bash
cd dateline
node index.js
```

You should see: `Dateline running on port 3000`

**Terminal 2 — Frontend:**

```bash
cd dateline/client
npm run dev
```

You should see a local URL, typically `http://localhost:5173`

Open that URL in your browser.

---

## Using the App

1. Click **Choose Files** and select one or more PDF files
2. The file list will appear showing each file as **Pending**
3. Click **Process** to begin
4. Each file's status will update in real time:
   - **Processing...** — currently being handled
   - **Done** — successfully renamed, download link available
   - **Failed** — could not be processed, error message shown
5. When processing is complete:
   - Click **Download** next to any individual file
   - Or click **Download All** to receive a single zip file containing all renamed PDFs
6. If any files failed, a **Retry Failed** button will appear

---

## Configuration

### Section name mapping

Section letters are mapped to section names in `middleware/extractMetadata.js`:

```javascript
const sectionNames = {
  A: 'MAIN',
  B: 'FAMILY',
  C: 'BUSINESS',
  D: 'CLASSIFIEDS',
};
```

To add or change a section, edit this object. If a letter is not in the map, the section name will default to `UNKNOWN`.

### Processing delay

To avoid exceeding Anthropic API rate limits, Dateline waits 500ms between files. This can be adjusted in `client/src/App.jsx`:

```javascript
await new Promise(resolve => setTimeout(resolve, 500))
```

Increase the number for slower processing, decrease it for faster (at the risk of hitting rate limits on large batches with many Claude fallbacks).

### File size limit

The backend accepts payloads up to 250MB for the zip download endpoint. This can be adjusted in `index.js`:

```javascript
app.use(express.json({ limit: '250mb' }));
```

---

## Known Limitations

- **Text-based PDFs only** — Dateline cannot process scanned or image-based PDFs. All files must have extractable text.
- **One page per file** — the tool is designed for single-page PDFs. Multi-page files will only extract and rename based on the first page.
- **Front pages use Claude** — front pages do not have a standard running header, so they always fall back to the Claude API. This is expected behavior.
- **Section mapping must be maintained manually** — if Lancaster Farming adds or renames sections, `extractMetadata.js` must be updated.
- **Local use only (Plan A)** — this version runs on a single machine. A team-accessible version (Plan B) requires additional infrastructure including cloud storage and authentication.

---

## Troubleshooting

**Server won't start — "Cannot find module" error**
Run `npm install` from the `dateline/` root directory. If the error mentions a module inside `client/`, run `npm install` from `dateline/client/` as well.

**"uploads folder not found" or Multer error**
Create the uploads folder manually: `mkdir uploads` from the `dateline/` root.

**Claude API returns an error**
Check that your `.env` file exists in the `dateline/` root and contains a valid `ANTHROPIC_API_KEY`. Restart the server after any changes to `.env`.

**Files processed but filenames show UNKNOWN for section name**
The section letter found on the page is not in the mapping table. Open `middleware/extractMetadata.js` and add the missing letter to `sectionNames`.

**Download All produces an invalid zip**
This can happen if the request payload exceeds the size limit. Check the `limit` value in `index.js` and increase it if processing very large batches.

**Windows users: `touch` command not found**
Use `New-Item filename` in PowerShell, or switch to Git Bash where `touch` works normally.