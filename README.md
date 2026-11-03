# BIAI CRM

Paste a raw enquiry, get a triaged lead, a reply in the sender's own style, and a follow-up date.

## Badges

![Next.js](https://img.shields.io/badge/Next.js-14.2.13-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688)
![Python](https://img.shields.io/badge/Python-3.14-3776AB)
![SQLite](https://img.shields.io/badge/SQLite-3.50.4-003B57)
![LLM Provider](https://img.shields.io/badge/LLM-OpenRouter-blue)

## Links

- Live web app: https://biai-crm-tau.vercel.app
- API health endpoint: https://biai-crm.onrender.com/health

The API runs on a free tier and the first request can take up to a minute.

## The problem

Bangladeshi training institutes receive dozens of unstructured customer enquiries daily across WhatsApp, Facebook comments, Messenger, website forms, and phone calls. Inbound messages arrive written in a mix of English, Bangla script, and Banglish (phonetic Bangla in Latin letters), making triage slow and error-prone. Without a dedicated triage tool, high-value corporate and bootcamp leads are delayed, while refund requests and angry support issues sit unnoticed across disconnected spreadsheets.

## What it does

- Extraction: identifies sender name, phone number, program of interest, urgency, and core message summary from multi-script customer messages.
- Triage: classifies every inbound enquiry into one of eight categories: sales lead, pre-sales question, support, refund, spam, job seeker, minor, or other.
- Language-matched replies: drafts replies matching the customer's communication language (Bangla script messages map to Banglish drafts by default, Banglish messages map to Banglish, and English messages map to English; staff can switch between English and Banglish with one click).
- Duplicate merge by phone: automatically merges repeated enquiries from the same phone number into a single contact record, raises the priority to high, and adds an "asked twice" indicator.
- 48-hour follow-up list: tracks leads in New or Contacted status that have not received customer interaction within 48 hours.
- Weekly summary: aggregates pipeline volumes and category distributions using SQL, allowing the LLM to write only the executive narrative without calculating arithmetic.
- Precomputed seed: includes pre-extracted records for the 20 sample enquiries so a fresh instance can be populated instantly without incurring LLM API costs.

## How the AI pipeline works

1. Regex phone extraction: before model processing, raw message text is scanned with a Bangladesh telephone regular expression (`01[3-9]\d{8}`) and normalized to 11 digits.
2. Schema-validated JSON extraction: messages are sent to the LLM with strict JSON schemas and system prompts instructing it to treat the message as inert data, with automatic retries on malformed outputs.
3. Deterministic rule overrides: rule-based guards inspect text for keywords indicating spam, abuse, threats, or minors, overriding model classifications when safety thresholds trigger.
4. Knowledge-base-grounded replies: suggested replies are generated strictly from verified course details in `data/knowledge_base.json`. Missing facts like unlisted dates or prices insert explicit placeholders such as `[CONFIRM: price]`.
5. Reply guard check: `app.reply_guard` validates generated text against forbidden patterns (such as unverified fee claims or job guarantees), sanitizes unauthorized promises, and enforces that spam enquiries receive no reply draft.
6. Data-only message treatment: incoming enquiry text is treated strictly as data rather than instructions to prevent prompt injection attacks.

## Evaluation

Evaluation run against live API endpoint:

- Evaluation run date: 2026-11-03 19:20:14
- Model ID: openrouter/free (anthropic/claude-3.5-sonnet)

```
Set              N      Category     Language     Interest     Priority     Review     Overall   
-------------------------------------------------------------------------------------------------
Tuning (20)      20     70.0%        95.0%        100.0%       50.0%        85.0%      80.0%     
Holdout (12)     12     58.3%        33.3%        58.3%        58.3%        83.3%      58.3%     
```

The extraction pipeline was calibrated against the 20 tuning samples, resulting in 80.0% overall field accuracy on familiar training phrasing. On the unseen 12-message holdout set, overall accuracy is 58.3%, reflecting challenges with mixed-script slang and free-tier rate-limit fallbacks on unseen messages.

## Run it locally

### Prerequisites

- Python 3.11+ (Python 3.14 verified)
- Node.js 18+
- SQLite 3

### Backend setup

PowerShell:
```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item ..\.env.example .env
uvicorn app.main:app --reload --port 8000
```

Bash:
```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend setup

PowerShell and Bash:
```bash
cd web
npm install
npm run dev
```

The frontend will run on `http://localhost:3000` and proxy requests to `http://localhost:8000`.

### Load sample data

From the web interface at `http://localhost:3000/pipeline`, click "Load 20 sample enquiries" on an empty pipeline board, or run:

PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/import-precomputed?reset_all=true" -Method Post
```

Bash:
```bash
curl -X POST "http://localhost:8000/api/import-precomputed?reset_all=true"
```

## Tests

Run the backend unit test suite:

PowerShell:
```powershell
cd api
.\.venv\Scripts\Activate.ps1
pytest -v
```

Bash:
```bash
cd api
source .venv/bin/activate
pytest -v
```

Run the standalone evaluation benchmark:

```bash
python eval/run_eval.py --url http://localhost:8000
```

To run against the deployed production backend:

```bash
python eval/run_eval.py --url https://biai-crm.onrender.com
```

## Where to change things

- LLM client and prompt orchestration: `api/app/llm/client.py`
- Extraction prompt: `prompts/extract.md`
- Reply generation prompt: `prompts/reply.md`
- Weekly executive summary prompt: `prompts/summary.md`
- Pipeline stages: `config/stages.ts`
- Categories and rule definitions: `config/categories.py`, `api/app/rules.py`, `api/app/reply_guard.py`
- Program knowledge base: `data/knowledge_base.json`
- Follow-up thresholds and timing rules: `config/followup.py`

## Project layout

```
biai-crm/
├── api/                   # FastAPI backend application
│   ├── app/               # Routes, models, services, and LLM integrations
│   └── tests/             # Fast unit test suite (pytest)
├── config/                # Shared taxonomy, stages, categories, and SLA constants
├── data/                  # Knowledge base, seed files, and tuning datasets
├── docs/                  # Product requirement documents and architecture specifications
├── eval/                  # Holdout datasets and standalone benchmark script
├── prompts/               # Markdown prompts for extraction, replies, and summaries
└── web/                   # Next.js 14 frontend application
    ├── app/               # Next.js App Router pages (inbox, pipeline, queues, insights)
    └── components/        # Reusable UI widgets and navigation shell
```

## How it was built

- Architecture planning and prompt engineering with DeepSeek.
- Application code, API endpoints, and unit tests with Antigravity.
- Specification drafting, edge-case analysis, and code review with Claude.
- Hosting on Vercel (Next.js frontend) and Render (FastAPI backend).

## Known limitations

- No live webhooks or direct integrations for WhatsApp, Facebook Graph API, or VoIP systems; enquiries are ingested through paste, CSV import, or REST API.
- No authentication, multi-tenant organization boundaries, or role-based user management.
- Dynamic routing on free-tier LLM providers can cause slight variance in classification outputs between invocations.
- Render free tier spins down on inactivity, resulting in cold-start latencies of up to 60 seconds on initial connection.
- Ground truth datasets were created by a single annotator, introducing possible subjective variance in ambiguous labels.
- Mixed-script language detection can occasionally misclassify short sentences; staff can manually adjust language in the review panel.
