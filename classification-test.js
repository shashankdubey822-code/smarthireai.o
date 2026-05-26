// SmartHire AI — School Classification Engine Test
// Tests the deterministic rule engine with correct priority:
// SOL → SOS(role) → SOE → SOB → SOH

function correctSchoolClassification(parsed) {
  const role     = (parsed.job_role || parsed.role || '').toLowerCase();
  const category = (parsed.category || '').toLowerCase();
  const skills   = (Array.isArray(parsed.core_skills) ? parsed.core_skills.join(' ') : String(parsed.core_skills || '')).toLowerCase();
  const tools    = (Array.isArray(parsed.tools_technologies) ? parsed.tools_technologies.join(' ') : String(parsed.tools_technologies || '')).toLowerCase();
  const combined = role + ' ' + category + ' ' + skills + ' ' + tools;

  // ── 1. SOL — School of Law ─────────────────────────────────
  const solTerms = [
    'legal counsel','compliance officer','advocate','attorney',
    'solicitor','paralegal','patent attorney','ip attorney','ip lawyer',
    'corporate lawyer','legal advisor','contract specialist',
    'patent research','patent researcher','patent analyst',
    'intellectual property','ip law','corporate law','contract law',
    'litigation','judiciary','legal associate','legal executive'
  ];
  const solCatTerms = ['legal','law','compliance','governance','regulatory'];
  if (solTerms.some(k => role.includes(k) || combined.includes(k)) || solCatTerms.some(k => category.includes(k))) return 'School of Law (SOL)';

  // ── 2. SOS role check FIRST — before SOE skill scan ────────
  // "Data Scientist with Python" must go to SOS, not SOE
  const sosRoleTerms = [
    'data scientist','research scientist','data analyst',
    'physicist','chemist','biologist','mathematician',
    'statistician','biotech','genomics','lab researcher',
    'research analyst','quantitative analyst','quant analyst',
    'machine learning researcher','ml researcher'
  ];
  const sosScienceSkills = [
    'data science','statistical modeling','r programming','matlab',
    'spss','bioinformatics','laboratory','scientific research'
  ];
  const sosCatTerms = [
    'data science','research','analytics','biotech',
    'pharmaceutical','laboratory','statistics','science'
  ];
  if (
    sosRoleTerms.some(k => role.includes(k)) ||
    sosScienceSkills.some(k => skills.includes(k)) ||
    sosCatTerms.some(k => category.includes(k))
  ) return 'School of Science (SOS)';

  // ── 3. SOE — School of Engineering ─────────────────────────
  const soeRoleTerms = [
    'engineer','developer','programmer','software','devops','cloud',
    'frontend','backend','fullstack','full stack','full-stack',
    'sre','site reliability','network','embedded','hardware',
    'cybersecurity','security analyst','database admin','dba',
    'infrastructure','mobile','android','ios','architect','tech lead',
    'cto','data engineer','ml engineer','ai engineer',
    'machine learning engineer','platform engineer','solutions engineer',
    'qa engineer','test engineer','automation engineer','robotics'
  ];
  const soeTechSkills = [
    'javascript','typescript','python','java','c++','c#','golang',
    'rust','kotlin','swift','php','ruby','react','angular','vue',
    'node.js','nodejs','express','django','flask','spring','laravel',
    'fastapi','nextjs','flutter','react native',
    'aws','azure','gcp','google cloud','kubernetes','docker',
    'terraform','jenkins','ci/cd','git','linux','bash',
    'rest api','graphql','microservices','mongodb','postgresql',
    'mysql','redis','elasticsearch','tensorflow','pytorch',
    'deep learning','nlp','computer vision',
    'sql','nosql','data structures','algorithms','system design',
    'large language model','llm integration'
  ];
  const soeCatTerms = [
    'software engineering','software development','engineering',
    'technology','information technology','devops','cloud',
    'cybersecurity','data engineering','product engineering'
  ];
  if (
    soeRoleTerms.some(k => role.includes(k)) ||
    soeTechSkills.some(k => skills.includes(k) || tools.includes(k)) ||
    soeCatTerms.some(k => category.includes(k))
  ) return 'School of Engineering (SOE)';

  // ── 4. SOB — School of Business ────────────────────────────
  const sobRoleTerms = [
    'business analyst','product manager','marketing','sales',
    'finance','accounting','accountant','operations manager',
    'supply chain','logistics','brand manager','growth',
    'strategy','management consultant','investment','equity',
    'trading','audit','tax','treasury','hr manager',
    'human resource','recruiter','talent acquisition',
    'customer success','account manager','business development',
    'ceo','cfo','coo'
  ];
  const sobQualTerms = ['mba','bba','bcom','b.com','cfa','cpa'];
  const sobCatTerms = [
    'business','marketing','sales','finance','management',
    'operations','consulting','strategy','human resources'
  ];
  if (
    sobRoleTerms.some(k => role.includes(k)) ||
    sobQualTerms.some(k => combined.includes(k)) ||
    sobCatTerms.some(k => category.includes(k))
  ) return 'School of Business (SOB)';

  // ── 5. SOH — School of Humanity (most restrictive, last) ───
  const sohRoleTerms = [
    'graphic designer','ux designer','ui designer','product designer',
    'visual designer','content writer','copywriter','journalist',
    'editor','creative director','art director','animator',
    'social media manager','public relations','communications manager',
    'psychologist','counselor','therapist','social worker',
    'teacher','educator','professor','trainer',
    'linguist','translator','photographer','videographer'
  ];
  const sohCatTerms = [
    'design','media','communications','arts','humanities',
    'psychology','education','creative'
  ];
  if (
    sohRoleTerms.some(k => role.includes(k)) ||
    sohCatTerms.some(k => category.includes(k))
  ) return 'School of Humanity (SOH)';

  return 'School of Engineering (SOE)';
}

