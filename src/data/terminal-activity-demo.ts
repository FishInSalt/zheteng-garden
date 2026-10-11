export type ActivityDemoMode = "tool" | "agent" | "timer";
export interface ActivityFrame {
  title: string;
  trigger: string;
  detail: string;
  transcript: string;
  activity: string;
}
export const timerLastFrame = 25; // 25 × 120ms = 3s of teaching time.
const toolReply = "我先读取求和函数。";
const agentReply = "我把检查修改的任务交给 reviewer。";
export const activityDemos: Record<
  ActivityDemoMode,
  {
    title: string;
    caption: string;
    frames: ActivityFrame[];
  }
> = {
  tool: {
    title: "同一个调用块：排队、运行、完成",
    caption:
      "教学示意：read 允许并发，本例假设它先等待执行位置。省略其他调用、参数排版和颜色；耗时与结果为预设数据，区域名称是图中标注。",
    frames: [
      {
        title: "准备调用工具",
        trigger: "模型回复",
        detail: "尚未登记工具调用，独立工作提示区显示 working…。",
        transcript: toolReply,
        activity: "⠋ working…",
      },
      {
        title: "调用已登记，尚在排队",
        trigger: "tool_start · read",
        detail: "对话区出现调用块和 queued 提示；尚未开始计时。",
        transcript: toolReply + "\n● read src/sum.ts\n└─ queued",
        activity: "（无独立工作提示）",
      },
      {
        title: "取得执行位置",
        trigger: "tool_running · read",
        detail: "移除 queued，开始时间重置；耗时出现在原调用信息的末尾。",
        transcript: toolReply + "\n● read src/sum.ts 0s",
        activity: "（无独立工作提示）",
      },
      {
        title: "读取仍在执行",
        trigger: "定时器更新",
        detail: "同一调用块中的耗时变为 2 秒；底部不再重复显示这次读取。",
        transcript: toolReply + "\n● read src/sum.ts 2s",
        activity: "（无独立工作提示）",
      },
      {
        title: "结果跟随原调用",
        trigger: "tool_settled · read",
        detail:
          "清除运行状态，更新完成标记和耗时，把结果放在原调用下方。稍后的 tool_end 不会重复添加结果。",
        transcript:
          toolReply + "\n● read src/sum.ts ✓ 2.4s\n  ⎿ 返回求和函数源码……",
        activity: "⠸ working…",
      },
    ],
  },
  agent: {
    title: "子代理进展留在对应的 task 调用块中",
    caption:
      "教学示意：只观察一个 reviewer 任务，省略完整参数与颜色。tool starts 是累计启动次数；#1.1 用于区分任务及其事件来源。",
    frames: [
      {
        title: "准备委派任务",
        trigger: "主 Agent 回复",
        detail: "子代理还没有启动，独立工作提示区显示 working…。",
        transcript: agentReply,
        activity: "⠋ working…",
      },
      {
        title: "委派调用正在排队",
        trigger: "tool_start · task",
        detail: "建立任务记录，在对应 task 调用块中显示 queued，尚无运行耗时。",
        transcript:
          agentReply + "\n● task reviewer\n└─ queued #1 reviewer\n检查修改",
        activity: "（无独立工作提示）",
      },
      {
        title: "委派调用开始执行",
        trigger: "tool_running · task",
        detail: "排队提示变为 pending，计时从取得执行位置时开始。",
        transcript:
          agentReply + "\n● task reviewer 0s\n└─ pending #1 reviewer\n检查修改",
        activity: "（无独立工作提示）",
      },
      {
        title: "子代理读取代码",
        trigger: "子代理 tool_start · read",
        detail:
          "根据事件来源更新 task 调用块中的进展：最近工具变为 read，累计启动次数变为 1。",
        transcript:
          agentReply +
          "\n● task reviewer 1s\n└─ pending #1.1 reviewer\n检查修改\n1 tool starts · last: read src/sum.ts",
        activity: "（无独立工作提示）",
      },
      {
        title: "子代理接着运行测试",
        trigger: "子代理 tool_start · bash",
        detail:
          "读取结束后再启动 bash，累计次数变为 2；这不表示两个工具正在同时运行。任务计时不会随子工具切换而重置。",
        transcript:
          agentReply +
          "\n● task reviewer 3s\n└─ pending #1.1 reviewer\n检查修改\n2 tool starts · last: bash npm test",
        activity: "（无独立工作提示）",
      },
      {
        title: "委派任务取得结果",
        trigger: "顶层 tool_settled · task",
        detail:
          "移除临时进展，保留 task 调用及其结果。某一次子工具结束，不会提前结束整项委派任务。",
        transcript:
          agentReply +
          "\n● task reviewer ✓ 4.2s\n  ⎿ 已检查修改，相关测试通过。",
        activity: "⠼ working…",
      },
    ],
  },
  timer: {
    title: "没有新结果，工具耗时为什么还会变化？",
    caption:
      "教学示意：观察同一个 bash 调用的 3 秒，省略参数排版与颜色。按 Ink 的 120ms 间隔更新；暂停只冻结演示时间，耗时不代表任务进度。",
    frames: [],
  },
};
export function timerFrame(index: number): ActivityFrame {
  const ms = index * 120;
  const seconds = Math.floor(ms / 1000);
  return {
    title:
      index === timerLastFrame ? "观察结束，工具仍在运行" : "工具尚未返回结果",
    trigger:
      index === 0 ? "本例中的 Bash 已开始执行" : `定时器触发 · 第 ${index} 次`,
    detail:
      index === timerLastFrame
        ? "只停止演示播放，不产生 tool_end。调用块仍显示运行耗时，不能据此判断任务完成。"
        : "没有新的模型或工具事件。定时器重新计算耗时，更新原调用块末尾的数字。",
    transcript: `测试正在运行，尚未收到工具结果。\n● bash npm test ${seconds}s`,
    activity: "（无独立工作提示）",
  };
}
