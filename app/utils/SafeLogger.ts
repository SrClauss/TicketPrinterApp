// SafeLogger: wraps console methods and masks sensitive strings (tokens, long base64-like strings)

const SENSITIVE_WORD_REGEX = /(?:X-Token-[A-Za-z0-9_-]{4,}|X-Token:|token\b)[^\s]*|[A-Za-z0-9_-]{20,}/gi;

function maskString(s: string): string {
  if (!s) return s;
  // Replace suspicious long tokens and X-Token occurrences
  return s.replace(SENSITIVE_WORD_REGEX, (match) => {
    // keep the header label (if any) and mask the value
    if (/^X-Token-/i.test(match)) {
      return '[REDACTED_TOKEN]';
    }
    return '[REDACTED]';
  });
}

function maskArg(arg: any): any {
  if (typeof arg === 'string') return maskString(arg);
  if (arg instanceof Error) {
    // clone error with masked message but keep stack for debugging
    const e: any = new Error(maskString(arg.message || String(arg)));
    e.name = arg.name;
    e.stack = arg.stack;
    return e;
  }
  if (Array.isArray(arg)) return arg.map(maskArg);
  if (arg && typeof arg === 'object') {
    try {
      // shallow clone and mask string values
      const copy: any = Array.isArray(arg) ? [] : {};
      for (const k of Object.keys(arg)) {
        const v = (arg as any)[k];
        copy[k] = typeof v === 'string' ? maskString(v) : v;
      }
      return copy;
    } catch {
      return '[UNMASKABLE_OBJECT]';
    }
  }
  return arg;
}

function sanitizeArgs(args: any[]): any[] {
  return args.map(maskArg);
}

const SafeLogger = {
  log: (...args: any[]) => {
    const s = sanitizeArgs(args);
    console.log(...s);
  },
  info: (...args: any[]) => {
    const s = sanitizeArgs(args);
    console.info(...s);
  },
  warn: (...args: any[]) => {
    const s = sanitizeArgs(args);
    console.warn(...s);
  },
  error: (...args: any[]) => {
    const s = sanitizeArgs(args);
    console.error(...s);
  },
  debug: (...args: any[]) => {
    const s = sanitizeArgs(args);
    console.debug(...s);
  },
  // expose sanitizer for display use (masks suspected tokens and long secrets)
  sanitizeString: (s: string) => maskString(String(s)),
};

export function sanitizeString(s: string) {
  return maskString(String(s));
}

export default SafeLogger;
