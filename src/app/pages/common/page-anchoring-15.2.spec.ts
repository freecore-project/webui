import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: no form or form card is centred inside the admin shell. The engines are
// pinned by entity-form-settings.spec.ts / entity-wizard.component.spec.ts; these hosts pin the
// page sheets and the theme rule that anchor the hand-built pages (Preferences, Update, EULA, IPMI,
// Members) and the insets that put their contents on the card's edge. Each host loads its page's own
// sheet the way the page does (emulated), inside an `.ix-blue.fc-ui` root like <body>.
// the internal development record: Preferences and Members are no longer cards -- they are `.fc-page--capped`
// shells (freecore-ui.css, a Karma global style) with an `.fc-page-title` h1; their sheets draw the
// hairline section voice (Preferences, by ::ng-deep into the embedded engine) and the hairline
// action row (Members, which hosts no form). Their stand-ins measure that markup in position.

@Component({
  standalone: true,
  imports: [HlmButtonImports],
  // the page sheet plus the embedded engine's (entity-form-embedded.component.css): in the app the
  // engine's `div.form-line[_ngcontent]` (0,2,1) and `.buttons[_ngcontent]` (0,2,0) sit under the
  // page's `[_nghost] .prefs-form ...` (0,3,x) exactly as they do here, emulated on one host.
  styleUrls: ['../preferences/page/preferences.component.css', './entity/entity-form/entity-form-embedded.component.css'],
  // the embedded engine's markup (entity-form-embedded.component.html): a flex fieldset whose direct
  // children are the h4 and the field cells, the action row a plain .buttons div with the inline
  // text-align the engine binds (inert on a flex row).
  template: `<section id="ui-preferences-page" class="fc-page fc-page--capped">
    <h1 class="fc-page-title">Preferences</h1>
    <div class="prefs-form"><form class="form-wrap">
      <div class="fieldset-container fieldset-display-no-margins">
        <div class="entity-form-embedded-fieldset-layout fieldset" id="prefs-fieldset">
          <h4 class="fieldset-label" id="prefs-label">General Preferences</h4>
          <div class="entity-form-embedded-field-layout form-inline"><input id="prefs-field"></div>
        </div>
      </div>
      <div class="buttons" style="text-align:center">
        <button hlmBtn class="submit_button" id="prefs-save" type="submit">Update Preferences</button>
      </div>
    </form></div>
  </section>`,
})
class PreferencesStandIn {}

@Component({
  standalone: true,
  imports: [HlmButtonImports, MatIconModule],
  styleUrls: ['../system/update/update.component.css'],
  // the internal development record: the shell and the title are the shared page classes (freecore-ui.css, a global test style)
  // the internal development record: the page's rows are sections on its own copy of the settings-form section grid
  // (update.component.css), the warnings .fc-page-notice--warn (freecore-ui.css), the actions one
  // hairline .buttons row on the hlmBtn tiers; the refresh control is the ghost icon button whose
  // mat-icon the sheet sizes to 20px. The stand-in mirrors one of each (update.component.html).
  template: `<section id="system-update-page" class="fc-page fc-page--capped">
    <h1 class="fc-page-title">Update</h1>
    <section class="fc-settings-section" id="train-card">
      <h2 class="fieldset-label" id="train-title">Update Settings</h2>
      <div class="fc-section-body" id="train-body">
        <div class="train-card-row train-select-row">
          <div id="single-train-name">Current Train: FreeCORE-15.2</div>
          <button hlmBtn variant="ghost" size="icon" type="button" id="single-train-refresh-button" aria-label="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>
    </section>
    <div class="fc-page-notice fc-page-notice--warn" id="stable-warning-card">
      <div class="stable-warning"><strong>This is not a production release.</strong></div>
    </div>
    <div class="buttons" id="button-card">
      <button hlmBtn type="button" id="download-updates">Download Updates</button>
      <button hlmBtn variant="outline" type="button" id="manual-update">Install Manual Update File</button>
      <button hlmBtn variant="destructive" type="button" id="remove-rollback">Remove Captured Return</button>
    </div>
  </section>`,
})
class UpdateStandIn {}

// the internal development record: the EULA is the capped page over one block of prose (the Security Keys intro
// voice) and the page's own copy of the hairline action row with the outline Back.
@Component({
  standalone: true,
  imports: [HlmButtonImports],
  styleUrls: ['../system/support/eula/eula.component.css'],
  template: `<section id="eula-page" class="fc-page fc-page--capped">
    <h1 class="fc-page-title">EULA</h1>
    <div id="eula" [innerHTML]="eula"></div>
    <div class="buttons" id="button-row"><button hlmBtn variant="outline" type="button" id="back-to-support-button">Back to Support</button></div>
  </section>`,
})
class EulaStandIn {
  // the page's text is server HTML through [innerHTML]: no _ngcontent on it, so the p/h1 voice must come from the global sheet
  eula = '<h1>FreeCORE End-User License Notice</h1><p>first</p><p>second</p>';
}

