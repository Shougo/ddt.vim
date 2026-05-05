import { assertEquals } from "@std/assert/equals";
import { isDenoCacheIssueError } from "../utils.ts";

Deno.test(
  "isDenoCacheIssueError: returns true for known Deno 1.38 message",
  () => {
    const err = new TypeError("Could not find version of some-module");
    assertEquals(isDenoCacheIssueError(err), true);
  },
);

Deno.test(
  "isDenoCacheIssueError: returns true for known Deno 1.40 message",
  () => {
    const err = new TypeError(
      "Could not find constraint in the list of versions: some-module",
    );
    assertEquals(isDenoCacheIssueError(err), true);
  },
);

Deno.test(
  "isDenoCacheIssueError: returns false for unrelated TypeError",
  () => {
    const err = new TypeError("something completely different");
    assertEquals(isDenoCacheIssueError(err), false);
  },
);

Deno.test(
  "isDenoCacheIssueError: returns false for non-TypeError errors",
  () => {
    assertEquals(
      isDenoCacheIssueError(new Error("Could not find version of x")),
      false,
    );
    assertEquals(isDenoCacheIssueError("string error"), false);
    assertEquals(isDenoCacheIssueError(null), false);
    assertEquals(isDenoCacheIssueError(undefined), false);
    assertEquals(isDenoCacheIssueError(42), false);
  },
);
