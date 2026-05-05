import { assertEquals } from "@std/assert/equals";
import { getHistory } from "../main.ts";

async function withTempFile(
  content: string,
  fn: (path: string) => Promise<void>,
): Promise<void> {
  const tmp = await Deno.makeTempFile({ suffix: ".txt" });
  try {
    await Deno.writeTextFile(tmp, content);
    await fn(tmp);
  } finally {
    await Deno.remove(tmp).catch(() => {});
  }
}

Deno.test("getHistory: parses plain command lines", async () => {
  await withTempFile("ls -la\npwd\necho hello\n", async (path) => {
    const result = await getHistory(path, 100);
    assertEquals(result, ["ls -la", "pwd", "echo hello"]);
  });
});

Deno.test("getHistory: parses zsh extended history format", async () => {
  const content = ": 1700000001:0;git status\n: 1700000002:0;git diff\n";
  await withTempFile(content, async (path) => {
    const result = await getHistory(path, 100);
    assertEquals(result, ["git status", "git diff"]);
  });
});

Deno.test("getHistory: deduplicates repeated commands", async () => {
  await withTempFile("ls\nls\npwd\nls\n", async (path) => {
    const result = await getHistory(path, 100);
    assertEquals(result, ["ls", "pwd"]);
  });
});

Deno.test("getHistory: respects the limit (keeps last N)", async () => {
  const lines = Array.from({ length: 20 }, (_, i) => `cmd${i}`).join("\n") +
    "\n";
  await withTempFile(lines, async (path) => {
    const result = await getHistory(path, 5);
    assertEquals(result.length, 5);
    assertEquals(result, ["cmd15", "cmd16", "cmd17", "cmd18", "cmd19"]);
  });
});

Deno.test("getHistory: returns empty array for non-existent file", async () => {
  const result = await getHistory("/nonexistent/path/history", 100);
  assertEquals(result, []);
});

Deno.test("getHistory: skips blank lines", async () => {
  await withTempFile("cmd1\n\n\ncmd2\n", async (path) => {
    const result = await getHistory(path, 100);
    assertEquals(result, ["cmd1", "cmd2"]);
  });
});

Deno.test("getHistory: handles file without trailing newline", async () => {
  const tmp = await Deno.makeTempFile({ suffix: ".txt" });
  try {
    await Deno.writeTextFile(tmp, "cmd1\ncmd2");
    const result = await getHistory(tmp, 100);
    assertEquals(result, ["cmd1", "cmd2"]);
  } finally {
    await Deno.remove(tmp).catch(() => {});
  }
});
