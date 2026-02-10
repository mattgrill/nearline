import { describe, it, expect } from "vitest";
import { UnionFind } from "../src/union-find";

describe("UnionFind", () => {
  it("each element is its own root initially", () => {
    const uf = new UnionFind(5);
    for (let i = 0; i < 5; i++) expect(uf.find(i)).toBe(i);
  });

  it("union merges two sets", () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    expect(uf.find(0)).toBe(uf.find(1));
  });

  it("union is transitive", () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    uf.union(1, 2);
    expect(uf.find(0)).toBe(uf.find(2));
  });

  it("getGroups returns correct groups", () => {
    const uf = new UnionFind(6);
    uf.union(0, 1);
    uf.union(1, 2);
    uf.union(3, 4);
    const groups = uf.getGroups(new Set([0, 1, 2, 3, 4, 5]));
    expect(groups.length).toBe(2);
    expect(groups[0]).toEqual([0, 1, 2]);
    expect(groups[1]).toEqual([3, 4]);
  });

  it("getGroups excludes singletons", () => {
    const uf = new UnionFind(5);
    uf.union(0, 1);
    const groups = uf.getGroups(new Set([0, 1, 2, 3, 4]));
    expect(groups.length).toBe(1);
    expect(groups[0]).toEqual([0, 1]);
  });
});
