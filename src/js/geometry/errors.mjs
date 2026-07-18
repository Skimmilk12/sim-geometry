// Structured geometry errors: UI and embed branch on .code, never on message text.
export class GeometryError extends Error {
  constructor(code, message, field = null) {
    super(message);
    this.name = 'GeometryError';
    this.code = code;    // e.g. 'NOT_FINITE', 'NOT_POSITIVE', 'IMPOSSIBLE_GEOMETRY'
    this.field = field;  // offending input name, when known
  }
}

export function assertFinite(field, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new GeometryError('NOT_FINITE', `${field} must be a finite number, got ${v}`, field);
  }
}
export function assertPositive(field, v) {
  assertFinite(field, v);
  if (v <= 0) throw new GeometryError('NOT_POSITIVE', `${field} must be > 0, got ${v}`, field);
}
export function assertNonNegative(field, v) {
  assertFinite(field, v);
  if (v < 0) throw new GeometryError('NEGATIVE', `${field} must be >= 0, got ${v}`, field);
}
export function assertPositiveInteger(field, v) {
  assertPositive(field, v);
  if (!Number.isInteger(v)) {
    throw new GeometryError('NOT_INTEGER', `${field} must be a positive integer, got ${v}`, field);
  }
}
