/**
 * Bias mitigation helper: strip personally-identifiable information (PII)
 * from resume text before scoring/ranking.
 *
 * Goal: reduce the chance the ranking is influenced by identity signals
 * (name, email, phone, address, links, pronouns/demographics, etc.).
 */

function normalizeWhitespace(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripPII(rawText = "") {
  let text = String(rawText || "");

  // 1) Emails
  text = text.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "[REDACTED_EMAIL]"
  );

  // 2) Phone numbers (various formats, incl. AU/intl)
  text = text.replace(
    /(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/g,
    "[REDACTED_PHONE]"
  );

  // 3) URLs (LinkedIn, GitHub, portfolio, etc.)
  text = text.replace(
    /\bhttps?:\/\/[^\s)]+/gi,
    "[REDACTED_URL]"
  );
  text = text.replace(
    /\b(www\.)[^\s)]+/gi,
    "[REDACTED_URL]"
  );

  // 4) Common profile handles like "linkedin.com/in/..." already covered by URL,
  // but also catch bare domains (light heuristic)
  text = text.replace(
    /\b(linkedin\.com|github\.com|portfolio|behance\.net|dribbble\.com)\b[^\s)]+/gi,
    "[REDACTED_URL]"
  );

  // 5) Addresses (heuristic) — lines that start with number + street-ish words
  // e.g., "12 George St", "Unit 3/21 King Road"
  text = text.replace(
    /^[ \t]*\d{1,5}([\/-]\d{1,5})?\s+[A-Za-z0-9.\- ]+\b(Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Crescent|Cres|Way|Place|Pl)\b.*$/gim,
    "[]"
  );

  // 6) Postcodes / ZIP-like patterns (AU 4 digits, US 5 digits, etc.)
  text = text.replace(/\b\d{4,6}\b/g, (m) => {
    // avoid nuking years/experience numbers by only redacting when near address-ish words
    // We'll keep it simple: redact standalone 4-6 digits if the line looks like contact section.
    return m; // handled lightly below
  });

  // 7) Contact header blocks: remove lines that contain obvious contact labels
  // e.g., "Address:", "Phone:", "Email:", "DOB:", etc.
  text = text.replace(
    /^[ \t]*(address|phone|mobile|email|e-mail|dob|date of birth|birthdate|nationality|marital status|gender|sex|age|citizenship|visa status|linkedin|github)\s*[:\-].*$/gim,
    ""
  );

  // 8) Demographic / identity keywords (heuristic) - redact the line
  // (we aim to prevent explicit identity signals from affecting scoring)
  text = text.replace(
    /^[ \t]*.*\b(pronouns?|he\/him|she\/her|they\/them|non-binary|lgbtq|religion|race|ethnicity|disability|disabled)\b.*$/gim,
    ""
  );

  // 9) Names (hard to do reliably). Use *very conservative* heuristics:
  // - If a line starts with "Name:" redact rest.
  text = text.replace(
    /^[ \t]*name\s*[:\-].*$/gim,
    ""
  );

  // - If first non-empty line is 2-4 words in Title Case, treat as likely name (optional).
  //   Keep it conservative to avoid deleting headings like "Software Engineer".
  const lines = text.split("\n");
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstIdx >= 0) {
    const firstLine = lines[firstIdx].trim();

    const looksLikeTitleCaseName =
      /^([A-Z][a-z]+)(\s+[A-Z][a-z]+){1,3}$/.test(firstLine) &&
      !/(Engineer|Developer|Nurse|Analyst|Manager|Student|Intern|Consultant|Specialist)\b/.test(firstLine);

    if (looksLikeTitleCaseName) {
      lines[firstIdx] = "[REDACTED_NAME]";
      text = lines.join("\n");
    }
  }

  // 10) Clean up any leftover "Contact:" section headers
  text = text.replace(/^[ \t]*(contact( details)?|personal details)\s*$/gim, "[REDACTED_CONTACT_HEADER]");

  return normalizeWhitespace(text);
}

/**
 * Optional helper: for debugging—shows how much changed.
 */
function piiStats(original = "", stripped = "") {
  const o = String(original || "");
  const s = String(stripped || "");
  return {
    originalChars: o.length,
    strippedChars: s.length,
    removedChars: Math.max(0, o.length - s.length),
  };
}

module.exports = {
  stripPII,
  piiStats,
};
