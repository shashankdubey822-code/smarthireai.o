// =============================
// SMART HIRE AI - FULL UPDATED
// =============================

const dropZone = document.getElementById("dropZone");
const fileUpload = document.getElementById("fileUpload");
const textarea = document.getElementById("jobDescription");
const analyzeBtn = document.querySelector(".analyze-btn");
const browseBtn = document.getElementById("browseBtn");
const loader = document.getElementById("loader");
const apiStatus = document.getElementById("apiStatus");
const resultSection = document.getElementById("result");
const selectedFileEl = document.getElementById("selectedFile");
const charCountEl = document.getElementById("charCount");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyListEl = document.getElementById("historyList");
const historyCountEl = document.getElementById("historyCount");
const batchPanelEl = document.getElementById("batchPanel");
const batchCountEl = document.getElementById("batchCount");
const batchSummaryEl = document.getElementById("batchSummary");
const batchTableBodyEl = document.getElementById("batchTableBody");

// 🔹 Existing fields
const roleEl = document.getElementById("role");
const seniorityEl = document.getElementById("seniority");
const experienceEl = document.getElementById("experience");
const coreSkillsEl = document.getElementById("coreSkills");
const toolsEl = document.getElementById("tools");
const complexityEl = document.getElementById("complexity");
const companyNameEl = document.getElementById("companyName");
const campusPlacementYearEl = document.getElementById("campusPlacementYear");
const targetSchoolEl = document.getElementById("targetSchool");
const ctcEl = document.getElementById("ctc");

// 🔹 NEW FIELDS
const locationEl = document.getElementById("location");
const eligibilityCriteriaEl = document.getElementById("eligibilityCriteria");
const summaryEl = document.getElementById("summary");
const generatedByEl = document.getElementById("generatedBy");
const confidenceScoreEl = document.getElementById("confidenceScore");
const confidenceBarEl = document.getElementById("confidenceBar");
const jdCompletenessEl = document.getElementById("jdCompleteness");
const completenessBarEl = document.getElementById("completenessBar");
const missingFieldsEl = document.getElementById("missingFields");
const mandatorySkillsEl = document.getElementById("mandatorySkills");
const optionalSkillsEl = document.getElementById("optionalSkills");
const skillChartEl = document.getElementById("skillChart");
const salaryInsightsEl = document.getElementById("salaryInsights");
const skillTrendInsightsEl = document.getElementById("skillTrendInsights");
const placementDifficultyScoreEl = document.getElementById("placementDifficultyScore");
const marketSummaryEl = document.getElementById("marketSummary");

let skillChartInstance = null;
let latestAnalysisRecord = null;
let analysisHistory = [];
let latestBatchResults = [];
let uploadedJdBatch = [];
let isHydratingTextarea = false;

const HISTORY_STORAGE_KEY = "smarthire.analyses.v1";
const HISTORY_LIMIT = 15;

// =============================
// 🔹 BACKEND CONFIG
// =============================
const ANALYZE_ENDPOINT =
  window.ANALYZE_ENDPOINT || "/api/analyze";

const FIELD_ALIASES = {
  company_name: [
    "company_name", "companyName", "company", "organization", "employer", "hiring_company"
  ],
  campus_placement_year: [
    "campus_placement_year", "placement_cycle_year", "placement_year", "placement_cycle", "campus_year", "batch_year", "graduation_year", "passing_year", "passout_year"
  ],
  ctc: ["ctc_range", "ctc", "salary", "compensation", "package"],
  role: ["job_role", "role", "designation", "position", "title"],
  seniority_level: [
    "seniority_level", "seniority", "level", "job_level", "experience_level"
  ],
  experience_required: [
    "experience_required", "experience", "years_of_experience", "min_experience", "required_experience"
  ],
  core_skills: [
    "core_skills", "skills", "mandatory_skills", "required_skills", "must_have_skills"
  ],
  tools_technologies: [
    "tools_technologies", "tools", "technologies", "tech_stack", "frameworks"
  ],
  complexity_score: [
    "complexity_score", "complexity", "difficulty", "difficulty_level", "jd_complexity", "complexity_level"
  ],
  location: ["location", "job_location", "work_location", "city", "place"],
  eligibility_criteria: ["eligibility_criteria", "eligibility", "criteria"],
  salary_insights: [
    "salary_insights", "salary_insight", "compensation_insights", "salary_analysis"
  ],
  skill_trend_insights: [
    "skill_trend_insights", "skill_trends", "skill_insights", "demanded_skills_trend"
  ],
  placement_difficulty_score: [
    "placement_difficulty_score", "placement_difficulty", "difficulty_score", "placement_score"
  ],
  market_summary: [
    "market_summary", "job_market_summary", "market_overview", "industry_summary"
  ],
  summary: [
    "summary", "ai_summary", "analysis_summary", "overall_summary", "job_summary", "insight_summary"
  ],
  generated_by: ["generated_by", "generatedBy", "model", "source_model", "llm"],
  target_school: ["target_school", "school", "university_school", "department", "school_name", "targetSchool"],
  eligible_courses: ["eligible_courses", "courses", "degrees", "eligible_degrees", "branches", "eligibleBranches"]
};

FIELD_ALIASES.mandatory_skills = [
  "mandatory_skills", "must_have_skills", "required_skills", "core_skills", "primary_skills", "must_have"
];
FIELD_ALIASES.optional_skills = [
  "optional_skills", "nice_to_have_skills", "preferred_skills", "good_to_have_skills", "secondary_skills", "nice_to_have"
];
FIELD_ALIASES.confidence_score = [
  "confidence_score", "confidence", "confidence_percent", "confidenceScore", "model_confidence", "accuracy_score"
];
FIELD_ALIASES.jd_completeness = [
  "jd_completeness", "completeness", "completeness_score", "completeness_percent", "jdCompleteness"
];
FIELD_ALIASES.missing_fields = [
  "missing_fields", "missing_info", "missing", "gaps", "missingFields"
];
FIELD_ALIASES.position_type = [
  "position_type", "employment_type", "job_type", "contract_type", "type", "work_type"
];
FIELD_ALIASES.category = [
  "category", "job_category", "domain", "industry", "department", "function", "job_function"
];

const QUALITY_REQUIRED_FIELDS = [
  { key: "company_name", label: "Company name" },
  { key: "role", label: "Role" },
  { key: "experience_required", label: "Experience required" },
  { key: "location", label: "Location" },
  { key: "ctc", label: "CTC" },
  { key: "core_skills", label: "Core skills" },
  { key: "tools_technologies", label: "Tools/technologies" },
  { key: "summary", label: "AI summary" }
];

// =============================
// 🔹 MAIN ANALYZE FUNCTION
// =============================
async function analyzeJD() {
  const batchEntries = getValidBatchEntries();
  if (batchEntries.length > 1) {
    await analyzeBatch(batchEntries);
    return;
  }

  const jdText = textarea ? textarea.value.trim() : "";
  if (!jdText) {
    alert("Upload or paste JD first.");
    return;
  }

  const sourceFileName = batchEntries.length === 1 ? batchEntries[0].file_name : "";
  await analyzeSingle(jdText, sourceFileName);
}

async function analyzeSingle(jdText, sourceFileName = "") {
  clearBatchResultsView();

  loader.classList.remove("hidden");
  analyzeBtn.disabled = true;
  setApiStatus(
    sourceFileName
      ? `Analyzing ${sourceFileName}...`
      : "Running AI analysis...",
    "info"
  );

  try {
    const data = await requestJdAnalysis(jdText);
    applyAnalysisResult(normalizeResult(data, jdText), {
      saveHistory: true,
      sourceJd: jdText,
      sourceFileName
    });
    setApiStatus("Analysis completed successfully.", "success");

    // Trigger a dashboard refresh after a short delay to pick up the new data
    // (n8n needs a few seconds to write to Google Sheets)
    setTimeout(() => {
      if (window.dashboardAPI) {
        window.dashboardAPI.markDirty(); // Force re-render on next fetch
        window.dashboardAPI.refresh(false);
      }
    }, 5000);

  } catch (error) {
    console.error(error);
    setApiStatus(
      error && error.message
        ? error.message
        : "Analysis failed. Please try again.",
      "error"
    );
    alert("Analysis failed. Please try again.");
  } finally {
    loader.classList.add("hidden");
    analyzeBtn.disabled = false;
  }
}

