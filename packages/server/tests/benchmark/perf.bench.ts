import { describe, bench } from "vitest";
import { findDuplicates } from "../../src/index";

function generateStrings(count: number): string[] {
  const strings: string[] = [];
  const chars = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < count; i++) {
    if (i % 50 < 3) {
      strings.push(
        "this is a repeated string that appears several times in the dataset variant " + (i % 3)
      );
    } else {
      let s = "";
      let seed = i * 17 + 3;
      for (let j = 0; j < 50; j++) {
        seed = (seed * 31 + 7) & 0x7fffffff;
        s += chars[seed % 26];
      }
      strings.push(s);
    }
  }
  return strings;
}

const strings1k = generateStrings(1000);
const strings10k = generateStrings(10000);
const strings60k = generateStrings(60000);

describe("findDuplicates benchmark (server)", () => {
  bench("1k strings", async () => {
    await findDuplicates(strings1k, { threshold: 0.8, workers: 0 });
  }, { iterations: 5 });

  bench("10k strings", async () => {
    await findDuplicates(strings10k, { threshold: 0.8, workers: 0 });
  }, { iterations: 3 });

  bench("60k strings", async () => {
    await findDuplicates(strings60k, { threshold: 0.8, workers: 0 });
  }, { iterations: 1 });
});
