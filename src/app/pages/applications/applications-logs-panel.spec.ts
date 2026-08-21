import { Component, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// the internal development record: the shared log pre (freecore-ui.css) was scoped to dialogs, so the Applications log panel, a
// page section, showed its log in the page font at full length. The sheet is loaded as production loads it (unscoped).
@Component({
  standalone: false,
  selector: 'logs-panel-host',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../assets/styles/freecore-ui.css'],
  template: `
    <div class="fc-ui" style="height: 2000px">
      <section class="logs-panel"><div class="panel-header"><h2>plex Logs</h2></div>
        <pre class="fc-dialog-pre" tabindex="0">{{ log }}</pre>
      </section>
    </div>`,
})
class LogsPanelHostComponent {
  log = Array.from({ length: 400 }, (_, i) => `[init] line ${i}`).join('\n');
}

describe('Applications log panel', () => {
  it('shows the log in the mono log treatment, scrolling inside half the viewport', () => {
    TestBed.configureTestingModule({ declarations: [LogsPanelHostComponent] });
    const fixture = TestBed.createComponent(LogsPanelHostComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const pre = fixture.nativeElement.querySelector('.logs-panel pre') as HTMLElement;
    const style = getComputedStyle(pre);

    expect(style.fontFamily).toContain('IBM Plex Mono');
    expect(style.overflowY).toBe('auto');
    // a 400-line log is held to 50vh (plus the pre's own padding and border) and scrolls itself, rather than
    // stretching the page
    expect(parseFloat(style.maxHeight)).toBeCloseTo(window.innerHeight / 2, 0);
    expect(pre.scrollHeight).toBeGreaterThan(pre.clientHeight);
    expect(style.marginTop).toBe('16px');
    fixture.nativeElement.remove();
  });
});
