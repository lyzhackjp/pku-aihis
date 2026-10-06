import { Component, h, Prop, State, Watch } from "@stencil/core";
import { familyFor } from "../../lib/navigation.mjs";
@Component({ tag: "process-workspace", shadow: false })
export class ProcessWorkspace {
  @Prop() topicId = "P01";
  @State() material = "P03";
  @State() reading = "P16";
  @State() note = "P20";
  @State() system = "P35";
  componentWillLoad() {
    this.selectMode();
  }
  @Watch("topicId") selectMode() {
    const family = familyFor(this.topicId);
    if (family !== "project") this[family] = this.topicId;
  }
  render() {
    const family = familyFor(this.topicId);
    // 保留各工具实例，页内切换和临时回看不会销毁尚未发送的输入。
    return (
      <div class="process-tools" data-topic-id={this.topicId}>
        <project-start hidden={family !== "project"} />
        <material-flow hidden={family !== "material"} page-id={this.material} />
        <reading-flow hidden={family !== "reading"} page-id={this.reading} />
        <note-flow hidden={family !== "note"} page-id={this.note} />
        <system-flow hidden={family !== "system"} page-id={this.system} />
      </div>
    );
  }
}
