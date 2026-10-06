export function resolveView(processes, target, remembered = {}) {
  if (target === "P39") target = "P40";
  const [processId, modeId] = String(target || "W01")
    .replace(/^#/, "")
    .split("/");
  let index = processes.findIndex((p) => p.id === processId);
  if (index >= 0) {
    const process = processes[index];
    const mode =
      process.modes.find((m) => m.id === modeId) ||
      process.modes.find((m) => m.id === remembered[process.id]) ||
      process.modes[0];
    return { index, process, mode };
  }
  index = processes.findIndex((p) =>
    p.modes.some((m) => m.topics.includes(processId)),
  );
  if (index < 0) return null;
  const process = processes[index];
  return {
    index,
    process,
    mode: process.modes.find((m) => m.topics.includes(processId)),
  };
}
export function viewHash(view) {
  return `#${view.process.id}/${view.mode.id}`;
}
export function viewData(view, topics) {
  const selected = view.mode.topics
    .map((id) => topics.find((t) => t.id === id))
    .filter(Boolean);
  return {
    id: view.process.id,
    route: viewHash(view).slice(1),
    title: view.process.title,
    section: view.process.section,
    mode: view.mode,
    modes: view.process.modes,
    action: selected[0]?.action || view.process.purpose,
    notes:
      `本环节：${view.process.purpose}\n页内功能：${view.mode.label}\n临时回看在当前页打开，关闭后继续本环节。\n\n` +
      selected.map((t) => `${t.id} · ${t.title}\n${t.notes}`).join("\n\n"),
  };
}
export function familyFor(id) {
  if (id === "P01") return "project";
  if (Number(id.slice(1)) <= 13) return "material";
  if (Number(id.slice(1)) <= 19) return "reading";
  if (Number(id.slice(1)) <= 28 || ["P36", "P37", "P40"].includes(id))
    return "note";
  return "system";
}