async function analyzeBatch(entries) {
  loader.classList.remove("hidden");
  analyzeBtn.disabled = true;

  const failures = [];
  let successCount = 0;
  const batchRows = entries.map((entry) => ({
    file_name: safeString(entry.file_name) || "Untitled file",
    status: "queued",
    company_name: "",
    role: "",
    confidence_score: null,
    error_message: "",
    history_id: ""
  }));
  latestBatchResults = batchRows;
  renderBatchResults("Batch analysis in progress...");

  try {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      batchRows[index].status = "running";
      latestBatchResults = [...batchRows];
      renderBatchResults("Batch analysis in progress...");
      setApiStatus(
        `Analyzing ${index + 1}/${entries.length}: ${entry.file_name}...`,
        "info"
      );

      try {
        const data = await requestJdAnalysis(entry.jd_text);
        const normalizedResult = normalizeResult(data, entry.jd_text);
        applyAnalysisResult(normalizedResult, {
          saveHistory: true,
          sourceJd: entry.jd_text,
          sourceFileName: entry.file_name
        });
        batchRows[index] = {
          ...batchRows[index],
          status: "success",
          company_name: safeString(normalizedResult.company_name),
          role: safeString(normalizedResult.role),
          confidence_score: normalizePercent(normalizedResult.confidence_score),
          error_message: "",
          history_id:
            latestAnalysisRecord && latestAnalysisRecord.id
              ? latestAnalysisRecord.id
              : ""
        };
        successCount += 1;
      } catch (error) {
        console.error(error);
        failures.push(entry.file_name);
        batchRows[index] = {
          ...batchRows[index],
          status: "failed",
          error_message:
            error && error.message ? error.message : "Analysis request failed."
        };
      }

      latestBatchResults = [...batchRows];
      renderBatchResults("Batch analysis in progress...");
    }

    if (successCount === 0) {
      throw new Error("All JD analyses failed.");
    }

    const failureCount = failures.length;
    if (failureCount > 0) {
      const failedLabel =
        failures.length <= 3 ? failures.join(", ") : `${failures.slice(0, 3).join(", ")}...`;
      setApiStatus(
        `Batch complete: ${successCount}/${entries.length} analyzed. Failed: ${failedLabel}`,
        "warning"
      );
      renderBatchResults();
      return;
    }

    setApiStatus(
      `Batch complete: ${successCount} JD${successCount === 1 ? "" : "s"} analyzed successfully.`,
      "success"
    );
    renderBatchResults();
  } catch (error) {
    setApiStatus(
      error && error.message ? error.message : "Batch analysis failed.",
      "error"
    );
    renderBatchResults();
    alert("Batch analysis failed.");
  } finally {
    loader.classList.add("hidden");
    analyzeBtn.disabled = false;

    // Trigger dashboard refresh after batch completes
    setTimeout(() => {
      if (window.dashboardAPI) {
        window.dashboardAPI.markDirty();
        window.dashboardAPI.refresh(false);
      }
    }, 5000);
  }
}

async function requestJdAnalysis(jdText) {
  const response = await fetch(ANALYZE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription: jdText })
  });
  return parseWebhookResponse(response);
}

// =============================
// 🔹 NORMALIZE RESULT
// =============================
function normalizeResult(rawResult, jdText) {
  const source = unwrapPayload(rawResult);

  const companyName =
    safeString(findValueByAliases(source, FIELD_ALIASES.company_name)) ||
    extractCompanyFromJD(jdText);
  const campusPlacementYear =
    normalizePlacementYear(
      findValueByAliases(source, FIELD_ALIASES.campus_placement_year)
    ) || extractPlacementYearFromJD(jdText);
  const ctc =
    normalizeCtcValue(findValueByAliases(source, FIELD_ALIASES.ctc)) ||
    normalizeCtcValue(extractCtcFromJD(jdText));
  const role =
    safeString(findValueByAliases(source, FIELD_ALIASES.role)) ||
    extractRoleFromJD(jdText);
  const seniorityLevel = safeString(
    findValueByAliases(source, FIELD_ALIASES.seniority_level)
  );
  const experienceRequired =
    safeString(findValueByAliases(source, FIELD_ALIASES.experience_required)) ||
    extractExperienceFromJD(jdText);
  const coreSkills = dedupeList(
    normalizeArray(findValueByAliases(source, FIELD_ALIASES.core_skills))
  );
  const mandatorySkillsRaw = dedupeList(
    normalizeArray(findValueByAliases(source, FIELD_ALIASES.mandatory_skills))
  );
  const optionalSkillsRaw = dedupeList(
    normalizeArray(findValueByAliases(source, FIELD_ALIASES.optional_skills))
  );
  const toolsTechnologies = dedupeList(
    normalizeArray(findValueByAliases(source, FIELD_ALIASES.tools_technologies))
  );
  const complexityScore =
    normalizeComplexity(
      findValueByAliases(source, FIELD_ALIASES.complexity_score)
    ) || estimateComplexityFromJD(jdText);
  const location =
    safeString(findValueByAliases(source, FIELD_ALIASES.location)) ||
    extractLocationFromJD(jdText);
  const eligibilityCriteria = safeString(
    findValueByAliases(source, FIELD_ALIASES.eligibility_criteria)
  );
  const positionType = safeString(
    findValueByAliases(source, FIELD_ALIASES.position_type)
  );
  const category = safeString(
    findValueByAliases(source, FIELD_ALIASES.category)
  );
  const salaryInsights = normalizeNarrativeText(
    findValueByAliases(source, FIELD_ALIASES.salary_insights)
  );
  const skillTrendInsights = normalizeNarrativeText(
    findValueByAliases(source, FIELD_ALIASES.skill_trend_insights)
  );
  const placementDifficultyScore = normalizeNarrativeText(
    findValueByAliases(source, FIELD_ALIASES.placement_difficulty_score)
  );
  const marketSummary = normalizeNarrativeText(
    findValueByAliases(source, FIELD_ALIASES.market_summary)
  );

  let summary = safeString(findValueByAliases(source, FIELD_ALIASES.summary));
  if (!summary && marketSummary) {
    summary = marketSummary;
  }
  if (!summary) {
    summary = buildFallbackSummary(
      {
        company_name: companyName,
        role,
        experience_required: experienceRequired,
        location,
        core_skills: coreSkills,
        tools_technologies: toolsTechnologies
      },
      jdText
    );
  }

  const mandatorySkills =
    mandatorySkillsRaw.length > 0 ? mandatorySkillsRaw : coreSkills;
  const optionalSkills = dedupeList(
    (optionalSkillsRaw.length > 0 ? optionalSkillsRaw : toolsTechnologies).filter(
      (skill) =>
        !mandatorySkills.some(
          (mandatorySkill) =>
            mandatorySkill.toLowerCase() === safeString(skill).toLowerCase()
        )
    )
  );

  const qualityBase = {
    company_name: companyName,
    role,
    experience_required: experienceRequired,
    location,
    ctc,
    core_skills: mandatorySkills,
    tools_technologies: toolsTechnologies,
    summary
  };

  const missingFieldsFromApi = normalizeMissingFields(
    findValueByAliases(source, FIELD_ALIASES.missing_fields)
  );
  const missingFields =
    missingFieldsFromApi.length > 0
      ? missingFieldsFromApi
      : deriveMissingFields(qualityBase);
  const fallbackCompleteness = calculateCompletenessFromResult(qualityBase);
  const parsedCompleteness = normalizePercent(
    findValueByAliases(source, FIELD_ALIASES.jd_completeness)
  );
  const jdCompleteness =
    parsedCompleteness === null ? fallbackCompleteness : parsedCompleteness;
  const parsedConfidence = normalizePercent(
    findValueByAliases(source, FIELD_ALIASES.confidence_score)
  );
  const confidenceScore =
    parsedConfidence === null
      ? estimateConfidenceScore({
        ...qualityBase,
        jd_completeness: jdCompleteness,
        missing_fields: missingFields
      })
      : parsedConfidence;

  const targetSchoolRaw = safeString(
    findValueByAliases(source, FIELD_ALIASES.target_school)
  );
  let targetSchool = targetSchoolRaw || classifySchoolHeuristically(
    { role, category, core_skills: coreSkills },
    jdText
  );

  // Extract and process eligible courses
  let eligibleCourses = [];
  const coursesFromSource = findValueByAliases(source, FIELD_ALIASES.eligible_courses);
  if (Array.isArray(coursesFromSource) && coursesFromSource.length > 0) {
    eligibleCourses = coursesFromSource;
  } else {
    const sourceText = `${category} ${eligibilityCriteria} ${jdText}`;
    eligibleCourses = extractCoursesHeuristically(sourceText);
  }

  eligibleCourses = [...new Set(eligibleCourses.map(c => c.trim()))].filter(Boolean);
  if (eligibleCourses.length === 0) {
    const school = targetSchool || "";
    if (school.includes("SOE")) eligibleCourses = ["B.Tech (CSE)"];
    else if (school.includes("SOB")) eligibleCourses = ["MBA"];
    else if (school.includes("SOS")) eligibleCourses = ["B.Sc"];
    else if (school.includes("SOL")) eligibleCourses = ["LLB"];
    else if (school.includes("SOH")) eligibleCourses = ["BA"];
    else eligibleCourses = ["B.Tech"];
  }

  const courseSchoolMapping = {};
  const targetSchoolsSet = new Set();
  for (const course of eligibleCourses) {
    const school = classifyCourseToSchool(course);
    courseSchoolMapping[course] = school;
    targetSchoolsSet.add(school);
  }
  const targetSchools = Array.from(targetSchoolsSet);

  if (!targetSchool || !targetSchool.includes("School")) {
    targetSchool = targetSchools[0] || "School of Engineering (SOE)";
  }

  return {
    company_name: companyName,
    campus_placement_year: campusPlacementYear,
    ctc,
    role,
    seniority_level: seniorityLevel,
    experience_required: experienceRequired,
    eligibility_criteria: eligibilityCriteria,
    position_type: positionType,
    category,
    salary_insights: salaryInsights,
    skill_trend_insights: skillTrendInsights,
    placement_difficulty_score: placementDifficultyScore,
    market_summary: marketSummary,
    core_skills: coreSkills,
    mandatory_skills: mandatorySkills,
    optional_skills: optionalSkills,
    tools_technologies: toolsTechnologies,
    complexity_score: complexityScore,
    location,
    summary,
    confidence_score: confidenceScore,
    jd_completeness: jdCompleteness,
    missing_fields: missingFields,
    generated_by: safeString(findValueByAliases(source, FIELD_ALIASES.generated_by)),
    target_school: targetSchool,
    eligible_courses: eligibleCourses,
    course_school_mapping: courseSchoolMapping,
    target_schools: targetSchools
  };
}

