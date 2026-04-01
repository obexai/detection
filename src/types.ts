/** Category of PII detected */
export type PiiEntityType =
  | "email"
  | "phone"
  | "credit_card"
  | "debit_card"
  | "iban"
  | "sort_code"
  | "national_insurance"
  | "nhs_number"
  | "utr"
  | "passport"
  | "ip_address"
  | "uk_postcode"
  | "date_of_birth"
  | "aws_key"
  | "api_key"
  | "jwt"
  | "person_name"
  | "organization"
  | "location";

/** A single detected PII entity */
export interface PiiEntity {
  /** What type of PII was found */
  type: PiiEntityType;
  /** The matched text */
  value: string;
  /** Start index in the original string */
  start: number;
  /** End index in the original string */
  end: number;
  /** Confidence score 0-1 */
  confidence: number;
  /** Which detection method found it */
  source: "regex" | "ner";
}

/** Result of scanning a string for PII */
export interface DetectionResult {
  /** All PII entities found */
  entities: PiiEntity[];
  /** The input text with PII replaced by tokens */
  redacted: string;
  /** Overall risk score 0-1 */
  score: number;
  /** Time taken to scan in milliseconds */
  latencyMs: number;
}

/** Sensitivity level controls detection thresholds */
export type Sensitivity = "low" | "medium" | "high";

/** Configuration for the PII detector */
export interface DetectorConfig {
  /** Detection sensitivity — higher = more aggressive, more false positives */
  sensitivity?: Sensitivity;
  /** Entity types to detect. If omitted, all types are detected. */
  entities?: PiiEntityType[];
  /** Entity types to skip */
  exclude?: PiiEntityType[];
}

/** A regex-based detection pattern */
export interface PiiPattern {
  type: PiiEntityType;
  regex: RegExp;
  confidence: number;
  /** Optional validation function (e.g. Luhn check for cards) */
  validate?: (match: string) => boolean;
}
