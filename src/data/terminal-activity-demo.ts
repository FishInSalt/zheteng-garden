export type ActivityDemoMode = "tool" | "agent" | "timer";
export interface ActivityFrame {
  title: string;
  trigger: string;
  detail: string;
  transcript: string;
  activity: string;
}
export const spinnerFrames = [..."⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"];
export const timerLastFrame = 25; // 25 × 120ms = 3s of teaching time.
const toolReply = "我先运行测试，看看修改是否生效。";
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
    title: "工具结束后，界面留下了什么？",
    caption:
      "教学示意：按步骤切换，省略中间动画帧。测试结果为预设数据，区域名称是图中标注。",
    frames: [
      {
        title: "准备调用工具",
        trigger: "模型回复",
        detail: "主 Agent 已说明下一步；活动区暂时显示等待提示。",
        transcript: toolReply,
        activity: "⠋ thinking…",
      },
      {
        title: "工具开始运行",
        trigger: "tool_start · bash",
        detail: "增加 bash 的活动行，显示命令摘要；此时尚无工具结果。",
        transcript: toolReply,
        activity: "⠙ bash npm test",
      },
      {
        title: "测试仍在运行",
        trigger: "定时器更新",
        detail: "仍是同一次调用。重新计算耗时后，活动行显示 2 秒。",
        transcript: toolReply,
        activity: "⠹ bash npm test 2s",
      },
      {
        title: "工具结果到达",
        trigger: "tool_end · bash",
        detail:
          "bash 活动行消失，对话区留下完成记录和结果摘要。主 Agent 继续处理结果，活动区恢复等待提示。",
        transcript: toolReply + "\n● bash npm test ✓ 2.4s\n▸ 3 tests passed",
        activity: "⠸ thinking…",
      },
    ],
  },
  agent: {
    title: "子代理的同一条状态怎样更新？",
    caption:
      "教学示意：只观察一个 reviewer 任务。last 表示最近启动的工具，tools 表示累计启动次数。",
    frames: [
      {
        title: "准备委派任务",
        trigger: "主 Agent 回复",
        detail: "子代理还没有启动，活动区暂时只有主 Agent 的等待提示。",
        transcript: agentReply,
        activity: "⠋ thinking…",
      },
      {
        title: "建立子代理活动行",
        trigger: "tool_start · task",
        detail: "主 Agent 调用 task，建立 reviewer 的任务记录，显示任务摘要。",
        transcript: agentReply,
        activity: "└─ reviewer · 检查修改",
      },
      {
        title: "子代理读取代码",
        trigger: "子代理 tool_start · read",
        detail:
          "根据事件来源更新 reviewer：最近工具变为 read，累计启动次数变为 1。",
        transcript: agentReply,
        activity: "└─ reviewer · 检查修改 · 1 tools · last: read src/sum.ts 1s",
      },
      {
        title: "子代理接着运行测试",
        trigger: "子代理 tool_start · bash",
        detail:
          "读取结束后再启动 bash，累计次数变为 2；这不表示两个工具正在同时运行。",
        transcript: agentReply,
        activity: "└─ reviewer · 检查修改 · 2 tools · last: bash npm test 3s",
      },
      {
        title: "子代理任务返回",
        trigger: "顶层 tool_end · task",
        detail:
          "task 返回后移除 reviewer 活动行，主 Agent 接着处理它的结果。子代理某一次工具结束不会移除整条任务记录。",
        transcript:
          agentReply + "\n● task ✓ 4.2s\n▸ 已检查修改，相关测试通过。",
        activity: "⠼ thinking…",
      },
    ],
  },
  timer: {
    title: "没有新结果，等待符号为什么还会动？",
    caption:
      "观察同一个 bash 调用的 3 秒。按 imp 的 120ms 间隔演示，暂停会冻结演示时间；动画不代表实际进度。",
    frames: [],
  },
};
export function timerFrame(index: number): ActivityFrame {
  const ms = index * 120;
  const seconds = Math.floor(ms / 1000);
  return {
    title:
      index === timerLastFrame ? "观察结束，工具仍在运行" : "工具尚未返回结果",
    trigger: index === 0 ? "刚收到 tool_start" : `定时器触发 · 第 ${index} 次`,
    detail:
      index === timerLastFrame
        ? "只停止演示播放，不产生 tool_end。活动行仍保留，不能据此判断任务完成。"
        : "没有新的模型或工具事件。定时器切换等待字符，并根据开始时间重新计算耗时。",
    transcript: "测试正在运行，尚未收到工具结果。",
    activity: `${spinnerFrames[index % spinnerFrames.length]} bash npm test${seconds > 0 ? ` ${seconds}s` : ""}`,
  };
}
