const SCRIPT_RANGES = {
  si: /[\u0D80-\u0DFF]/,
  ta: /[\u0B80-\u0BFF]/,
};

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
  const failedChecks = [];

  if (runResult.error) {
    failedChecks.push({ check: "request", reason: runResult.error });
  }

  for (const check of testCase.checks) {
    const result = runCheck(check, runResult.events, runResult.responseText);
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

export function runCheck(check, events, responseText) {
  const fn = CHECKS[check.fn];
  if (!fn) {
    return { pass: false, reason: `Unknown check function "${check.fn}"` };
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