// ── Test Cases ─────────────────────────────────────────────────
const testCases = [
  { expected:'SOE', label:'Emergent — Software Engineering Intern (was wrongly SOH)', data:{ job_role:'Software Engineering Intern', category:'Engineering', core_skills:['Python','LLM Integration','REST API','Git'], tools_technologies:['AWS','Docker'] }},
  { expected:'SOL', label:'Expertlancing — Patent Research Trainee (was wrongly SOH)', data:{ job_role:'Patent Research Trainee', category:'Legal/IP', core_skills:['Patent Analysis','Research'], tools_technologies:[] }},
  { expected:'SOB', label:'Marketing Manager → SOB', data:{ job_role:'Marketing Manager', category:'Marketing', core_skills:['SEO','Brand Strategy'], tools_technologies:[] }},
  { expected:'SOS', label:'Data Scientist with Python → SOS (not SOE)', data:{ job_role:'Data Scientist', category:'Data Science', core_skills:['Python','Statistical Modeling'], tools_technologies:['Tableau'] }},
  { expected:'SOH', label:'Graphic Designer → SOH', data:{ job_role:'Graphic Designer', category:'Design', core_skills:['Photoshop','Illustrator'], tools_technologies:[] }},
  { expected:'SOE', label:'AI Agent Engineer with "Large Language Model" → SOE (not SOL)', data:{ job_role:'AI Agent Engineer Intern', category:'Software Engineering', core_skills:['Python','Large Language Model Integration'], tools_technologies:['AWS'] }},
  { expected:'SOL', label:'Legal Counsel → SOL', data:{ job_role:'Legal Counsel', category:'Legal', core_skills:['Contract Law','Litigation'], tools_technologies:[] }},
  { expected:'SOB', label:'MBA Management Trainee → SOB', data:{ job_role:'Management Trainee', category:'Business Management', core_skills:['MBA','Leadership','Strategy'], tools_technologies:[] }},
  { expected:'SOL', label:'Intellectual Property Analyst → SOL', data:{ job_role:'Intellectual Property Analyst', category:'IP Law', core_skills:['Patent Research'], tools_technologies:[] }},
  { expected:'SOE', label:'Full Stack Developer → SOE', data:{ job_role:'Full Stack Developer', category:'Software Development', core_skills:['React','Node.js','MongoDB'], tools_technologies:['AWS','Docker'] }},
  { expected:'SOB', label:'HR Manager → SOB', data:{ job_role:'HR Manager', category:'Human Resources', core_skills:['Recruitment','HRIS','Payroll'], tools_technologies:[] }},
  { expected:'SOS', label:'Research Scientist → SOS', data:{ job_role:'Research Scientist', category:'Science', core_skills:['Data Analysis','Laboratory'], tools_technologies:['MATLAB'] }},
];

// ── Run Tests ──────────────────────────────────────────────────
console.log('\n=== SmartHire AI — School Classification Test ===\n');
let pass = 0, fail = 0;

testCases.forEach(t => {
  const result = correctSchoolClassification(t.data);
  const abbr = result.match(/\((\w+)\)/)?.[1] || result;
  const ok = abbr === t.expected;
  if (ok) pass++; else fail++;
  const icon = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}  ${t.label}`);
  if (!ok) console.log(`        Expected: ${t.expected}  |  Got: ${abbr}`);
});

console.log('\n═══════════════════════════════════════════════════');
console.log(`  ${pass}/${testCases.length} passed  |  ${fail} failed`);
console.log('═══════════════════════════════════════════════════\n');
if (fail === 0) console.log('  🎉 All tests passed! Classification engine is correct.\n');
