// Central source of truth for the current version of each legal document.
// When a version changes here, every user whose stored *_accepted_version
// doesn't match will see the re-accept gate on next login — automatically.
export const LEGAL_VERSIONS = {
  terms: "2026-08-08",
  privacy: "2026-08-08",
  tutor_agreement: "2026-08-08",
};