@Component({
  standalone: true,
  styleUrls: ['../network/ipmi/ipmi.component.css'],
  // the internal development record: the scope pickers are the settings form's first section now, not a card
  template: '<div class="fc-settings-form ipmi-scope"><section class="fc-settings-section"><h2 class="fieldset-label">Channel</h2><div class="fc-settings-fields"><select id="ipmi-channel"><option>1</option></select></div></section></div>',
})
class IpmiStandIn {}

@Component({
  standalone: true,
  imports: [HlmButtonImports],
  styleUrls: ['../account/groups/members/members.component.css'],
  template: `<section id="group-members-page" class="fc-page fc-page--capped">
    <h1 class="fc-page-title">Members: wheel</h1>
    <div id="listbox">list</div>
    <div class="buttons">
      <button hlmBtn id="members-save" type="button">Save</button>
      <button hlmBtn variant="outline" id="members-cancel" type="button">Cancel</button>
    </div>
  </section>`,
})
class MembersStandIn {}

describe('page anchoring (the internal development record)', () => {
  const ROOT_WIDTH = 1200;
  let root: HTMLElement;
  // the internal development record: the ladder ThemeService writes inline on <html> -- the page sheets' hairlines
  // read var(--fc-line) -> var(--line), which otherwise computes to nothing (border-top-width 0px).
  const ladder = { '--bg0': '#0B0F13', '--bg1': '#10151A', '--bg2': '#171E24', '--line': '#2A353D', '--fg1': '#DCE3E6', '--fg2': '#97A6AE' };

  // TestBed renders a component into a plain <div> host, so a theme rule keyed on the page's element
  // name (`app-members`) needs that element wrapped around the host.
  async function mount<T>(component: new () => T, pageTag?: string): Promise<HTMLElement> {
    Object.entries(ladder).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    await TestBed.configureTestingModule({ imports: [component] }).compileComponents();
    const fixture = TestBed.createComponent(component);
    root = document.createElement('div');
    root.className = 'ix-blue fc-ui';
    root.style.cssText = `position:fixed; top:0; left:0; width:${ROOT_WIDTH}px; z-index:1`;
    document.body.appendChild(root);
    const page = pageTag ? document.createElement(pageTag) : root;
    if (pageTag) { root.appendChild(page); }
    page.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    root?.remove();
    Object.keys(ladder).forEach((key) => document.documentElement.style.removeProperty(key));
    TestBed.resetTestingModule();
  });

  const left = (el: Element): number => Math.round(el.getBoundingClientRect().left - root.getBoundingClientRect().left);

  it('anchors the Preferences shell at its 1120 cap and gives its embedded forms the section voice and the hairline row', async () => {
    const host = await mount(PreferencesStandIn);
    root.style.setProperty('--fg1', '#DCE3E6');
    const page = host.querySelector<HTMLElement>('#ui-preferences-page');
    expect(getComputedStyle(page).marginLeft).toBe('0px');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(left(page)).toBe(0);
    expect(getComputedStyle(host.querySelector('h1')).fontSize).toBe('27px'); // the internal development record: the one page-title voice
    const fieldset = getComputedStyle(host.querySelector('#prefs-fieldset'));
    expect(fieldset.borderTopWidth).toBe('1px');
    expect(fieldset.paddingTop).toBe('28px');
    expect(fieldset.paddingLeft).toBe('0px');
    const label = getComputedStyle(host.querySelector('#prefs-label'));
    expect(label.fontSize).toBe('15px');
    expect(label.fontWeight).toBe('400');
    expect(label.color).toBe('rgb(220, 227, 230)');
    expect(label.marginTop).toBe('0px');
    expect(label.marginBottom).toBe('16px');
    expect(fieldset.display).toBe('flex'); // the engine's fieldset, not a section grid
    expect(getComputedStyle(host.querySelector('.form-inline')).marginLeft).toBe('0px');
    expect(getComputedStyle(host.querySelector('.form-inline')).marginTop).toBe('8px'); // the engine's vertical pitch stays
    const buttons = getComputedStyle(host.querySelector('.buttons'));
    expect(buttons.display).toBe('flex');
    expect(buttons.borderTopWidth).toBe('1px');
    expect(buttons.paddingTop).toBe('20px');
    expect(buttons.paddingLeft).toBe('0px');
    expect(buttons.marginTop).toBe('12px');
    expect(buttons.minHeight).toBe('64px');
    expect(left(host.querySelector('#prefs-field'))).toBe(0);
    const save = host.querySelector<HTMLElement>('#prefs-save');
    expect(left(save)).toBe(0);
    expect(save.getBoundingClientRect().height).toBe(32);
    expect(save.classList.contains('bg-primary')).toBeTrue(); // the default tier (hlm-button.ts)
  });

  it('anchors the Update page at its 1120 cap and puts its sections, warning and action row on the settings-form law', async () => {
    const host = await mount(UpdateStandIn);
    root.style.setProperty('--yellow', '#D6AD4C'); // the ladder ThemeService writes; the warn notice's left rule reads it
    const page = host.querySelector<HTMLElement>('#system-update-page');
    expect(getComputedStyle(page).marginLeft).toBe('0px');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(left(page)).toBe(0);
    expect(page.getBoundingClientRect().width).toBe(1120);
    const title = host.querySelector<HTMLElement>('h1');
    expect(getComputedStyle(title).fontSize).toBe('27px'); // the internal development record: the one page-title voice
    expect(getComputedStyle(title).letterSpacing).toBe('-0.55px');
    expect(getComputedStyle(title).marginBottom).toBe('30px');
    // the internal development record: the section grid (entity-form.component.scss's law, the page's own copy) at the 1120 width
    const section = host.querySelector<HTMLElement>('#train-card');
    const sectionStyle = getComputedStyle(section);
    expect(sectionStyle.display).toBe('grid');
    expect(sectionStyle.gridTemplateColumns).toBe('170px 916px'); // 1120 - 170 - 34
    expect(sectionStyle.columnGap).toBe('34px');
    expect(sectionStyle.paddingTop).toBe('28px');
    expect(sectionStyle.paddingBottom).toBe('16px');
    expect(sectionStyle.paddingLeft).toBe('0px');
    expect(sectionStyle.borderTopWidth).toBe('1px');
    expect(sectionStyle.position).toBe('relative'); // the absolute progress bar's containing block
    expect(left(section)).toBe(0);
    const label = getComputedStyle(host.querySelector('#train-title'));
    expect(label.fontSize).toBe('15px');
    expect(label.fontWeight).toBe('400');
    expect(label.color).toBe('rgb(220, 227, 230)');
    expect(label.marginTop).toBe('6px');
    expect(label.marginBottom).toBe('0px');
    expect(label.paddingLeft).toBe('0px');
    expect(left(host.querySelector('#train-title'))).toBe(0);
    expect(left(host.querySelector('#train-body'))).toBe(204); // the body column starts after 170 + 34
    expect(getComputedStyle(host.querySelector('#train-body')).minWidth).toBe('0px');
    // the refresh control: the ghost icon tier, 32px square, its mat-icon glyph 20px (the sheet's own rule)
    const refresh = host.querySelector<HTMLElement>('#single-train-refresh-button');
    expect(refresh.getBoundingClientRect().height).toBe(32);
    expect(refresh.getBoundingClientRect().width).toBe(32);
    expect(refresh.classList.contains('text-muted-foreground')).toBeTrue(); // the ghost tier (hlm-button.ts)
    const glyph = getComputedStyle(refresh.querySelector('.mat-icon'));
    expect(glyph.width).toBe('20px');
    expect(glyph.height).toBe('20px');
    expect(glyph.fontSize).toBe('20px');
    // the warning: the shared warn notice (freecore-ui.css), no label column
    const notice = getComputedStyle(host.querySelector('#stable-warning-card'));
    expect(notice.display).toBe('block');
    expect(notice.borderLeftWidth).toBe('2px');
    expect(notice.borderTopWidth).toBe('1px');
    expect(notice.paddingLeft).toBe('16px');
    expect(notice.borderTopLeftRadius).toBe('6px');
    expect(left(host.querySelector('#stable-warning-card'))).toBe(0);
    expect(getComputedStyle(host.querySelector('#stable-warning-card .stable-warning')).color).toBe('rgb(220, 227, 230)'); // the notice voice is the shared fg1, not the page's old fg2
    // the action row: the settings-form hairline row (the page's own copy), the tiers in order
    const buttons = getComputedStyle(host.querySelector('#button-card'));
    expect(buttons.display).toBe('flex');
    expect(buttons.flexWrap).toBe('wrap');
    expect(buttons.columnGap).toBe('8px');
    expect(buttons.borderTopWidth).toBe('1px');
    expect(buttons.paddingTop).toBe('20px');
    expect(buttons.paddingLeft).toBe('0px');
    expect(buttons.marginTop).toBe('12px');
    expect(buttons.minHeight).toBe('64px');
    const download = host.querySelector<HTMLElement>('#download-updates');
    expect(left(download)).toBe(0);
    expect(download.getBoundingClientRect().height).toBe(32);
    expect(download.classList.contains('bg-primary')).toBeTrue(); // the default tier (hlm-button.ts)
    const manual = host.querySelector<HTMLElement>('#manual-update');
    expect(manual.classList.contains('border-border')).toBeTrue(); // the outline tier
    expect(Math.round(manual.getBoundingClientRect().left - download.getBoundingClientRect().right)).toBe(8);
    const remove = host.querySelector<HTMLElement>('#remove-rollback');
    expect(remove.classList.contains('text-destructive')).toBeTrue(); // the destructive tier
    expect(remove.getBoundingClientRect().height).toBe(32);
  });

  it('anchors the EULA page at its 1120 cap, its prose in the intro voice and the outline Back on the hairline row', async () => {
    const host = await mount(EulaStandIn);
    const page = host.querySelector<HTMLElement>('#eula-page');
    expect(getComputedStyle(page).marginLeft).toBe('0px');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(left(page)).toBe(0);
    expect(page.getBoundingClientRect().width).toBe(1120);
    expect(getComputedStyle(host.querySelector('h1')).fontSize).toBe('27px'); // the internal development record: the one page-title voice
    const prose = getComputedStyle(host.querySelector('#eula'));
    expect(prose.paddingLeft).toBe('0px');
    expect(prose.color).toBe('rgb(151, 166, 174)'); // fg2, the Security Keys intro voice
    expect(prose.fontSize).toBe('13px');
    expect(prose.maxWidth).toBe('800px');
    expect(left(host.querySelector('#eula'))).toBe(0);
    // the injected prose: paragraph pitch and the inner heading in the section voice (global rules, since [innerHTML] carries no _ngcontent)
    expect(getComputedStyle(host.querySelector('#eula p')).marginBottom).toBe('12px');
    expect(getComputedStyle(host.querySelector('#eula p')).marginTop).toBe('0px');
    const inner = getComputedStyle(host.querySelector('#eula h1'));
    expect(inner.fontSize).toBe('15px');
    expect(inner.fontWeight).toBe('400');
    expect(inner.color).toBe('rgb(220, 227, 230)');
    // the action row: the settings-form hairline row (the page's own copy)
    const row = getComputedStyle(host.querySelector('#button-row'));
    expect(row.display).toBe('flex');
    expect(row.borderTopWidth).toBe('1px');
    expect(row.paddingTop).toBe('20px');
    expect(row.paddingLeft).toBe('0px');
    expect(row.marginTop).toBe('12px');
    expect(row.minHeight).toBe('64px');
    const back = host.querySelector<HTMLElement>('#back-to-support-button');
    expect(left(back)).toBe(0);
    expect(back.getBoundingClientRect().height).toBe(32);
    expect(back.classList.contains('border-border')).toBeTrue(); // the outline tier (hlm-button.ts)
    expect(getComputedStyle(back).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(host.querySelector('mat-card, mat-card-actions, mat-divider')).toBeNull();
  });

  it('anchors the IPMI scope section on the form width', async () => {
    const host = await mount(IpmiStandIn);
    const scope = host.querySelector<HTMLElement>('.ipmi-scope');
    expect(getComputedStyle(scope).marginLeft).toBe('0px');
    expect(getComputedStyle(scope).maxWidth).toBe('1120px'); // the internal development record: the form below is the 1120 settings container
    expect(left(scope)).toBe(0);
    expect(host.querySelector('mat-card, .ipmi-card')).toBeNull(); // the internal development record
  });

  it('anchors the Members shell at its 1120 cap and puts its title, list and hairline action row on the page edge', async () => {
    const host = await mount(MembersStandIn);
    const page = host.querySelector<HTMLElement>('#group-members-page');
    expect(getComputedStyle(page).marginLeft).toBe('0px');
    expect(getComputedStyle(page).maxWidth).toBe('1120px');
    expect(getComputedStyle(page).position).toBe('relative'); // the absolute spinner's containing block
    expect(left(page)).toBe(0);
    expect(getComputedStyle(host.querySelector('h1')).fontSize).toBe('27px'); // the internal development record: the one page-title voice
    expect(left(host.querySelector('#listbox'))).toBe(0);
    const buttons = getComputedStyle(host.querySelector('.buttons'));
    expect(buttons.display).toBe('flex');
    expect(buttons.borderTopWidth).toBe('1px');
    expect(buttons.paddingTop).toBe('20px');
    expect(buttons.paddingLeft).toBe('0px');
    expect(buttons.marginTop).toBe('12px');
    expect(buttons.minHeight).toBe('64px');
    const save = host.querySelector<HTMLElement>('#members-save');
    expect(left(save)).toBe(0);
    expect(save.getBoundingClientRect().height).toBe(32);
    expect(save.classList.contains('bg-primary')).toBeTrue(); // the default tier (hlm-button.ts)
    const cancel = host.querySelector<HTMLElement>('#members-cancel');
    expect(cancel.classList.contains('border-border')).toBeTrue(); // the outline tier
    expect(Math.round(cancel.getBoundingClientRect().left - save.getBoundingClientRect().right)).toBe(8);
  });
});