// =============================
// 🔹 APPLY RESULT TO UI
// =============================
function applyAnalysisResult(result, options = {}) {
  const config = {
    saveHistory: true,
    sourceJd: textarea ? textarea.value.trim() : "",
    sourceFileName: "",
    ...options
  };

  companyNameEl.innerText = result.company_name || "Not specified";
  campusPlacementYearEl.innerText = result.campus_placement_year || "Not specified";
  ctcEl.innerText = result.ctc || "Not specified";
  locationEl.innerText = result.location || "Not specified";
  roleEl.innerText = result.role || "Not specified";
  seniorityEl.innerText = result.seniority_level || "Not specified";
  experienceEl.innerText = result.experience_required || "Not specified";

  if (eligibilityCriteriaEl) {
    eligibilityCriteriaEl.innerText = result.eligibility_criteria || "Not specified";
  }

  // Position type and category
  const positionTypeEl = document.getElementById("positionType");
  if (positionTypeEl) positionTypeEl.innerText = result.position_type || "Not specified";

  const categoryEl = document.getElementById("category");
  if (categoryEl) categoryEl.innerText = result.category || "Not specified";

  if (targetSchoolEl) {
    const schoolName = result.target_school || "Not specified";
    const schoolClassMap = {
      "School of Engineering (SOE)": "soe",
      "School of Business (SOB)": "sob",
      "School of Science (SOS)": "sos",
      "School of Humanity (SOH)": "soh",
      "School of Law (SOL)": "sol",
    };
    const cls = schoolClassMap[schoolName];
    if (cls) {
      targetSchoolEl.innerHTML = `<span class="school-badge-inline school-badge-${cls}">${schoolName}</span>`;
    } else {
      targetSchoolEl.textContent = schoolName;
    }
    // Also style the tile border
    const tile = document.getElementById("targetSchoolTile");
    if (tile && cls) {
      tile.setAttribute("data-school", cls);
    }
  }

  coreSkillsEl.innerHTML =
    result.core_skills.length > 0
      ? result.core_skills.map(s => `<span class="skill-chip">${s}</span>`).join("")
      : '<span class="skill-chip soft">Not detected</span>';
  toolsEl.innerHTML =
    result.tools_technologies.length > 0
      ? result.tools_technologies.map(s => `<span class="skill-chip">${s}</span>`).join("")
      : '<span class="skill-chip soft">Not detected</span>';
  complexityEl.innerText = result.complexity_score || "Not available";

  summaryEl.innerText = result.summary || "No summary provided";
  generatedByEl.innerText = result.generated_by
    ? `Generated by: ${result.generated_by}`
    : "";
  if (salaryInsightsEl) {
    salaryInsightsEl.innerText = result.salary_insights || "Not provided";
  }
  if (skillTrendInsightsEl) {
    skillTrendInsightsEl.innerText = result.skill_trend_insights || "Not provided";
  }
  if (placementDifficultyScoreEl) {
    placementDifficultyScoreEl.innerText =
      result.placement_difficulty_score || "Not provided";
  }
  if (marketSummaryEl) {
    marketSummaryEl.innerText = result.market_summary || "Not provided";
  }

  updateQualityPanel(result);
  renderCourseIntelligence(result);
  updateSkillPrioritySplit(result);
  updateSkillChart(result);

  resultSection.classList.remove("hidden");

  latestAnalysisRecord = createAnalysisRecord(
    result,
    config.sourceJd,
    config.sourceFileName
  );
  if (config.saveHistory) {
    saveRecordToHistory(latestAnalysisRecord);
  }
  refreshActionState();
}

// =============================
// 🔹 HELPERS
// =============================
async function parseWebhookResponse(response) {
  const raw = await response.text();
  const parsed = parsePossiblyJson(raw);

  if (!response.ok) {
    const msg = parsed && typeof parsed === "object"
      ? safeString(
        findValueByAliases(parsed, ["message", "error", "details", "reason"])
      )
      : safeString(raw).slice(0, 200);
    throw new Error(
      `Analysis failed (${response.status}${msg ? `: ${msg}` : ""})`
    );
  }

  if (parsed !== undefined) return parsed;
  return raw;
}

function parsePossiblyJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const direct = tryParseJson(trimmed);
  if (direct !== undefined) return direct;

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const fenced = tryParseJson(withoutFence);
  if (fenced !== undefined) return fenced;

  const jsonBlob = withoutFence.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonBlob) {
    const extracted = tryParseJson(jsonBlob[1]);
    if (extracted !== undefined) return extracted;
  }

  return undefined;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return undefined;
  }
}

function unwrapPayload(payload) {
  let current = parsePossiblyJson(payload);
  if (current === undefined) return payload;

  for (let i = 0; i < 6; i += 1) {
    if (Array.isArray(current)) {
      if (current.length === 1) {
        const next = parsePossiblyJson(current[0]);
        if (next === undefined) break;
        current = next;
        continue;
      }
      if (current.length > 0 && typeof current[0] === "object") {
        return current;
      }
      break;
    }

    if (!current || typeof current !== "object") break;

    const wrapperKeys = [
      "json",
      "data",
      "result",
      "analysis",
      "response",
      "body",
      "output"
    ];
    const nextKey = wrapperKeys.find(
      (key) => key in current && !isEmptyValue(current[key])
    );

    if (nextKey) {
      const next = parsePossiblyJson(current[nextKey]);
      if (next !== undefined && typeof next === "object") {
        current = next;
        continue;
      }
    }
    break;
  }
  return current;
}

function findValueByAliases(source, aliases) {
  if (!aliases || aliases.length === 0) return undefined;
  const normalizedAliases = new Set(aliases.map(normalizeKey));
  const queue = [source];
  const seen = new WeakSet();

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined || node === null) continue;

    if (typeof node === "string") {
      const parsed = parsePossiblyJson(node);
      if (parsed && typeof parsed === "object") queue.push(parsed);
      continue;
    }

    if (Array.isArray(node)) {
      for (const item of node) queue.push(item);
      continue;
    }

    if (typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    for (const [key, value] of Object.entries(node)) {
      if (normalizedAliases.has(normalizeKey(key)) && !isEmptyValue(value)) {
        return value;
      }
      queue.push(value);
    }
  }

  return undefined;
}

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeArray(item))
      .map((item) => safeString(item))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[,\n;|]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "object") {
    const preferred = [
      value.must_have,
      value.required,
      value.mandatory,
      value.skills,
      value.list
    ].find((candidate) => !isEmptyValue(candidate));
    if (preferred) return normalizeArray(preferred);
    return Object.values(value)
      .flatMap((item) => normalizeArray(item))
      .filter(Boolean);
  }
  return [];
}

function normalizeNarrativeText(value, seen = new WeakSet()) {
  if (value === undefined || value === null) return "";

  const direct = safeString(value);
  if (direct) return dedupeNarrativeSentences(direct);

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeNarrativeText(item, seen))
      .filter(Boolean);
    return dedupeNarrativeSentences(parts.join(". "));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "";
    seen.add(value);

    const parts = Object.values(value)
      .map((item) => normalizeNarrativeText(item, seen))
      .filter(Boolean);
    return dedupeNarrativeSentences(parts.join(". "));
  }

  return "";
}

// Removes repeated or near-duplicate sentences from a narrative string
function dedupeNarrativeSentences(text) {
  if (!text || typeof text !== "string") return text;
  // Split on sentence boundaries (., ;, \n) while keeping delimiter
  const sentences = text.split(/(?<=[.!?])\s+|(?<=;)\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const sent of sentences) {
    const key = sent.toLowerCase().replace(/[^a-z0-9]/g, "");
    // Skip if a very similar sentence already exists (>80% overlap)
    const isDupe = [...seen].some(k => {
      if (key === k) return true;
      // Check if one is a substring of the other (at least 20 chars)
      if (key.length >= 20 && k.includes(key.slice(0, Math.floor(key.length * 0.7)))) return true;
      if (k.length >= 20 && key.includes(k.slice(0, Math.floor(k.length * 0.7)))) return true;
      return false;
    });
    if (!isDupe) {
      seen.add(key);
      out.push(sent);
    }
  }
  return out.join(" ").trim();
}

