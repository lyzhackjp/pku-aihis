import { Component, h, Prop, Element, Listen, State } from "@stencil/core";

@Component({
  tag: "deck-slide",
  styleUrl: "deck-slide.css",
  shadow: false,
})
export class DeckSlide {
  @Element() el: HTMLElement;

  @Prop() slideId: string = "";
  @Prop() layout:
    | "hero"
    | "split"
    | "grid"
    | "pipeline"
    | "interactive"
    | "normal" = "normal";
  @Prop() theme: "light" | "dark" | "accent" = "light";
  @Prop() headerTitle: string = "";
  @Prop() transition:string = "";
  @Prop() kicker: string = "";
  @Prop() notes: string = "";
  @Prop() duration: number = 2; // suggested minutes
  @State() hasWorkbench=false;
  @State() workbenchWidth=0;
  componentDidLoad(){this.hasWorkbench=!!this.el.querySelector('metadata-split,dejiao-workbench');}

  @Listen('workbench-open-document',{target:'window'}) returnToOriginal(){
    if(this.el.style.display==='none')return;
    requestAnimationFrame(()=>(this.el.querySelector('.slide-scroll') as HTMLElement)?.scrollTo({top:0,behavior:'smooth'}));
  }
  render() {
    const supplemented=["D18","D19","D20","D23","D26","D31"].includes(this.slideId);
    return (
      <div class={{"slide-scroll":true,"has-reading-extension":supplemented,'workbench-resized':this.workbenchWidth>0}} style={{'--workbench-columns':this.workbenchWidth?'minmax(0, calc('+this.workbenchWidth+'% - 14px)) minmax(0, 1fr)':undefined}}>
      <section
        class={{
          "slide-page": true,
          [`theme-${this.theme}`]: true,
          [`layout-${this.layout}`]: true,
        }}
        data-slide-id={this.slideId}
      >
        <div class="slide-inner">
          {/* Header Zone if title or kicker is provided */}
          {(this.headerTitle || this.kicker) && (
            <header class="slide-header">
              {this.kicker && (
                <div class="slide-kicker mono">{this.kicker}</div>
              )}
              {this.headerTitle && (
                <h1 class="slide-title">{this.headerTitle}</h1>
              )}
              {this.transition && <p class="slide-transition">{this.transition}</p>}
              <div class="slide-header-actions">
                <slot name="header-actions"></slot>
                {this.hasWorkbench&&<details class="workbench-width"><summary>工作台宽度</summary><div><label>工作台所占栏位 <input aria-label="工作台栏位宽度" type="range" min="45" max="90" value={this.workbenchWidth||65} onInput={(e:any)=>this.workbenchWidth=Number(e.target.value)}/></label><output>{this.workbenchWidth?this.workbenchWidth+'%':'助教默认布局'}</output><button onClick={()=>this.workbenchWidth=0}>恢复默认宽度</button></div></details>}
                {supplemented&&<button class="reading-extension-entry" onClick={()=>this.el.querySelector("research-ledger")?.scrollIntoView({block:"start",behavior:"smooth"})}>阅读判断记录 ↓</button>}
              </div>
            </header>
          )}

          {/* Main Slide Body Slot */}
          <div class="slide-body">
            <slot></slot>
          </div>

          {/* Slide Footer / Footnote Slot */}
          <div class="slide-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </section>
      {supplemented&&<research-ledger page-id={this.slideId}/>}
      </div>
    );
  }
}
