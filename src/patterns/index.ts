import { registerPatterns } from "./registry.js";
import { contactPatterns } from "./contact.js";
import { financialPatterns } from "./financial.js";
import { ukGovPatterns } from "./uk-gov.js";
import { networkPatterns } from "./network.js";
import { locationPatterns } from "./location.js";
import { temporalPatterns } from "./temporal.js";
import { secretsPatterns } from "./secrets.js";

/** All built-in patterns, registered on import */
const allBuiltIn = [
  ...contactPatterns,
  ...financialPatterns,
  ...ukGovPatterns,
  ...networkPatterns,
  ...locationPatterns,
  ...temporalPatterns,
  ...secretsPatterns,
];

registerPatterns(allBuiltIn);

export { contactPatterns } from "./contact.js";
export { financialPatterns } from "./financial.js";
export { ukGovPatterns } from "./uk-gov.js";
export { networkPatterns } from "./network.js";
export { locationPatterns } from "./location.js";
export { temporalPatterns } from "./temporal.js";
export { secretsPatterns } from "./secrets.js";
