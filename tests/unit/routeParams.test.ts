import { describe, expect, it } from "vitest";

import { normalizeParam } from "../../features/shared/helpers/routeParams";

describe("routeParams", () => {
  it("normalizes router params", () => {
    expect(normalizeParam(undefined)).toBeUndefined();
    expect(normalizeParam("value")).toBe("value");
    expect(normalizeParam(["first", "second"])).toBe("first");
  });
});