function safeString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => safeString(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const candidates = [
      value.value,
      value.name,
      value.label,
      value.text,
      value.summary,
      value.content
    ];
    for (const candidate of candidates) {
      const text = safeString(candidate);
      if (text) return text;
    }
  }
  return "";
}

function normalizePlacementYear(value) {
  const text = safeString(value);
  const match = text.match(/\b(20\d{2})\b/);
  return match ? match[1] : "";
}

function normalizeComplexity(value) {
  if (value === undefined || value === null) return "";

  if (typeof value === "number") {
    const score = clampNumber(value, 1, 10);
    return `${score}/10 (${complexityBand(score)})`;
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "";
    if (/[a-z]/i.test(text) && /(low|medium|high|easy|hard|moderate)/i.test(text)) {
      return text;
    }
    const scoreMatch = text.match(/\b([0-9](?:\.[0-9])?)\b/);
    if (scoreMatch) {
      const score = clampNumber(Number(scoreMatch[1]), 1, 10);
      return `${score}/10 (${complexityBand(score)})`;
    }
    return text;
  }

  if (typeof value === "object") {
    const score = firstNumeric(
      value.score,
      value.value,
      value.complexity_score,
      value.complexity,
      value.rating
    );
    const label = safeString(value.label || value.level || value.band);
    if (score !== undefined) {
      const clamped = clampNumber(score, 1, 10);
      return `${clamped}/10 (${label || complexityBand(clamped)})`;
    }
    return label;
  }

  return "";
}

function normalizeCtcValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatNumericValue(value);
  }

  const text = safeString(value);
  if (!text) return "";

  const normalizedText = text.replace(/,/g, "");
  const rangeMatch = normalizedText.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/i
  );
  if (rangeMatch) {
    const upperBound = Number(rangeMatch[2]);
    return Number.isFinite(upperBound) ? formatNumericValue(upperBound) : "";
  }

  const numericMatch = normalizedText.match(/-?\d+(?:\.\d+)?/);
  if (!numericMatch) return "";
  return formatNumericValue(Number(numericMatch[0]));
}

function formatNumericValue(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function firstNumeric(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Number(value.toFixed(1))));
}

function classifyCourseToSchool(courseName) {
  const c = courseName.toLowerCase().trim();

  // 1. School of Law (SOL)
  if (/\b(llb|llm|law|legal|compliance|regulatory|solicitor|advocate|patent\s*law)\b/i.test(c)) {
    return "School of Law (SOL)";
  }

  // 2. School of Engineering (SOE)
  if (/\b(b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?c\.?a\.?|m\.?c\.?a\.?|cse|computer|software|engineering|devops|cloud|it|information\s*technology|ece|electronics|mechanical|civil|electrical|aerospace|data\s*engineering)\b/i.test(c)) {
    return "School of Engineering (SOE)";
  }

  // 3. School of Business (SOB)
  if (/\b(mba|bba|pgdm|b\.?com|m\.?com|finance|management|marketing|business|commerce|accounting|hr|recruiting|sales|bms)\b/i.test(c)) {
    return "School of Business (SOB)";
  }

  // 4. School of Science (SOS)
  if (/\b(b\.?sc|m\.?sc|ph\.?d|science|physics|chemistry|biology|math|statistics|stat|biotech|genomics|laboratory|data\s*science|data\s*analyst)\b/i.test(c)) {
    return "School of Science (SOS)";
  }

  // 5. School of Humanity (SOH)
  if (/\b(ba|ma|b\.?f\.?a|m\.?f\.?a|arts|humanities|design|writer|copywriter|journalist|communications|psychology|sociology|philosophy|literature|creative|ui\/ux)\b/i.test(c)) {
    return "School of Humanity (SOH)";
  }

  // Fallback keyword matching
  if (/tech|engineer|comput/i.test(c)) return "School of Engineering (SOE)";
  if (/business|commerce|manag|market|finance|sales/i.test(c)) return "School of Business (SOB)";
  if (/science|research|math|stat/i.test(c)) return "School of Science (SOS)";
  if (/arts|human|creative|design/i.test(c)) return "School of Humanity (SOH)";
  if (/law|legal/i.test(c)) return "School of Law (SOL)";

  return "School of Engineering (SOE)"; // Safe default
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

function classifySchoolHeuristically(result, jdText) {
  // Build search strings from structured fields ONLY.
  // Do NOT use full jdText — causes false positives (e.g. "llm" matching law)
  const role   = (result.role || "").toLowerCase().trim();
  const cat    = (result.category || "").toLowerCase().trim();
  const skills = (Array.isArray(result.core_skills)
    ? result.core_skills.join(" ")
    : String(result.core_skills || result.skills || "")).toLowerCase();
  const tools  = (Array.isArray(result.tools_technologies)
    ? result.tools_technologies.join(" ")
    : String(result.tools || "")).toLowerCase();
  const combined = `${role} ${cat} ${skills} ${tools}`;

  // ── 1. SOL — School of Law ──────────────────────────────────
  // Check role/category ONLY for legal terms. Never check jdText for "llm"
  // because "Large Language Model" is a tech term, not a law degree.
  const solTerms = [
    "legal counsel","compliance officer","advocate","attorney",
    "solicitor","paralegal","patent attorney","ip attorney","ip lawyer",
    "corporate lawyer","legal advisor","contract specialist",
    "patent research","patent researcher","patent analyst",
    "intellectual property","ip law","corporate law","contract law",
    "litigation","judiciary","legal associate","legal executive"
  ];
  const solCatTerms = ["legal","law","compliance","governance","regulatory"];
  if (
    solTerms.some(k => role.includes(k) || combined.includes(k)) ||
    solCatTerms.some(k => cat.includes(k)) ||
    role.includes("legal") || role.includes("law ")
  ) return "School of Law (SOL)";

  // ── 2. SOS role check FIRST (before SOE skill scan) ──────────
  // "Data Scientist with Python" must go to SOS, not SOE
  const sosRoleTerms = [
    "data scientist","research scientist","data analyst",
    "physicist","chemist","biologist","mathematician",
    "statistician","biotech","genomics","lab researcher",
    "research analyst","quantitative analyst","quant analyst",
    "machine learning researcher","ml researcher"
  ];
  const sosScienceSkills = [
    "data science","statistical modeling","r programming","matlab",
    "spss","bioinformatics","laboratory","scientific research"
  ];
  const sosCatTerms = [
    "data science","research","analytics","biotech",
    "pharmaceutical","laboratory","statistics","science"
  ];
  if (
    sosRoleTerms.some(k => role.includes(k)) ||
    sosScienceSkills.some(k => skills.includes(k)) ||
    sosCatTerms.some(k => cat.includes(k))
  ) return "School of Science (SOS)";

  // ── 3. SOE — School of Engineering (checked BEFORE SOH!) ─────
  const soeRoleTerms = [
    "engineer","developer","programmer","software","devops","cloud",
    "frontend","backend","fullstack","full stack","full-stack",
    "sre","site reliability","network","embedded","hardware",
    "cybersecurity","security analyst","database admin","dba",
    "infrastructure","mobile","android","ios","architect","tech lead",
    "cto","data engineer","ml engineer","ai engineer",
    "machine learning engineer","platform engineer","solutions engineer",
    "qa engineer","test engineer","automation engineer","robotics"
  ];
  const soeTechSkills = [
    "javascript","typescript","python","java","c++","c#","golang",
    "rust","kotlin","swift","php","ruby","react","angular","vue",
    "node.js","nodejs","express","django","flask","spring","laravel",
    "fastapi","nextjs","flutter","react native",
    "aws","azure","gcp","google cloud","kubernetes","docker",
    "terraform","jenkins","ci/cd","git","linux","bash",
    "rest api","graphql","microservices","mongodb","postgresql",
    "mysql","redis","elasticsearch","tensorflow","pytorch",
    "deep learning","nlp","computer vision",
    "sql","nosql","data structures","algorithms","system design",
    "large language model","llm integration","llm fine-tuning"
  ];
  const soeCatTerms = [
    "software engineering","software development","engineering",
    "technology","information technology","devops","cloud",
    "cybersecurity","data engineering","product engineering"
  ];
  if (
    soeRoleTerms.some(k => role.includes(k)) ||
    soeTechSkills.some(k => skills.includes(k) || tools.includes(k)) ||
    soeCatTerms.some(k => cat.includes(k))
  ) return "School of Engineering (SOE)";

  // ── 4. SOB — School of Business ─────────────────────────────
  const sobRoleTerms = [
    "business analyst","product manager","marketing","sales",
    "finance","accounting","accountant","operations manager",
    "supply chain","logistics","brand manager","growth",
    "strategy","management consultant","investment","equity",
    "trading","audit","tax","treasury","hr manager",
    "human resource","recruiter","talent acquisition",
    "customer success","account manager","business development",
    "ceo","cfo","coo"
  ];
  const sobQualTerms = ["mba","bba","bcom","b.com","cfa","cpa"];
  const sobCatTerms = [
    "business","marketing","sales","finance","management",
    "operations","consulting","strategy","human resources"
  ];
  if (
    sobRoleTerms.some(k => role.includes(k)) ||
    sobQualTerms.some(k => combined.includes(k)) ||
    sobCatTerms.some(k => cat.includes(k))
  ) return "School of Business (SOB)";

  // ── 5. SOH — School of Humanity (most restrictive, last) ────
  const sohRoleTerms = [
    "graphic designer","ux designer","ui designer","product designer",
    "visual designer","content writer","copywriter","journalist",
    "editor","creative director","art director","animator",
    "social media manager","public relations","communications manager",
    "psychologist","counselor","therapist","social worker",
    "teacher","educator","professor","trainer",
    "linguist","translator","photographer","videographer"
  ];
  const sohCatTerms = [
    "design","media","communications","arts","humanities",
    "psychology","education","creative"
  ];
  if (
    sohRoleTerms.some(k => role.includes(k)) ||
    sohCatTerms.some(k => cat.includes(k))
  ) return "School of Humanity (SOH)";

  // Default — most campus placements are engineering-oriented
  return "School of Engineering (SOE)";
}


function complexityBand(score) {
  if (score <= 3.5) return "Low";
  if (score <= 6.5) return "Medium";
  return "High";
}

function estimateComplexityFromJD(jdText) {
  const words = jdText.trim().split(/\s+/).filter(Boolean).length;
  const years = extractMaxExperienceYears(jdText);
  const advancedMatches = jdText.match(
    /\b(system design|distributed|microservices|architecture|kubernetes|scalability|leadership|machine learning|optimization)\b/gi
  );

  let score = 3;
  if (words > 300) score += 1;
  if (words > 650) score += 1;
  if (years >= 4) score += 1;
  if (years >= 8) score += 1;
  if (advancedMatches) score += Math.min(3, advancedMatches.length);
  score = clampNumber(score, 1, 10);

  return `${score}/10 (${complexityBand(score)})`;
}

function extractMaxExperienceYears(text) {
  const years = [...text.matchAll(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi)].map(
    (match) => Number(match[1])
  );
  return years.length > 0 ? Math.max(...years) : 0;
}

function extractPlacementYearFromJD(text) {
  const contextualMatches = [
    ...text.matchAll(
      /(?:placement|campus|batch|pass(?:ing|out)|graduat(?:ing|ion)|cycle)\D{0,25}(20\d{2})/gi
    )
  ].map((match) => match[1]);

  if (contextualMatches.length > 0) return contextualMatches[0];

  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) =>
    Number(match[1])
  );
  if (years.length === 0) return "";

  const currentYear = new Date().getFullYear();
  const sorted = years.filter((year) => year >= currentYear - 1 && year <= currentYear + 5);
  if (sorted.length > 0) return String(sorted[0]);

  return String(years[0]);
}

