// ==============================================================
// SMARTHIRE AI – Agentic JD Analyser Backend Server
// ==============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(".")); // Serve frontend files from same directory

// ── AI Config ────────────────────────────────────────────────
const AI_CONFIG = {
  baseUrl: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,
  // Models tried in order — first working one wins.
  // gpt-oss-20b is prioritised as it tends to have a separate quota.
  models: [
    "openai/gpt-oss-20b:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "deepseek/deepseek-v4-flash:free",
    "minimax/minimax-m2.5:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "arcee-ai/trinity-large-thinking:free",
    "poolside/laguna-xs.2:free",
    "poolside/laguna-m.1:free",
  ],
  primaryModel: process.env.AI_MODEL || "openai/gpt-oss-20b:free",
};

// ── Google Apps Script URL (Sheet Writer) ────────────────────
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || "";

// ── IST Timestamp Helper ─────────────────────────────────────
function getISTTimestamp() {
  // Compute IST (UTC+5:30) manually — avoids locale/regex bugs
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // +5 hours 30 minutes
  const ist = new Date(now.getTime() + istOffsetMs + now.getTimezoneOffset() * 60 * 1000);

  const dd = String(ist.getDate()).padStart(2, "0");
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const yyyy = ist.getFullYear();
  const hh = String(ist.getHours()).padStart(2, "0");
  const min = String(ist.getMinutes()).padStart(2, "0");
  const ss = String(ist.getSeconds()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

// ── System Prompt for JD Extraction ──────────────────────────
const JD_EXTRACTION_SYSTEM_PROMPT = `You are an expert HR and recruitment analyst with deep experience reading and structuring job descriptions.

Your task is to extract specific structured information from a job description and return it as a valid JSON object only.

Extract the following fields precisely:

1. **company_name** – The name of the hiring company or organization.
2. **job_location** – Where the job is based (city, state, country or remote/hybrid). If multiple, list all separated by commas.
3. **job_role** – The exact job title or position name.
4. **seniority_level** – Level such as: Intern, Fresher, Junior, Mid-level, Senior, Lead, Manager, Director, or Executive.
5. **experience_required** – Years or range of experience required (e.g., "2-4 years", "Fresh Graduate", "3+ years").
6. **ctc** – Compensation/salary/package (exact as stated). Use "Not specified" if absent.
7. **position_type** – Employment type: Full-time, Part-time, Contract, Internship, Freelance, or Apprenticeship.
8. **category** – Job domain/industry category such as: Software Engineering, Data Science, Product Management, Marketing, Finance, Sales, Operations, Design, DevOps, Cybersecurity, HR, Legal, etc.
9. **core_skills** – Array of the most essential technical/hard skills required (max 10).
10. **tools_technologies** – Array of software tools, frameworks, platforms mentioned (max 10).
11. **eligibility_criteria** – Any specific educational qualifications, certifications, or restrictions mentioned.
12. **mandatory_skills** – Array of skills explicitly marked as required/mandatory/must-have (max 8).
13. **optional_skills** – Array of skills marked as preferred/nice-to-have/optional (max 8).
14. **complexity_score** – Rate job complexity from 1-10 (1=simple, 10=highly complex). Include band: Low (1-3), Medium (4-6), High (7-10). Format: "7/10 (High)".
15. **campus_placement_year** – Graduation batch year if mentioned (e.g., "2025"). Use "" if absent.
16. **salary_insights** – Brief 1-2 sentence analysis of the compensation relative to market.
17. **skill_trend_insights** – Brief 1-2 sentence note on demand trends for the skills mentioned.
18. **placement_difficulty_score** – Brief qualitative assessment of how competitive this role is to get placed in.
19. **market_summary** – 2-3 sentence overview of the job market context for this role.
20. **summary** – A concise 3-4 sentence professional summary of this job description.
21. **confidence_score** – Your confidence (0-100) in the accuracy of your extraction based on JD clarity.
22. **jd_completeness** – How complete/detailed the JD is (0-100%).
23. **missing_fields** – Array of important fields that were absent from the JD.
24. **generated_by** – Always set this to "SmartHire AI".
25. **eligible_courses** – Array of eligible academic courses, degrees, or branches mentioned in the job description or category (e.g., ["B.Tech", "MBA", "MCA", "B.Tech (CSE)"]). If not explicitly mentioned, infer the most suitable academic courses based on the role, category, and skills.
26. **target_school** – The target university school department MOST suitable for this role. Classify strictly based on the PRIMARY job role and core skills ONLY. Choose exactly one:
    - "School of Engineering (SOE)": software engineer, developer, programmer, devops engineer, cloud engineer, data engineer, ML engineer, AI engineer, data scientist, analyst, embedded engineer, network engineer, security engineer, system architect, tech lead, CTO, mobile developer — any technical or science or research role.
    - "School of Business (SOB)": business analyst, product manager, marketing manager, sales executive, finance analyst, HR manager, operations manager, supply chain, consultant, MBA roles, BBA roles, brand manager, growth hacker, account manager, business development, management trainee — any business, management or commerce role.

IMPORTANT CLASSIFICATION RULES:
- A "Software Engineering Intern" is ALWAYS SOE, never SOB.
- A role with Python/Java/React/AWS skills is ALWAYS SOE.
- MBA/BBA/Finance/Marketing/Sales roles are ALWAYS SOB.
- Management Trainee roles are ALWAYS SOB.
- Data Scientist / Analyst roles → SOE.
- Legal / Design / Science roles → SOE.
- The word "Intern" alone does NOT determine school — look at the actual role domain.

RULES:
- Return ONLY a valid JSON object. No explanation, no markdown, no code fences.
- If a field cannot be determined, use "" for strings or [] for arrays.
- Be precise and professional in all extracted text.`;


// ── Chat System Prompt ────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `You are an expert placement and recruitment analytics assistant for SmartHire AI, a professional hiring intelligence platform.

You help HR teams, placement coordinators, and recruiters understand hiring trends, job market insights, and application data from the dashboard.

Be concise, data-driven, and professional. Use the dashboard context provided to give specific, actionable answers.`;

// ── Helper: Call AI API with fallback models ──────────────────
async function callAI(messages, { maxTokens = 2048, temperature = 0.1 } = {}) {
  // Deduplicate: primary model first, then rest of list
  const seen = new Set();
  const modelsToTry = [AI_CONFIG.primaryModel, ...AI_CONFIG.models].filter(m => {
    if (seen.has(m)) return false;
    seen.add(m);
    return true;
  });

  const rateLimited = [];

  for (const model of modelsToTry) {
    try {
      console.log(`[AI] Trying model: ${model}`);

      const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AI_CONFIG.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "SmartHire AI Platform",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (response.status === 429) {
        console.warn(`[AI] Model ${model} is rate-limited (429) — skipping.`);
        rateLimited.push(model.split("/")[1]);
        continue; // Try next model immediately
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[AI] Model ${model} returned ${response.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        console.warn(`[AI] Model ${model} returned empty content.`);
        continue;
      }

      console.log(`[AI] ✅ Success with model: ${model}`);
      return { content, model };

    } catch (err) {
      console.warn(`[AI] Model ${model} failed:`, err.message);
    }
  }

  const msg = rateLimited.length === modelsToTry.length
    ? `Daily AI quota exhausted for all models. Quota resets at 5:30 AM IST. Please try again tomorrow.`
    : `All AI models failed to respond. Please try again shortly.`;

  throw new Error(msg);
}

// ── Helper: Extract JSON from AI response ────────────────────
function extractJsonFromResponse(text) {
  // Remove markdown code fences if present
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Try extracting first JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {}
  }

  return null;
}

// ── POST /api/analyze ─────────────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
      return res.status(400).json({ error: "jobDescription is required." });
    }

    const jdText = jobDescription.trim();
    console.log(`[Analyze] Received JD (${jdText.length} chars)`);

    const messages = [
      { role: "system", content: JD_EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract structured information from the following job description:\n\n---\n${jdText}\n---`,
      },
    ];

    const { content, model } = await callAI(messages, { maxTokens: 2048, temperature: 0.1 });

    const parsed = extractJsonFromResponse(content);

    if (!parsed) {
      console.error("[Analyze] Failed to parse AI JSON response:", content.slice(0, 500));
      return res.status(502).json({
        error: "AI returned an unstructured response. Please try again.",
        raw: content.slice(0, 300),
      });
    }

    // Ensure generated_by is always set
    parsed.generated_by = parsed.generated_by || "SmartHire AI";

    // ── Deterministic school correction ───────────────────────
    // Small AI models often misclassify school. Override with rule engine.
    const correctedSchool = correctSchoolClassification(parsed);
    if (correctedSchool) {
      parsed.target_school = correctedSchool;
      console.log(`[School] AI said: "${parsed.target_school_ai_raw || '?'}" → Corrected to: "${correctedSchool}"`);
    } else {
      // Validate the AI's value is one of the known schools
      const VALID_SCHOOLS = [
        "School of Engineering (SOE)",
        "School of Business (SOB)",
      ];
      if (!VALID_SCHOOLS.includes(parsed.target_school)) {
        // AI returned garbage or empty — use SOE as safe default for campus placements
        parsed.target_school = "School of Engineering (SOE)";
        console.log(`[School] AI returned invalid/removed school — defaulted to SOE`);
      } else {
        console.log(`[School] AI classification kept: "${parsed.target_school}"`);
      }
    }

    // Process and attach course intelligence mapping
    processJdCourses(parsed, jdText);

    console.log(`[Analyze] Successfully extracted: ${parsed.job_role || "Unknown role"} @ ${parsed.company_name || "Unknown company"} → ${parsed.target_school}`);
    console.log(`[Analyze] Course intelligence:`, parsed.eligible_courses, parsed.target_schools);

    // ── Append to Google Sheets via Apps Script ───────────────
    appendToSheet(parsed).catch(err =>
      console.warn("[Sheets] Write failed (non-blocking):", err.message)
    );

    return res.json(parsed);

  } catch (err) {
    console.error("[Analyze] Error:", err.message);
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// ── POST /api/chat ────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { chatInput, sessionId, action, dashboardContext } = req.body;

    if (!chatInput || typeof chatInput !== "string" || !chatInput.trim()) {
      return res.status(400).json({ error: "chatInput is required." });
    }

    const messages = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      {
        role: "user",
        content: dashboardContext
          ? `${chatInput.trim()}\n\n[Dashboard Context]: ${dashboardContext}`
          : chatInput.trim(),
      },
    ];

    const { content } = await callAI(messages, { maxTokens: 1024, temperature: 0.4 });

    return res.json({ output: content });

  } catch (err) {
    console.error("[Chat] Error:", err.message);
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// ── POST /api/clear-sheet  ────────────────────────────────────────────────────
// Clears all data rows from the Google Sheet (keeps the header row).
app.post("/api/clear-sheet", async (req, res) => {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return res.status(500).json({ error: "APPS_SCRIPT_URL not configured." });

  try {
    const appsRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "clearSheet" }),
      redirect: "follow",
    });
    const json = await appsRes.json().catch(() => ({}));
    if (json.cleared === true) {
      console.log("[ClearSheet] Sheet cleared successfully — rows deleted:", json.rowsDeleted);
      return res.json({ success: true, rowsDeleted: json.rowsDeleted });
    } else {
      // Apps Script not redeployed with clearSheet support — fall back to just confirming
      console.warn("[ClearSheet] Apps Script does not support _action:clearSheet yet.");
      return res.json({ success: false, message: "Apps Script needs to be redeployed with clearSheet support." });
    }
  } catch (err) {
    console.error("[ClearSheet] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sheet-data  ─────────────────────────────────────────────────────
// STRATEGY 1 (preferred): Call the Apps Script ?action=read endpoint.
//   Apps Script reads directly from the live Spreadsheet — zero CDN caching.
// STRATEGY 2 (fallback): Call gviz/tq if Apps Script URL is not configured.
// Both return the same gviz-compatible JSON shape so dashboard.js works unchanged.
app.get("/api/sheet-data", async (req, res) => {
  const SHEET_ID = process.env.GOOGLE_SHEETS_ID || SHEET_CONFIG_ID;
  const gid      = req.query.gid || "0";

  // ── No-cache headers for our response (browser must never cache this) ──
  const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma":        "no-cache",
    "Expires":       "0",
  };

  // ── STRATEGY 1: Apps Script live read ───────────────────────────────────
  // The deployed Apps Script doGet() now always returns sheet data on any GET
  // request (no ?action=read required), which avoids the Google redirect
  // query-param stripping bug.
  let appsScriptNeedsRedeploy = false;
  if (APPS_SCRIPT_URL) {
    try {
      const baseUrl = APPS_SCRIPT_URL.split("?")[0];
      const appsUrl = `${baseUrl}?_=${Date.now()}`; // cache buster only
      console.log(`[SheetProxy] Fetching live data from Apps Script...`);

      const appsRes = await fetch(appsUrl, {
        redirect: "follow",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      });

      if (appsRes.ok) {
        const appsJson = await appsRes.json();

        if (appsJson.success === true || Array.isArray(appsJson.rows)) {
          const rows    = appsJson.rows    || [];
          const headers = appsJson.headers || [];
          console.log(`[SheetProxy] Apps Script returned ${rows.length} live rows`);

          // Convert rows → gviz table format using POSITIONAL access.
          // We do NOT use header-name lookup because the sheet may have
          // duplicate or empty column headers (e.g. old "Target School" = "").
          // Instead we convert each row object back to a positional value array
          // using the headers array order, then build gviz cells from that.
          const cols = headers.map(h => ({ id: h || `col_${headers.indexOf(h)}`, label: h, type: "string" }));

          const gvizRows = rows.map(rowObj => {
            // Re-build values in column order from the headers array
            const values = headers.map(h => {
              // If header is empty string, look up by "" key (Apps Script sets obj[""] for blank headers)
              let val = rowObj[h];
              if (val === undefined) val = "";
              // Clean up JS Date strings like "Mon May 25 2026 21:22:00 GMT+0530 (...)"
              if (typeof val === "string" && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /.test(val)) {
                // Extract just the date/time portion: "25/05/2026 21:22:00"
                const d = new Date(val);
                if (!isNaN(d)) {
                  const ist = new Date(d.getTime() + 5.5 * 3600000 + d.getTimezoneOffset() * 60000);
                  const dd  = String(ist.getDate()).padStart(2,"0");
                  const mm  = String(ist.getMonth()+1).padStart(2,"0");
                  const hh  = String(ist.getHours()).padStart(2,"0");
                  const mi  = String(ist.getMinutes()).padStart(2,"0");
                  const ss  = String(ist.getSeconds()).padStart(2,"0");
                  val = `${dd}/${mm}/${ist.getFullYear()} ${hh}:${mi}:${ss}`;
                }
              }
              return val || "";
            });
            return { c: values.map(v => ({ v, f: v })) };
          });

          res.set(noCacheHeaders);
          return res.json({
            status: "ok",
            table: { cols, rows: gvizRows },
            _source: "apps-script-live",
          });

        } else if (appsJson.status && appsJson.status.includes("active")) {
          // Old Apps Script doGet returning health-check — needs redeploy
          appsScriptNeedsRedeploy = true;
          console.warn("[SheetProxy] Apps Script not redeployed yet — doGet still returns health-check.");
        } else {
          console.warn("[SheetProxy] Apps Script returned unexpected shape:", JSON.stringify(appsJson).slice(0, 200));
        }
      }
      console.warn("[SheetProxy] Apps Script read did not return success, falling back to gviz");
    } catch (appsErr) {
      console.warn("[SheetProxy] Apps Script read failed:", appsErr.message, "— falling back to gviz");
    }
  }

  // ── STRATEGY 2: gviz/tq fallback ────────────────────────────────────────
  const bust = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&_nocache=${bust}`;

  try {
    console.log(`[SheetProxy] Falling back to gviz for sheet ${SHEET_ID}`);
    const upstream = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma":        "no-cache",
        "Expires":       "0",
        "User-Agent":    "Mozilla/5.0 (compatible; SmartHireAI/1.0)",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Google Sheets returned HTTP ${upstream.status}`,
      });
    }

    const text  = await upstream.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
    if (!match || !match[1]) {
      return res.status(502).json({ error: "Unexpected Google Sheets response format." });
    }

    const sheetJson = JSON.parse(match[1]);
    const gvizRowCount = sheetJson?.table?.rows?.length ?? 0;
    console.log(`[SheetProxy] gviz returned ${gvizRowCount} rows${appsScriptNeedsRedeploy ? " (STALE — Apps Script not redeployed)" : ""}`);

    res.set(noCacheHeaders);
    // Merge stale/redeploy flags into the response
    sheetJson._source = "gviz-cache";
    sheetJson._stale  = appsScriptNeedsRedeploy;
    sheetJson._needsRedeploy = appsScriptNeedsRedeploy;
    return res.json(sheetJson);

  } catch (err) {
    console.error("[SheetProxy] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Sheet ID constant used by the proxy (mirrors SHEET_CONFIG in dashboard.js)
const SHEET_CONFIG_ID = "15sg6jNezpFpz7v-vrtFH2_vBnr8NqHNp10gK-rZrRpM";



// ── Deterministic School Classifier (overrides AI when wrong) ───
// Only two schools are active: SOE and SOB.
function correctSchoolClassification(parsed) {
  const role     = (parsed.job_role || parsed.role || "").toLowerCase();
  const category = (parsed.category || "").toLowerCase();
  const skills   = (Array.isArray(parsed.core_skills)
    ? parsed.core_skills.join(" ")
    : String(parsed.core_skills || "")).toLowerCase();
  const tools    = (Array.isArray(parsed.tools_technologies)
    ? parsed.tools_technologies.join(" ")
    : String(parsed.tools_technologies || "")).toLowerCase();
  const combined = `${role} ${category} ${skills} ${tools}`;

  // ── SOB — School of Business (check first — most specific biz signals) ─
  const sobRoleTerms = [
    "business analyst", "product manager", "marketing", "sales",
    "finance", "accounting", "accountant", "operations manager",
    "supply chain", "logistics", "brand manager", "growth",
    "strategy", "management consultant", "investment", "equity",
    "trading", "audit", "tax", "treasury", "hr manager",
    "human resource", "recruiter", "talent acquisition",
    "customer success", "account manager", "business development",
    "chief executive", "ceo", "cfo", "coo", "vp ",
    "management trainee", "trainee"
  ];
  const sobQualTerms = ["mba", "bba", "bcom", "b.com", " ca ", "cfa", "cpa", "pgdm"];
  const sobCatTerms = [
    "business", "marketing", "sales", "finance", "management",
    "operations", "consulting", "strategy", "human resources"
  ];
  if (
    sobRoleTerms.some(k => role.includes(k)) ||
    sobQualTerms.some(k => combined.includes(k)) ||
    sobCatTerms.some(k => category.includes(k))
  ) return "School of Business (SOB)";

  // ── SOE — School of Engineering (default for tech, science, law, arts) ─
  const soeRoleTerms = [
    "engineer", "developer", "programmer", "software", "devops", "cloud",
    "frontend", "backend", "fullstack", "full stack", "full-stack",
    "sre", "site reliability", "network", "embedded", "hardware",
    "cybersecurity", "security analyst", "database admin", "dba",
    "systems", "infrastructure", "mobile", "android", "ios",
    "architect", "tech lead", "cto", "data engineer",
    "ml engineer", "ai engineer", "machine learning engineer",
    "data scientist", "research scientist", "data analyst",
    "platform engineer", "solutions engineer", "qa engineer",
    "test engineer", "automation engineer", "robotics",
    "legal", "advocate", "attorney", "counsel",
    "designer", "content writer", "social media"
  ];
  const soeTechSkills = [
    "javascript", "typescript", "python", "java", "c++", "c#",
    "golang", "go lang", "rust", "kotlin", "swift", "php", "ruby",
    "react", "angular", "vue", "node.js", "nodejs", "express",
    "django", "flask", "spring boot", "laravel", "fastapi",
    "next.js", "nextjs", "flutter", "react native",
    "aws", "azure", "gcp", "google cloud", "kubernetes", "docker",
    "terraform", "ansible", "jenkins", "ci/cd", "git",
    "linux", "bash", "rest api", "graphql", "microservices",
    "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
    "tensorflow", "pytorch", "scikit-learn", "deep learning",
    "large language model", "llm integration", "nlp", "computer vision",
    "sql", "nosql", "data structures", "algorithms", "system design"
  ];
  const soeCatTerms = [
    "software engineering", "software development", "engineering",
    "technology", "information technology", "it ", " it",
    "devops", "cloud", "cybersecurity", "data engineering",
    "systems", "product engineering", "science", "research",
    "legal", "law", "design", "media", "arts"
  ];
  if (
    soeRoleTerms.some(k => role.includes(k)) ||
    soeTechSkills.some(k => skills.includes(k) || tools.includes(k)) ||
    soeCatTerms.some(k => category.includes(k))
  ) return "School of Engineering (SOE)";

  // No confident override — keep null to let caller decide
  return null;
}

// ── Deterministic Course Classifier ────────────────────────────
function classifyCourseToSchool(courseName) {
  const c = courseName.toLowerCase().trim();

  // School of Business (SOB) — most specific business courses
  if (/\b(mba|bba|pgdm|b\.?com|m\.?com|finance|management|marketing|business|commerce|accounting|hr|recruiting|sales|bms)\b/i.test(c)) {
    return "School of Business (SOB)";
  }

  // Everything else → School of Engineering (SOE)
  return "School of Engineering (SOE)";
}

function extractCoursesHeuristically(text) {
  if (!text) return [];
  const coursesFound = new Set();

  const pattern = /\b(b\.?\s*tech|m\.?\s*tech|b\.?\s*e|m\.?\s*e|b\.?\s*c\.?\s*a|m\.?\s*c\.?\s*a|m\.?\s*b\.?\s*a|b\.?\s*b\.?\s*a|b\.?\s*com|m\.?\s*com|b\.?\s*sc|m\.?\s*sc|ph\.?\s*d|l\.?\s*l\.?\s*b|l\.?\s*l\.?\s*m|b\.?\s*a|m\.?\s*a|pgdm)\b/gi;
  const branchPattern = /\b(b\.?\s*tech|m\.?\s*tech|b\.?\s*e|m\.?\s*e|mba|mca|bca|bsc|msc|bba)\b\s*\(?[a-z\s]{2,10}\)?/gi;

  let match;
  while ((match = branchPattern.exec(text)) !== null) {
    coursesFound.add(match[0].trim());
  }

  while ((match = pattern.exec(text)) !== null) {
    const course = match[1].trim();
    let normalized = course.replace(/\s+/g, "").toUpperCase();

    if (normalized.startsWith("B") && normalized.endsWith("TECH")) normalized = "B.Tech";
    else if (normalized.startsWith("M") && normalized.endsWith("TECH")) normalized = "M.Tech";
    else if (normalized === "MBA") normalized = "MBA";
    else if (normalized === "MCA") normalized = "MCA";
    else if (normalized === "BCA") normalized = "BCA";
    else if (normalized === "BE") normalized = "B.E.";
    else if (normalized === "ME") normalized = "M.E.";
    else if (normalized.startsWith("B") && normalized.endsWith("SC")) normalized = "B.Sc";
    else if (normalized.startsWith("M") && normalized.endsWith("SC")) normalized = "M.Sc";
    else if (normalized === "BBA") normalized = "BBA";
    else if (normalized.startsWith("B") && normalized.endsWith("COM")) normalized = "B.Com";
    else if (normalized.startsWith("M") && normalized.endsWith("COM")) normalized = "M.Com";
    else if (normalized === "PHD" || normalized === "PH.D") normalized = "PhD";
    else if (normalized === "LLB") normalized = "LLB";
    else if (normalized === "LLM") normalized = "LLM";
    else if (normalized === "BA") normalized = "BA";
    else if (normalized === "MA") normalized = "MA";
    else if (normalized === "PGDM") normalized = "PGDM";

    let alreadyExists = false;
    for (const existing of coursesFound) {
      if (existing.replace(/\s+/g, "").toUpperCase().includes(normalized.replace(/\./g, "").toUpperCase())) {
        alreadyExists = true;
        break;
      }
    }
    if (!alreadyExists) {
      coursesFound.add(normalized);
    }
  }

  return Array.from(coursesFound);
}

function processJdCourses(parsed, jdText) {
  let courses = [];
  if (Array.isArray(parsed.eligible_courses) && parsed.eligible_courses.length > 0) {
    courses = parsed.eligible_courses;
  } else {
    const sourceText = `${parsed.category || ""} ${parsed.eligibility_criteria || ""} ${jdText}`;
    courses = extractCoursesHeuristically(sourceText);
  }

  courses = [...new Set(courses.map(c => c.trim()))].filter(Boolean);

  if (courses.length === 0) {
    const school = parsed.target_school || "";
    if (school.includes("SOE")) courses = ["B.Tech (CSE)"];
    else if (school.includes("SOB")) courses = ["MBA"];
    else if (school.includes("SOS")) courses = ["B.Sc"];
    else if (school.includes("SOL")) courses = ["LLB"];
    else if (school.includes("SOH")) courses = ["BA"];
    else courses = ["B.Tech"];
  }

  const mapping = {};
  const schools = new Set();
  for (const course of courses) {
    const school = classifyCourseToSchool(course);
    mapping[course] = school;
    schools.add(school);
  }

  parsed.eligible_courses = courses;
  parsed.course_school_mapping = mapping;
  parsed.target_schools = Array.from(schools);

  if (!parsed.target_school || !parsed.target_school.includes("School")) {
    parsed.target_school = parsed.target_schools[0] || "School of Engineering (SOE)";
  }
}


// ── Google Sheets: Append via Apps Script ───────────────────
async function appendToSheet(parsed) {
  if (!APPS_SCRIPT_URL) {
    console.log("[Sheets] APPS_SCRIPT_URL not set — skipping sheet write.");
    return;
  }

  // Attach server-generated IST timestamp so the sheet doesn't rely on
  // Apps Script's own clock (which can drift or use a different TZ).
  const payload = {
    ...parsed,
    analysis_timestamp_ist: getISTTimestamp(),
  };

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  const result = await response.json();
  if (result.success) {
    console.log(`[Sheets] Row appended for: ${parsed.company_name || "Unknown"}`);
  } else {
    console.warn("[Sheets] Apps Script returned error:", result.error);
  }
}

// ── Health Check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    model: AI_CONFIG.primaryModel,
    timestamp: getISTTimestamp(),
  });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`  SmartHire AI Backend running on port ${PORT}`);
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`  Model: ${AI_CONFIG.primaryModel}`);
  console.log("─────────────────────────────────────────");
});
