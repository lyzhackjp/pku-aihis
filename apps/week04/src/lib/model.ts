/** Credentials stay in this module's memory, outside project snapshots. */
export const model = {
  endpoint: "https://api.deepseek.com/v1",
  name: "deepseek-chat",
  key: "",
};
export async function readWithModel(
  input: string,
  task: string,
  signal: AbortSignal,
) {
  if (!model.key) throw Error("请先在“模型接入”中填写自己的 key。");
  const url = new URL(model.endpoint.replace(/\/$/, "") + "/chat/completions");
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw Error("模型接口须使用 HTTPS 或本机地址。");
  const r = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${model.key}`,
    },
    body: JSON.stringify({
      model: model.name,
      messages: [
        {
          role: "system",
          content:
            "你是历史学阅读助手。只根据本轮明确提供的片段完成任务，保留片段编号与原话，不把研究者解释归给原作者。没有依据时说明未覆盖。你的输出是待核候选。",
        },
        { role: "user", content: `任务：${task}\n输入范围：\n${input}` },
      ],
      stream: false,
    }),
  });
  if (!r.ok) throw Error(`接口返回 HTTP ${r.status}；未保存生成结果。`);
  const json = await r.json(),
    text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw Error("接口没有返回可读正文。");
  return text;
}