function extractCompanyFromJD(text) {
  const explicit = text.match(
    /(?:company\s*name|company|organization|employer)\s*[:\-]\s*([^\n,;|]+)/i
  );
  if (explicit) return explicit[1].trim();

  const suffixMatch = text.match(
    /\b([A-Z][A-Za-z0-9&.' -]{2,}\s(?:Inc\.?|LLC|Ltd\.?|Corporation|Corp\.?|Technologies|Technology|Solutions|Systems|Labs|Pvt\.?\s*Ltd\.?))\b/
  );
  if (suffixMatch) return suffixMatch[1].trim();

  return "";
}

function extractCtcFromJD(text) {
  const match = text.match(
    /\b(?:ctc|salary|compensation|package)\s*[:\-]?\s*([^\n,;|]+)/i
  );
  return match ? match[1].trim() : "";
}

function extractRoleFromJD(text) {
  const match = text.match(/\b(?:role|position|designation|title)\s*[:\-]\s*([^\n,;|]+)/i);
  return match ? match[1].trim() : "";
}

function extractExperienceFromJD(text) {
  const match = text.match(
    /\b(?:experience|exp(?:erience)?\s*required)\s*[:\-]?\s*([^\n,;|]+)/i
  );
  return match ? match[1].trim() : "";
}

function extractLocationFromJD(text) {
  const match = text.match(
    /\b(?:location|work\s*location|job\s*location)\s*[:\-]\s*([^\n,;|]+)/i
  );
  return match ? match[1].trim() : "";
}

function dedupeList(items) {
  const seen = new Set();
  const output = [];
  for (const rawItem of items) {
    const item = safeString(rawItem);
    if (!item) continue;
    const key = item.toLowerCase().trim();
    // Exact duplicate
    if (seen.has(key)) continue;
    // Also skip if a nearly identical existing entry already covers this
    // (e.g. "React.js" vs "React", "Node.js" vs "Node")
    const isFuzzyDupe = [...seen].some(existing => {
      const shorter = key.length < existing.length ? key : existing;
      const longer = key.length < existing.length ? existing : key;
      // If shorter is contained in longer and covers >= 80% of it
      if (shorter.length >= 3 && longer.includes(shorter)) {
        return shorter.length / longer.length >= 0.8;
      }
      return false;
    });
    if (isFuzzyDupe) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function buildFallbackSummary(result, jdText) {
  const lines = [];

  if (result.role) lines.push(`Role: ${result.role}.`);
  if (result.company_name) lines.push(`Company: ${result.company_name}.`);
  if (result.experience_required) {
    lines.push(`Experience required: ${result.experience_required}.`);
  }
  if (result.location) lines.push(`Location: ${result.location}.`);
  if (result.core_skills.length > 0) {
    lines.push(`Core skills: ${result.core_skills.slice(0, 6).join(", ")}.`);
  }
  if (result.tools_technologies.length > 0) {
    lines.push(`Tools: ${result.tools_technologies.slice(0, 6).join(", ")}.`);
  }

  if (lines.length > 0) return lines.join(" ");

  const compact = jdText.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > 260 ? `${compact.slice(0, 260)}...` : compact;
}

function setApiStatus(message, status = "info") {
  if (!apiStatus) return;
  const text = safeString(message);
  if (!text) {
    apiStatus.classList.add("hidden");
    apiStatus.textContent = "";
    return;
  }

  apiStatus.textContent = text;
  apiStatus.classList.remove("hidden");
  apiStatus.classList.remove("info", "success", "warning", "error");

  const tone = typeof status === "string" ? status : status ? "error" : "info";
  apiStatus.classList.add(["info", "success", "warning", "error"].includes(tone) ? tone : "info");
}

function initializeInteractionHandlers() {
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", analyzeJD);
  }

  if (browseBtn) {
    browseBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (fileUpload) fileUpload.click();
    });
  }

  if (textarea) {
    updateTextareaMeta();
    textarea.addEventListener("input", () => {
      updateTextareaMeta();
      if (isHydratingTextarea) return;
      if (uploadedJdBatch.length > 0) {
        uploadedJdBatch = [];
        clearBatchResultsView();
        updateSelectedFileMeta();
        setApiStatus("Switched to manual JD mode.", "info");
      }
    });
    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        analyzeJD();
      }
    });
  }

  if (exportJsonBtn) exportJsonBtn.addEventListener("click", exportLatestAsJson);
  if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportLatestAsCsv);
  if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearHistory);
}

function initializeHistory() {
  analysisHistory = loadHistoryFromStorage();
  latestAnalysisRecord = analysisHistory[0] || null;
  renderHistoryList();
  refreshActionState();
}

function createAnalysisRecord(result, sourceJd, sourceFileName = "") {
  const now = new Date();
  // Compute IST (UTC+5:30) manually for reliable cross-browser output
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs + now.getTimezoneOffset() * 60 * 1000);

  const dd = String(ist.getDate()).padStart(2, "0");
  const mmm = ist.toLocaleString("en", { month: "short" });
  const yyyy = ist.getFullYear();
  const hh = ist.getHours();
  const min = String(ist.getMinutes()).padStart(2, "0");
  const ss = String(ist.getSeconds()).padStart(2, "0");
  const ampm = hh >= 12 ? "pm" : "am";
  const hh12 = String(hh % 12 || 12).padStart(2, "0");

  const istTimestamp = `${dd} ${mmm} ${yyyy}, ${hh12}:${min}:${ss} ${ampm}`;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: now.toISOString(),
    created_at_ist: istTimestamp,
    jd_text: safeString(sourceJd),
    source_file: safeString(sourceFileName),
    result: clonePlainData(result)
  };
}

function clonePlainData(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

function saveRecordToHistory(record) {
  analysisHistory = [record, ...analysisHistory.filter((item) => item.id !== record.id)]
    .slice(0, HISTORY_LIMIT);
  persistHistory();
  renderHistoryList();
}

function persistHistory() {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(analysisHistory));
  } catch (error) {
    console.warn("Unable to save history to localStorage.", error);
  }
}

