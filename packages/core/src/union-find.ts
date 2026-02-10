/**
 * Union-Find (Disjoint Set Union) with path compression and union by rank.
 */
export class UnionFind {
  private parent: Uint32Array;
  private rank: Uint8Array;

  constructor(size: number) {
    this.parent = new Uint32Array(size);
    this.rank = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      this.parent[i] = i;
    }
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    while (this.parent[x] !== root) {
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;

    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }

  getGroups(indices: Set<number>): number[][] {
    const groups = new Map<number, number[]>();

    for (const idx of indices) {
      const root = this.find(idx);
      let group = groups.get(root);
      if (!group) {
        group = [];
        groups.set(root, group);
      }
      group.push(idx);
    }

    const result: number[][] = [];
    for (const group of groups.values()) {
      if (group.length > 1) {
        group.sort((a, b) => a - b);
        result.push(group);
      }
    }

    result.sort((a, b) => a[0] - b[0]);
    return result;
  }
}
