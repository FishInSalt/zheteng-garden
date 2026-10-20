import { defineAstroPaperConfig } from "./src/types/config";

const siteUrl =
  process.env.SITE_URL || process.env.CF_PAGES_URL || "http://localhost:4321";

export default defineAstroPaperConfig({
  site: {
    url: siteUrl,
    title: "折腾有记",
    description:
      "折腾客的技术学习笔记，记录 Ink 开源终端 AI 助手的开发与 Coding Agent 原理，分享源码、实践过程与工程取舍。",
    author: "折腾客",
    profile: "https://github.com/FishInSalt",
    googleVerification: "LBgF_Cp-5pXEG_Lx438kdLbwbTYDo2KzrAjvTV-cxAY",
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
  socials: [
    {
      name: "github",
      url: "https://github.com/FishInSalt",
      linkTitle: "折腾客的 GitHub",
    },
  ],
  shareLinks: [],
});
