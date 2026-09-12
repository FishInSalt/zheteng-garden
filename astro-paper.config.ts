import { defineAstroPaperConfig } from "./src/types/config";

const siteUrl = process.env.SITE_URL || process.env.CF_PAGES_URL || "http://localhost:4321";

export default defineAstroPaperConfig({
  site: {
    url: siteUrl,
    title: "折腾花园",
    description: "折腾怪的技术学习笔记：记录问题、实践过程，以及终于想明白的那一刻。",
    author: "折腾怪",
    profile: "https://github.com/FishInSalt",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: { perPage: 8, perIndex: 4, scheduledPostMargin: 0 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [{ name: "github", url: "https://github.com/FishInSalt", linkTitle: "折腾怪的 GitHub" }],
  shareLinks: [],
});