function loadHistoryFromStorage() {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object" && item.result)
      .slice(0, HISTORY_LIMIT);
  } catch (_) {
    return [];
  }
}

function clearHistory() {
  if (analysisHistory.length === 0) return;
  const shouldClear = window.confirm("Clear all saved analyses?");
  if (!shouldClear) return;

  analysisHistory = [];
  persistHistory();
  renderHistoryList();
  refreshActionState();
  clearBatchResultsView();
  setApiStatus("Analysis history cleared.", "warning");
}

function renderHistoryList() {
  if (!historyListEl) return;
  historyListEl.innerHTML = "";

  if (analysisHistory.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "history-empty";
    emptyState.innerText = "No analyses saved yet. Run at least one analysis to build history.";
    historyListEl.appendChild(emptyState);
    return;
  }

  for (const item of analysisHistory) {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";

    const meta = document.createElement("div");
    meta.className = "history-meta";

    const title = document.createElement("strong");
    title.innerText = buildHistoryTitle(item.result);
    meta.appendChild(title);

    const detail = document.createElement("p");
    const sourceFile = safeString(item.source_file);
    detail.innerText = `${formatDateTime(item.created_at)} | ${sourceFile ? `${sourceFile} | ` : ""
      }${truncateText(item.jd_text, 90)}`;
    meta.appendChild(detail);

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "tiny-btn";
    loadBtn.innerText = "Load";
    loadBtn.addEventListener("click", () => loadHistoryRecord(item.id));
    actions.appendChild(loadBtn);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "tiny-btn danger";
    removeBtn.innerText = "Delete";
    removeBtn.addEventListener("click", () => deleteHistoryRecord(item.id));
    actions.appendChild(removeBtn);

    historyItem.appendChild(meta);
    historyItem.appendChild(actions);
    historyListEl.appendChild(historyItem);
  }
}

function buildHistoryTitle(result) {
  const role = safeString(result && result.role);
  const company = safeString(result && result.company_name);
  if (role && company) return `${role} at ${company}`;
  if (role) return role;
  if (company) return company;
  return "JD Analysis";
}

function loadHistoryRecord(recordId) {
  const selected = analysisHistory.find((item) => item.id === recordId);
  if (!selected) return;
  const sourceJd = safeString(selected.jd_text);
  const sourceFile = safeString(selected.source_file);
  const normalizedResult = normalizeResult(selected.result, sourceJd);

  if (textarea) {
    isHydratingTextarea = true;
    textarea.value = sourceJd;
    isHydratingTextarea = false;
    updateTextareaMeta();
  }
  uploadedJdBatch = sourceFile
    ? [{ file_name: sourceFile, jd_text: sourceJd }]
    : [];
  updateSelectedFileMeta();

  applyAnalysisResult(normalizedResult, {
    saveHistory: false,
    sourceJd,
    sourceFileName: sourceFile
  });
  latestAnalysisRecord = { ...selected, result: normalizedResult };
  refreshActionState();
  setApiStatus("Loaded analysis from history.", "info");

  if (resultSection) {
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function deleteHistoryRecord(recordId) {
  analysisHistory = analysisHistory.filter((item) => item.id !== recordId);
  persistHistory();
  renderHistoryList();
  refreshActionState();
}

function refreshActionState() {
  const hasLatest = Boolean(latestAnalysisRecord && latestAnalysisRecord.result);
  if (exportJsonBtn) exportJsonBtn.disabled = !hasLatest;
  if (exportCsvBtn) exportCsvBtn.disabled = !hasLatest;
  if (clearHistoryBtn) clearHistoryBtn.disabled = analysisHistory.length === 0;
  if (historyCountEl) historyCountEl.innerText = `${analysisHistory.length} saved`;
}

function exportLatestAsJson() {
  if (!latestAnalysisRecord || !latestAnalysisRecord.result) return;

  const payload = {
    exported_at: new Date().toISOString(),
    jd_text: latestAnalysisRecord.jd_text,
    source_file: safeString(latestAnalysisRecord.source_file),
    result: latestAnalysisRecord.result
  };
  downloadFile(
    "jd-analysis.json",
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
  setApiStatus("Exported latest result as JSON.", "success");
}

function exportLatestAsCsv() {
  if (!latestAnalysisRecord || !latestAnalysisRecord.result) return;
  const csvData = convertResultToCsv({
    source_file: safeString(latestAnalysisRecord.source_file),
    ...latestAnalysisRecord.result
  });
  downloadFile("jd-analysis.csv", csvData, "text/csv;charset=utf-8");
  setApiStatus("Exported latest result as CSV.", "success");
}

function convertResultToCsv(result) {
  const rows = [["field", "value"]];
  for (const [key, rawValue] of Object.entries(result || {})) {
    const value = Array.isArray(rawValue) ? rawValue.join(" | ") : safeString(rawValue);
    rows.push([key, value]);
  }
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");
}

function downloadFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
}

function updateTextareaMeta() {
  if (!charCountEl || !textarea) return;
  charCountEl.innerText = `${textarea.value.length} characters`;
}

function getValidBatchEntries() {
  return uploadedJdBatch.filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      safeString(entry.file_name) &&
      safeString(entry.jd_text)
  );
}

function updateSelectedFileMeta(fileName = "") {
  if (!selectedFileEl) return;
  const validEntries = getValidBatchEntries();

  if (validEntries.length > 1) {
    const firstName = validEntries[0].file_name;
    selectedFileEl.innerText = `Selected: ${validEntries.length} files (${firstName} +${validEntries.length - 1} more)`;
    return;
  }

  if (validEntries.length === 1) {
    selectedFileEl.innerText = `Selected: ${validEntries[0].file_name}`;
    return;
  }

  const cleanedName = safeString(fileName);
  selectedFileEl.innerText = cleanedName
    ? `Selected: ${cleanedName}`
    : "No file selected";
}

function clearBatchResultsView() {
  latestBatchResults = [];
  renderBatchResults();
}

function renderBatchResults(overrideSummary = "") {
  if (!batchPanelEl || !batchTableBodyEl || !batchCountEl || !batchSummaryEl) return;

  const rows = Array.isArray(latestBatchResults) ? latestBatchResults : [];
  if (rows.length === 0) {
    batchPanelEl.classList.add("hidden");
    batchTableBodyEl.innerHTML = "";
    batchSummaryEl.innerText =
      "Upload multiple JDs and run analysis to see detailed file status here.";
    batchCountEl.innerText = "0 files";
    return;
  }

  batchPanelEl.classList.remove("hidden");
  batchTableBodyEl.innerHTML = "";
  batchCountEl.innerText = `${rows.length} file${rows.length === 1 ? "" : "s"}`;
  batchSummaryEl.innerText = overrideSummary || buildBatchSummaryText(rows);

  for (const row of rows) {
    const tableRow = document.createElement("tr");

    const fileCell = document.createElement("td");
    fileCell.className = "batch-file";
    fileCell.innerText = safeString(row.file_name) || "Untitled file";
    tableRow.appendChild(fileCell);

    const statusCell = document.createElement("td");
    const statusPill = document.createElement("span");
    const statusKey = normalizeBatchStatusKey(row.status);
    statusPill.className = `status-pill ${statusKey}`;
    statusPill.innerText = formatBatchStatusLabel(statusKey);
    statusCell.appendChild(statusPill);
    tableRow.appendChild(statusCell);

    const companyCell = document.createElement("td");
    companyCell.innerText = safeString(row.company_name) || "--";
    tableRow.appendChild(companyCell);

    const roleCell = document.createElement("td");
    roleCell.innerText = safeString(row.role) || "--";
    tableRow.appendChild(roleCell);

    const confidenceCell = document.createElement("td");
    const confidence = normalizePercent(row.confidence_score);
    confidenceCell.innerText = confidence === null ? "--" : `${confidence}%`;
    tableRow.appendChild(confidenceCell);

    const errorCell = document.createElement("td");
    errorCell.innerText = safeString(row.error_message) || "--";
    tableRow.appendChild(errorCell);

    const actionCell = document.createElement("td");
    if (statusKey === "success" && safeString(row.history_id)) {
      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "tiny-btn";
      loadBtn.innerText = "Load";
      loadBtn.addEventListener("click", () => loadHistoryRecord(row.history_id));
      actionCell.appendChild(loadBtn);
    } else {
      actionCell.innerText = "--";
    }
    tableRow.appendChild(actionCell);

    batchTableBodyEl.appendChild(tableRow);
  }
}

function buildBatchSummaryText(rows) {
  const counts = {
    queued: 0,
    running: 0,
    success: 0,
    failed: 0
  };

  for (const row of rows) {
    const status = normalizeBatchStatusKey(row && row.status);
    counts[status] = (counts[status] || 0) + 1;
  }

  if (counts.running > 0 || counts.queued > 0) {
    return `Processing batch... ${counts.success} done, ${counts.running} running, ${counts.queued} queued, ${counts.failed} failed.`;
  }

  if (counts.failed > 0) {
    return `Batch finished with partial success: ${counts.success} successful, ${counts.failed} failed.`;
  }

  return `Batch finished successfully: ${counts.success} file${counts.success === 1 ? "" : "s"} analyzed.`;
}

function normalizeBatchStatusKey(status) {
  const normalized = safeString(status).toLowerCase();
  if (["queued", "running", "success", "failed"].includes(normalized)) {
    return normalized;
  }
  return "queued";
}

function formatBatchStatusLabel(status) {
  const labels = {
    queued: "Queued",
    running: "Running",
    success: "Success",
    failed: "Failed"
  };
  return labels[status] || "Queued";
}

function formatDateTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  // Compute IST (UTC+5:30) manually
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffsetMs + date.getTimezoneOffset() * 60 * 1000);

  const dd = String(ist.getDate()).padStart(2, "0");
  const mmm = ist.toLocaleString("en", { month: "short" });
  const yyyy = ist.getFullYear();
  const hh = ist.getHours();
  const min = String(ist.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "pm" : "am";
  const hh12 = String(hh % 12 || 12).padStart(2, "0");

  return `${dd} ${mmm} ${yyyy}, ${hh12}:${min} ${ampm}`;
}

