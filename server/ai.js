export const CATEGORIES = ['Classroom / Projector', 'Wi-Fi / Internet', 'Drinking Water', 'Laboratory Equipment', 'Washroom Maintenance', 'Hostel Maintenance', 'Electrical Issues', 'Other Facilities'];
const KW = {
  'Classroom / Projector': ['projector', 'classroom', 'board', 'screen', 'bench', 'desk', 'fan in class'],
  'Wi-Fi / Internet': ['wifi', 'wi-fi', 'internet', 'network', 'router', 'bandwidth', 'lan'],
  'Drinking Water': ['water', 'drinking', 'purifier', 'ro ', 'cooler', 'tap'],
  'Laboratory Equipment': ['lab', 'laboratory', 'microscope', 'equipment', 'computer system', 'apparatus'],
  'Washroom Maintenance': ['washroom', 'toilet', 'restroom', 'flush', 'bathroom', 'urinal'],
  'Hostel Maintenance': ['hostel', 'mess', 'warden', 'dorm', 'bed', 'hostel room'],
  'Electrical Issues': ['electric', 'power', 'light', 'switch', 'socket', 'wire', 'fan', 'short circuit', 'spark', 'bulb']
};
const REC = {
  'Classroom / Projector': 'Send an AV technician to check the projector, cables and bulb; keep a spare unit ready.',
  'Wi-Fi / Internet': 'Ask the network team to inspect the access point and router for that block.',
  'Drinking Water': 'Inspect the purifier and water supply line; schedule filter service if overdue.',
  'Laboratory Equipment': 'Inform the lab in-charge and technician; mark the item unusable until checked.',
  'Washroom Maintenance': 'Dispatch housekeeping for cleaning and plumbing inspection.',
  'Hostel Maintenance': 'Forward to the hostel warden and the maintenance team for a same-day visit.',
  'Electrical Issues': 'Assign an electrician; isolate the affected circuit first if there is any safety risk.',
  'Other Facilities': 'Review manually and route to the department responsible.'
};
const RULES = {
  Critical: /fire|spark|short.?circuit|shock|gas leak|flood|injur|collapse|snake|exposed wire|sewage overflow/,
  High: /urgent|emergency|no water|since (yesterday|\d+ days)|exam|leak|overflow|broken|unsafe|not working/,
  Low: /minor|small|suggest|slightly|whenever|request/
};
export function fallback(text) {
  const t = text.toLowerCase(); let category = 'Other Facilities', best = 0;
  for (const [c, words] of Object.entries(KW)) { const n = words.filter((w) => t.includes(w)).length; if (n > best) { best = n; category = c; } }
  const priority = RULES.Critical.test(t) ? 'Critical' : RULES.High.test(t) ? 'High' : RULES.Low.test(t) ? 'Low' : 'Medium';
  const sentiment = /angry|fed up|ridiculous|again and again|worst|useless|nobody|no one|frustrat|tired of/.test(t) ? 'Frustrated' : /urgent|immediately|asap|emergency/.test(t) ? 'Urgent' : /disappoint|unhappy|dissatisf|poor|not satisfied/.test(t) ? 'Dissatisfied' : 'Neutral';
  const summary = text.length > 160 ? text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 200) : text;
  return { category, priority, sentiment, summary, recommendation: REC[category], source: 'rules' };
}
async function gemini(prompt, json = true) {
  if (!process.env.GEMINI_API_KEY) throw new Error('no key');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`, {
    method: 'POST', signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: json ? { responseMimeType: 'application/json' } : {} })
  });
  if (!r.ok) throw new Error('AI ' + r.status);
  return (await r.json()).candidates[0].content.parts[0].text;
}
export async function analyze(text) {
  try {
    const j = JSON.parse(await gemini(`You triage college campus complaints. Return JSON with keys: category (one of ${CATEGORIES.join(' | ')}), priority (Low|Medium|High|Critical), sentiment (Frustrated|Urgent|Dissatisfied|Neutral), summary (max 25 words), recommendation (one actionable sentence for the administrator).\nComplaint: ${text}`));
    if (!CATEGORIES.includes(j.category) || !['Low', 'Medium', 'High', 'Critical'].includes(j.priority)) throw new Error('bad output');
    return { ...j, source: 'gemini' };
  } catch { return fallback(text); }
}
const STOP = new Set(['the', 'and', 'for', 'not', 'are', 'was', 'has', 'have', 'with', 'this', 'that', 'from', 'our', 'in', 'is', 'it']);
const tokens = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
export function similarity(a, b) {
  const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return 0;
  let i = 0; for (const w of A) if (B.has(w)) i++;
  return i / (A.size + B.size - i);
}
export async function chat(message, context) {
  try {
    return await gemini(`You are the helpful assistant of a college Complaint Management System. Help students submit complaints (Dashboard > New complaint: choose category, describe the issue, add location and photos), track status (Submitted, Under Review, Assigned, In Progress, Resolved, Rejected) and give feedback after resolution. Be brief and friendly. The student's recent complaints:\n${context || 'none'}\n\nStudent asks: ${message}`, false);
  } catch {
    const m = message.toLowerCase();
    if (/status|track|where|update/.test(m)) return context ? `Here are your latest complaints:\n${context}` : 'You have not submitted any complaints yet.';
    if (/submit|new|raise|file|report/.test(m)) return 'Open "New complaint", pick a category, describe the problem, add the location and photos, then press Submit. You will get a complaint ID right away.';
    if (/rating|feedback/.test(m)) return 'Once a complaint is Resolved, open it and use the feedback form to rate the fix from 1 to 5.';
    if (/how long|time|when/.test(m)) return 'Critical issues are handled first. You will get a notification each time the status changes.';
    return 'I can help with submitting a complaint, tracking its status, or giving feedback. What would you like to do?';
  }
}
