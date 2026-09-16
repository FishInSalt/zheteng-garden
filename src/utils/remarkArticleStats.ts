import type { RemarkPlugin } from "@astrojs/markdown-remark";

export interface ArticleStatistics {
  words: number;
  codeLines: number;
}

interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
}

/** Count source prose before plugins generate a TOC or render MDX components. */
export function countArticleStats(tree: MarkdownNode): ArticleStatistics {
  const prose: string[] = [];
  let codeLines = 0;

  function visit(node: MarkdownNode) {
    if (node.type === "code") {
      codeLines += (node.value ?? "")
        .split(/\r?\n/u)
        .filter(line => line.trim()).length;
      return;
    }
    if (node.type === "text" || node.type === "inlineCode") {
      prose.push(node.value ?? "");
    }
    // Frontmatter, imports, JSX attributes and expressions are not text nodes.
    node.children?.forEach(visit);
  }
  visit(tree);

  const text = prose.join(" ");
  const chinese = (text.match(/\p{Script=Han}/gu) ?? []).length;
  const otherWords = text
    .replace(/\p{Script=Han}/gu, " ")
    .match(/[\p{L}\p{N}]+(?:[._'-][\p{L}\p{N}]+)*/gu);

  return { words: chinese + (otherWords?.length ?? 0), codeLines };
}

export const remarkArticleStats: RemarkPlugin = () => (tree, file) => {
  file.data.astro ??= {};
  file.data.astro.frontmatter ??= {};
  file.data.astro.frontmatter.articleStats = countArticleStats(tree);
};