function truncateText(value, maxLength) {
  const text = safeString(value);
  if (!text) return "No JD preview";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function normalizePercent(value) {
  if (value === undefined || value === null) return null;

  const toPercent = (numericValue) => {
    if (!Number.isFinite(numericValue)) return null;
    const normalized = Math.abs(numericValue) < 1 ? numericValue * 100 : numericValue;
    return clampPercent(normalized);
  }

  if (typeof value === "number") return toPercent(value);

  if (typeof value === "string") {
    const parsed = value.match(/-?\d+(?:\.\d+)?/);
    if (!parsed) return null;
    return toPercent(Number(parsed[0]));
  }

  if (typeof value === "object") {
    const numeric = firstNumeric(
      value.percent,
      value.percentage,
      value.score,
      value.value,
      value.confidence,
      value.completeness
    );
    return numeric === undefined ? null : toPercent(numeric);
  }

  return null;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeMissingFields(value) {
  if (value === undefined || value === null) return [];
  const isNone = (text) => /^(none|no|nil|na|n\/a)$/i.test(safeString(text));

  if (Array.isArray(value)) {
    return dedupeList(
      value
        .flatMap((item) => normalizeMissingFields(item))
        .map((item) => safeString(item).replace(/^[-*•]\s*/, ""))
        .filter((item) => item && !isNone(item))
    );
  }

  if (typeof value === "string") {
    const parsed = parsePossiblyJson(value);
    if (parsed !== undefined && parsed !== value) {
      return normalizeMissingFields(parsed);
    }

    const cleaned = value
      .replace(/^missing(?:\s+fields?)?\s*[:\-]\s*/i, "")
      .trim();
    if (!cleaned || isNone(cleaned)) return [];

    const parts = cleaned
      .split(/[,\n;|]/)
      .map((item) => item.trim())
      .filter((item) => item && !isNone(item));
    return dedupeList(parts);
  }

  if (typeof value === "object") {
    const booleanKeys = Object.entries(value)
      .filter(([, state]) => state === true)
      .map(([key]) => key.replace(/_/g, " "));
    if (booleanKeys.length > 0) return dedupeList(booleanKeys);

    return dedupeList(
      Object.values(value)
        .flatMap((item) => normalizeMissingFields(item))
        .filter(Boolean)
    );
  }

  return [];
}

function deriveMissingFields(result) {
  return QUALITY_REQUIRED_FIELDS.filter(({ key }) => {
    const value = result[key];
    if (Array.isArray(value)) return value.length === 0;
    return safeString(value) === "";
  }).map(({ label }) => label);
}

function calculateCompletenessFromResult(result) {
  const totalFields = QUALITY_REQUIRED_FIELDS.length;
  if (totalFields === 0) return 0;
  const missingCount = deriveMissingFields(result).length;
  return clampPercent(((totalFields - missingCount) / totalFields) * 100);
}

function estimateConfidenceScore(result) {
  const completeness = normalizePercent(result.jd_completeness);
  const baseCompleteness =
    completeness === null ? calculateCompletenessFromResult(result) : completeness;

  let score = baseCompleteness * 0.72;
  if (Array.isArray(result.core_skills) && result.core_skills.length > 0) score += 10;
  if (Array.isArray(result.tools_technologies) && result.tools_technologies.length > 0) {
    score += 7;
  }
  if (safeString(result.summary)) score += 6;
  if (safeString(result.generated_by)) score += 3;

  const missingCount = Array.isArray(result.missing_fields)
    ? result.missing_fields.length
    : 0;
  score -= Math.min(18, missingCount * 3);

  return clampPercent(score);
}

function updateQualityPanel(result) {
  const confidenceValue = normalizePercent(result.confidence_score);
  const completenessValue = normalizePercent(result.jd_completeness);

  if (confidenceScoreEl) {
    confidenceScoreEl.innerText =
      confidenceValue === null ? "--%" : `${confidenceValue}%`;
  }
  if (jdCompletenessEl) {
    jdCompletenessEl.innerText =
      completenessValue === null ? "--%" : `${completenessValue}%`;
  }

  setProgressBar(confidenceBarEl, confidenceValue, "#2d8a8e");
  setProgressBar(completenessBarEl, completenessValue, "#cc6d24");

  if (!missingFieldsEl) return;
  missingFieldsEl.innerHTML = "";

  const missing = Array.isArray(result.missing_fields)
    ? dedupeList(result.missing_fields)
    : [];

  if (missing.length === 0) {
    const item = document.createElement("li");
    item.innerText = "No critical missing fields.";
    missingFieldsEl.appendChild(item);
    return;
  }

  for (const entry of missing) {
    const item = document.createElement("li");
    item.innerText = entry;
    missingFieldsEl.appendChild(item);
  }
}

function renderCourseIntelligence(result) {
  const container = document.getElementById("courseSchoolMappingContainer");
  if (!container) return;

  const courses = result.eligible_courses || [];
  const mapping = result.course_school_mapping || {};

  if (courses.length === 0) {
    container.innerHTML = `<p class="history-empty">No eligible courses detected</p>`;
    return;
  }

  // Group courses by school
  const grouped = {};
  for (const course of courses) {
    const school = mapping[course] || "School of Engineering (SOE)";
    if (!grouped[school]) {
      grouped[school] = [];
    }
    grouped[school].push(course);
  }

  const schoolMeta = {
    "School of Engineering (SOE)": { cls: "soe", icon: "engineering", title: "Engineering & Computing" },
    "School of Business (SOB)": { cls: "sob", icon: "payments", title: "Business & Management" },
    "School of Science (SOS)": { cls: "sos", icon: "science", title: "Science & Analytics" },
    "School of Humanity (SOH)": { cls: "soh", icon: "palette", title: "Humanity & Design" },
    "School of Law (SOL)": { cls: "sol", icon: "gavel", title: "Law & Compliance" }
  };

  let html = "";
  for (const [school, schoolCourses] of Object.entries(grouped)) {
    const meta = schoolMeta[school] || { cls: "soe", icon: "school", title: school };
    
    html += `
      <div class="course-school-group group-${meta.cls}">
        <div class="course-school-group-header">
          <span class="material-symbols-rounded group-icon">${meta.icon}</span>
          <div>
            <h4>${school}</h4>
            <span class="group-subtitle">${meta.title}</span>
          </div>
        </div>
        <div class="course-pills-list">
          ${schoolCourses.map(course => `<span class="course-pill-item badge-${meta.cls}">${course}</span>`).join("")}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function setProgressBar(element, value, color) {
  if (!element) return;
  const safeValue = value === null ? 0 : clampPercent(value);
  element.style.width = `${safeValue}%`;
  element.style.background = color;
}

function updateSkillPrioritySplit(result) {
  const mandatorySkills = dedupeList(
    Array.isArray(result.mandatory_skills)
      ? result.mandatory_skills
      : Array.isArray(result.core_skills)
        ? result.core_skills
        : []
  );
  const optionalSkills = dedupeList(
    (
      Array.isArray(result.optional_skills)
        ? result.optional_skills
        : Array.isArray(result.tools_technologies)
          ? result.tools_technologies
          : []
    ).filter(
      (skill) =>
        !mandatorySkills.some(
          (mandatory) => mandatory.toLowerCase() === safeString(skill).toLowerCase()
        )
    )
  );

  renderSkillChips(
    mandatorySkillsEl,
    mandatorySkills,
    "mandatory",
    "No must-have skills detected"
  );
  renderSkillChips(
    optionalSkillsEl,
    optionalSkills,
    "optional",
    "No nice-to-have skills detected"
  );
}

function renderSkillChips(container, skills, toneClass, emptyMessage) {
  if (!container) return;
  container.innerHTML = "";

  if (!skills || skills.length === 0) {
    const placeholder = document.createElement("span");
    placeholder.className = "skill-chip soft";
    placeholder.innerText = emptyMessage;
    container.appendChild(placeholder);
    return;
  }

  for (const skill of skills) {
    const chip = document.createElement("span");
    chip.className = `skill-chip ${toneClass}`;
    chip.innerText = skill;
    container.appendChild(chip);
  }
}

function updateSkillChart(result) {
  if (!skillChartEl || !window.Chart) return;

  const mandatoryCount = Array.isArray(result.mandatory_skills)
    ? result.mandatory_skills.length
    : Array.isArray(result.core_skills)
      ? result.core_skills.length
      : 0;
  const optionalCount = Array.isArray(result.optional_skills)
    ? result.optional_skills.length
    : Array.isArray(result.tools_technologies)
      ? result.tools_technologies.length
      : 0;
  const hasSkillData = mandatoryCount + optionalCount > 0;
  const chartData = hasSkillData ? [mandatoryCount, optionalCount] : [1, 1];
  const chartColors = hasSkillData
    ? ["#d98a43", "#2d8a8e"]
    : ["#d7dbe0", "#eceff3"];

  if (skillChartInstance) {
    skillChartInstance.data.datasets[0].data = chartData;
    skillChartInstance.data.datasets[0].backgroundColor = chartColors;
    skillChartInstance.update();
    return;
  }

  skillChartInstance = new window.Chart(skillChartEl, {
    type: "doughnut",
    data: {
      labels: ["Must-Have", "Nice-to-Have"],
      datasets: [
        {
          data: chartData,
          backgroundColor: chartColors,
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 12,
            color: "#4b5563",
            font: {
              size: 12,
              weight: "600"
            }
          }
        }
      }
    }
  });
}

// =============================
// FILE UPLOAD + EXTRACTION
// =============================
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

function initializeUploadHandlers() {
  if (dropZone) {
    dropZone.addEventListener("click", (event) => {
      if (event.target && event.target.closest("button")) return;
      if (fileUpload) fileUpload.click();
    });

    dropZone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (fileUpload) fileUpload.click();
    });

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("drag-active");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-active");
    });

    // Support folder + file drag-and-drop with recursive directory traversal
    dropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropZone.classList.remove("drag-active");

      const items = event.dataTransfer?.items;
      if (items && items.length > 0) {
        // Check if any item is a directory using webkitGetAsEntry
        const entries = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
          if (entry) entries.push(entry);
        }

        if (entries.length > 0 && entries.some(e => e.isDirectory)) {
          // Recursively collect all files from directories
          setApiStatus("Scanning folders for JD files...", "info");
          const allFiles = await collectFilesFromEntries(entries);
          if (allFiles.length === 0) {
            setApiStatus("No supported files found in the dropped folder(s).", "warning");
            return;
          }
          await handleSelectedFiles(allFiles);
          return;
        }
      }

      // Fallback: plain file drop
      const files = normalizeFiles(event.dataTransfer?.files);
      if (files.length === 0) return;
      await handleSelectedFiles(files);
    });
  }

  // Standard file input
  if (fileUpload) {
    fileUpload.addEventListener("change", async (event) => {
      const files = normalizeFiles(event.target?.files);
      if (files.length === 0) return;
      await handleSelectedFiles(files);
      fileUpload.value = "";
    });
  }

  // Folder input
  const folderUpload = document.getElementById("folderUpload");
  if (folderUpload) {
    folderUpload.addEventListener("change", async (event) => {
      const files = normalizeFiles(event.target?.files);
      if (files.length === 0) return;
      setApiStatus(`Found ${files.length} file(s) in folder. Filtering supported types...`, "info");
      await handleSelectedFiles(files);
      folderUpload.value = "";
    });
  }

  // Folder browse button
  const folderBrowseBtn = document.getElementById("folderBrowseBtn");
  if (folderBrowseBtn) {
    folderBrowseBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const folderInput = document.getElementById("folderUpload");
      if (folderInput) folderInput.click();
    });
  }

  updateSelectedFileMeta();
}

// Recursively collect File objects from FileSystemEntry items (for drag-and-drop folders)
async function collectFilesFromEntries(entries) {
  const allFiles = [];

  async function readEntry(entry) {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });
      allFiles.push(file);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch;
      do {
        batch = await new Promise((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });
        for (const childEntry of batch) {
          await readEntry(childEntry);
        }
      } while (batch.length > 0);
    }
  }

  for (const entry of entries) {
    await readEntry(entry);
  }

  return allFiles;
}

function normalizeFiles(filesLike) {
  if (!filesLike) return [];
  return Array.from(filesLike).filter(
    (file) => file && typeof file === "object" && safeString(file.name)
  );
}

async function handleSelectedFiles(files) {
  const pickedFiles = normalizeFiles(files);
  if (pickedFiles.length === 0) return;

  const supportedFiles = [];
  const unsupportedFiles = [];
  for (const file of pickedFiles) {
    const extension = getFileExtension(file.name);
    if (SUPPORTED_EXTENSIONS.includes(extension)) {
      supportedFiles.push(file);
      continue;
    }
    unsupportedFiles.push(file.name);
  }

  if (supportedFiles.length === 0) {
    const message = "Unsupported file(s). Please upload PDF, DOCX, or TXT files.";
    setApiStatus(message, "error");
    alert(message);
    return;
  }

  loader.classList.remove("hidden");
  setApiStatus(
    `Extracting JD text from ${supportedFiles.length} file${supportedFiles.length === 1 ? "" : "s"
    }...`,
    "info"
  );

  try {
    const extractedBatch = [];
    const unreadableFiles = [];

    for (let index = 0; index < supportedFiles.length; index += 1) {
      const file = supportedFiles[index];
      const extension = getFileExtension(file.name);
      setApiStatus(
        `Extracting ${index + 1}/${supportedFiles.length}: ${file.name}...`,
        "info"
      );

      try {
        const extractedText = await extractTextFromFile(file, extension);
        const cleanedText = extractedText.replace(/\u0000/g, "").trim();
        if (!cleanedText) {
          unreadableFiles.push(file.name);
          continue;
        }

        extractedBatch.push({
          file_name: file.name,
          jd_text: cleanedText
        });
      } catch (error) {
        console.error(error);
        unreadableFiles.push(file.name);
      }
    }

    if (extractedBatch.length === 0) {
      throw new Error("No readable text found in selected files.");
    }

    uploadedJdBatch = extractedBatch;
    if (textarea) {
      isHydratingTextarea = true;
      textarea.value = extractedBatch[0].jd_text;
      isHydratingTextarea = false;
      updateTextareaMeta();
      textarea.focus();
    }
    updateSelectedFileMeta();

    if (extractedBatch.length > 1) {
      latestBatchResults = extractedBatch.map((entry) => ({
        file_name: entry.file_name,
        status: "queued",
        company_name: "",
        role: "",
        confidence_score: null,
        error_message: "",
        history_id: ""
      }));
      renderBatchResults(
        `Batch ready: ${extractedBatch.length} files queued. Click Run Analysis.`
      );
    } else {
      clearBatchResultsView();
    }

    const successCount = extractedBatch.length;
    const totalCount = pickedFiles.length;
    if (unsupportedFiles.length > 0 || unreadableFiles.length > 0) {
      setApiStatus(
        `Loaded ${successCount}/${totalCount} JD files. Unsupported: ${unsupportedFiles.length}, unreadable: ${unreadableFiles.length}.`,
        "warning"
      );
      return;
    }

    if (successCount > 1) {
      setApiStatus(
        `Loaded ${successCount} JD files. Click Run Analysis to process all uploaded JDs.`,
        "success"
      );
      return;
    }

    setApiStatus("JD text extracted. Ready for analysis.", "success");
  } catch (error) {
    console.error(error);
    const message =
      error && error.message
        ? error.message
        : "Failed to extract text from uploaded file.";
    setApiStatus(message, "error");
    alert(message);
  } finally {
    loader.classList.add("hidden");
  }
}

function getFileExtension(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.slice(dotIndex).toLowerCase();
}

async function extractTextFromFile(file, extension) {
  if (extension === ".pdf") return extractTextFromPdf(file);
  if (extension === ".docx") return extractTextFromDocx(file);
  if (extension === ".txt") return extractTextFromTxt(file);
  throw new Error("Unsupported file type.");
}

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF parser is not available.");
  }
  if (
    window.pdfjsLib.GlobalWorkerOptions &&
    !window.pdfjsLib.GlobalWorkerOptions.workerSrc
  ) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Data = new Uint8Array(arrayBuffer);
  const loadingTask = window.pdfjsLib.getDocument({ data: uint8Data });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => (item && item.str ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function extractTextFromDocx(file) {
  if (!window.mammoth) {
    throw new Error("DOCX parser is not available.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return safeString(result && result.value);
}

async function extractTextFromTxt(file) {
  return await file.text();
}

initializeUploadHandlers();
initializeInteractionHandlers();
initializeHistory();
renderBatchResults();
