const SCRIPT_RANGES = {
  si: /[\u0D80-\u0DFF]/,
  ta: /[\u0B80-\u0BFF]/,
};

// Rate-limit / connection fallback strings (en/si/ta). Mirrors the SENTINEL_RE in
// test-personas.mjs. A response matching this is not a real answer \u2014 score as ERR.
const SENTINEL_RE =
  /I'?m a bit slammed|thinking servers|ran out of time|trouble reaching Kapruka|trouble finding that right now|something went wrong on my end|\u0DA7\u0DD2\u0D9A(\u0D9A\u0DCA)? busy|\u0D9A\u0DDC\u0DA4|\u0DB1\u0DD0\u0DC0\u0DAD try|\u0DA7\u0DD2\u0D9A\u0D9A\u0DCA problem|\u0B95\u0BCA\u0B9E\u0BCD\u0B9A\u0BAE\u0BCD busy|\u0BA8\u0BC7\u0BB0\u0BAE\u0BCD \u0B95\u0BB4\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1|\u0B9A\u0BBF\u0BB1\u0BC1 \u0BAA\u0BBF\u0BB0\u0B9A\u0BCD\u0B9A\u0BA9\u0BC8|\u0B87\u0BA3\u0BC8\u0BAA\u0BCD\u0BAA\u0BBF\u0BB2\u0BCD/i;

const CHECKS = {
  hasEvent(events, responseText, type, predicate) {
    const found = events.some((event) => {
      if (event.t !== type) return false;
      if (!predicate) return true;
      return predicate(event.v);
    });

    return {
      pass: found,
      reason: predicate
        ? `Expected an event "${type}" matching predicate`
        : `Expected an event "${type}"`,
    };
  },

  noUnicode(events, responseText, script) {
    const range = SCRIPT_RANGES[script];
    const pass = range ? !range.test(responseText) : false;
    return {
      pass,
      reason: pass
        ? ""
        : `Expected no ${script} Unicode characters in response text`,
    };
  },

  hasUnicode(events, responseText, script) {
    const range = SCRIPT_RANGES[script];
    const pass = range ? range.test(responseText) : false;
    return {
      pass,
      reason: pass
        ? ""
        : `Expected at least one ${script} Unicode character in response text`,
    };
  },

  textMatches(events, responseText, regex) {
    const pass = regex.test(responseText);
    return {
      pass,
      reason: pass ? "" : `Expected response text to match ${regex}`,
    };
  },

  noPattern(events, responseText, regex) {
    const pass = !regex.test(responseText);
    return {
      pass,
      reason: pass ? "" : `Expected response text not to match ${regex}`,
    };
  },

  httpStatus(events, responseText, expected, runResult) {
    const pass = runResult.status === expected;
    return {
      pass,
      reason: pass
        ? ""
        : `Expected HTTP ${expected}, got ${runResult.status ?? "unknown"}`,
    };
  },

  notEmpty(events, responseText) {
    const pass = responseText.trim().length > 10;
    return {
      pass,
      reason: pass ? "" : "Expected response text longer than 10 characters",
    };
  },

  noHallucinatedProducts(events, responseText) {
    const hasProductsEvent = events.some((event) => event.t === "products");
    if (hasProductsEvent) return { pass: true, reason: "" };

    const hasPriceWithoutProducts = /LKR\s*[\d,]+/i.test(responseText);
    const hasRepeatedListingShape =
      /\b(?:a|an)\s+[a-z][a-z-]*(?:\s+[a-z][a-z-]*){1,4}\s+(?:for|at|with|priced|costs?|lkr|rs\.?)\b[\s\S]*\b(?:a|an)\s+[a-z][a-z-]*(?:\s+[a-z][a-z-]*){1,4}\s+(?:for|at|with|priced|costs?|lkr|rs\.?)\b/i.test(
        responseText
      );
    const pass = !hasPriceWithoutProducts && !hasRepeatedListingShape;

    return {
      pass,
      reason: pass
        ? ""
        : "Response looked like invented product listings without a products event",
    };
  },

  eventHasProducts(events) {
    const productsEvent = events.find((event) => event.t === "products");
    const pass = Array.isArray(productsEvent?.v) && productsEvent.v.length > 0;

    return {
      pass,
      reason: pass
        ? ""
        : "Expected a products event containing at least one product",
    };
  },
};

export function evaluateTest(testCase, runResult) {
  // Rate-limit / connection fallbacks are not real answers — score as ERR, not PASS/FAIL.
  if (SENTINEL_RE.test(runResult.responseText ?? "")) {
    return {
      passed: false,
      isErr: true,
      failedChecks: [{ check: "sentinel", reason: "Rate-limit or connection fallback — re-run with --concurrency 1" }],
    };
  }

  const failedChecks = [];

  if (runResult.error) {
    failedChecks.push({ check: "request", reason: runResult.error });
  }

  for (const check of testCase.checks) {
    const result = runCheck(check, runResult.events, runResult.responseText, runResult);
    if (!result.pass) {
      failedChecks.push({
        check: formatCheck(check),
        reason: result.reason,
      });
    }
  }

  return {
    passed: failedChecks.length === 0,
    failedChecks,
  };
}

export function runCheck(check, events, responseText, runResult = {}) {
  const fn = CHECKS[check.fn];
  if (!fn) {
    return { pass: false, reason: `Unknown check function "${check.fn}"` };
  }

  if (check.fn === "httpStatus") {
    return fn(events, responseText, ...(check.args ?? []), runResult);
  }

  return fn(events, responseText, ...(check.args ?? []));
}

export function formatCheck(check) {
  const args = (check.args ?? []).map(formatArg).join(", ");
  return `${check.fn}${args ? `(${args})` : ""}`;
}

function formatArg(arg) {
  if (arg instanceof RegExp) return String(arg);
  return JSON.stringify(arg);
}
