import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { Subject } from 'rxjs';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import { EntityTableAddActionsComponent } from './entity-table-add-actions.component';
import { EntityTableService } from './entity-table.service';

// Production loads this global stylesheet; the general Karma configuration
// omits it. Include it here so toolbar geometry matches the appliance.
@Component({
  standalone: false, template: '', encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../assets/styles/material-reduction.css'],
})
class EntityTableProductionStylesComponent {}

@Component({
  standalone: false,
  selector: 'entity-table-layout-test-host',
  template: `
    <section [dir]="direction" class="fc-records">
      <div class="mat-toolbar mat-card-toolbar entity-table-toolbar-layout">
        <div class="mat-card-title-text entity-table-title-layout">Title</div>
        <div class="entity-table-controls entity-table-controls-layout">
          <div>
            <button hlmBtn variant="ghost" size="icon" type="button" [hlmDropdownMenuTrigger]="columnsMenu" class="fc-table-columns columns" aria-label="Columns">
              <mat-icon>view_column</mat-icon>
            </button>
            <ng-template #columnsMenu><hlm-dropdown-menu><button hlmDropdownMenuItem type="button">Column</button></hlm-dropdown-menu></ng-template>
          </div>
          <div style="text-align:right;">
            <app-entity-table-add-actions [entity]="entity"></app-entity-table-add-actions>
          </div>
          @if (settings) { <div id="config"><button hlmBtn variant="ghost" size="icon" type="button"><mat-icon>settings</mat-icon></button></div> }
        </div>
      </div>
      <div class="multiActionsButton fn-toolbar entity-table-multi-actions-layout" [style.display]="'block'">
        Actions
      </div>
      <div class="entity-table-cell-layout">
        @if (widget) {
          <mat-icon [hlmDropdownMenuTrigger]="menu" role="button" tabindex="0">schedule</mat-icon>
          <ng-template #menu><hlm-dropdown-menu><button hlmDropdownMenuItem type="button">Menu</button></hlm-dropdown-menu></ng-template>
        }
        <div class="value">Value</div>
      </div>
    </section>
    `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./entity-table.component.scss'],
})
class EntityTableLayoutTestHostComponent {
  direction = 'ltr';
  widget = true;
  settings = false;
  actions = [];
  entity = {
    conf: { title: 'Jails', route_add: ['jails'] },
    getAddActions: () => this.actions,
    doAdd: () => {},
  };
}

describe('entity-table layout', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [EntityTableLayoutTestHostComponent, EntityTableAddActionsComponent, EntityTableProductionStylesComponent],
      imports: [CommonModule, MatButtonModule, MatIconModule,
        NoopAnimationsModule, TranslateModule.forRoot(), CommonDirectivesModule, HlmButtonImports, HlmDropdownMenuImports, HlmTooltipImports],
      providers: [{ provide: EntityTableService, useValue: { addActionsUpdater$: new Subject() } }],
    }).compileComponents().then(() => TestBed.createComponent(EntityTableProductionStylesComponent).detectChanges());
  }));

  it('keeps the real resize sensor inside a scrollable table container', async () => {
    // the internal development record: the production compatibility sheet must not pad ERD's object.
    const scroller = document.createElement('div');
    scroller.style.cssText = 'position:fixed; top:0; left:0; width:320px; overflow:auto';
    const host = document.createElement('entity-table');
    host.style.display = 'block';
    const card = document.createElement('div');
    card.className = 'mat-card';
    card.style.cssText = 'position:relative; width:100%; height:80px; padding:0; margin:0';
    host.appendChild(card);
    scroller.appendChild(host);
    document.body.appendChild(scroller);
    const detector = window['elementResizeDetectorMaker']();
    try {
      await new Promise<void>((resolve) => detector.listenTo({ onReady: resolve }, card, () => {}));
      const sensor = card.querySelector('object');
      expect(sensor).not.toBeNull();
      expect(getComputedStyle(sensor).padding).toBe('0px');
      expect(sensor.getBoundingClientRect().width).toBe(card.clientWidth);
      expect(scroller.scrollWidth).toBe(scroller.clientWidth);
      scroller.style.width = '280px';
      expect(sensor.getBoundingClientRect().width).toBe(card.clientWidth);
      expect(scroller.scrollWidth).toBe(scroller.clientWidth);
    } finally {
      detector.uninstall(card);
      scroller.remove();
    }
  });

  it('preserves the wrapping toolbar alignment contract', () => {
    const fixture = TestBed.createComponent(EntityTableLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.entity-table-toolbar-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('space-between');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('center');
  });

  for (const page of [
    { title: 'Bastille Jails', add: true, actions: ['Download Release', 'Templates', 'Refresh', 'Back to Jails'], settings: true },
    { title: 'Bastille Templates', add: false, actions: ['Refresh', 'Back to Bastille Jails'], settings: false },
    { title: 'Mount Points', add: true, actions: ['Refresh', 'Back to Bastille Jails'], settings: false },
    { title: 'Jails', add: true, actions: ['Bastille Jails'], settings: true },
  ]) {
    it(`aligns the native Columns and Actions buttons for ${page.title}`, () => {
      const fixture = TestBed.createComponent(EntityTableLayoutTestHostComponent);
      fixture.componentInstance.entity.conf = { title: page.title, route_add: page.add ? ['jails'] : undefined };
      fixture.componentInstance.actions = page.actions.map((label) => ({ label, onClick: () => {} }));
      fixture.componentInstance.settings = page.settings;
      fixture.detectChanges();
      const columns: HTMLButtonElement = fixture.nativeElement.querySelector('button.columns');
      const actions: HTMLButtonElement = fixture.nativeElement.querySelector('app-entity-table-add-actions button.menu-toggle');
      const columnBounds = columns.getBoundingClientRect();
      const actionBounds = actions.getBoundingClientRect();
      expect(columnBounds.height).toBe(32); // the internal development record: on the toolbar's 32px line
      expect(columnBounds.width).toBe(32);
      expect(actionBounds.height).toBe(32); // the internal development record: the helm outline tier
      expect(getComputedStyle(actions).borderTopColor).toBe('rgb(42, 53, 61)');
      const glyph = columns.querySelector('mat-icon').getBoundingClientRect();
      expect(Math.abs((glyph.left + glyph.width / 2) - (columnBounds.left + columnBounds.width / 2))).toBeLessThanOrEqual(1);
      expect(Math.abs((actionBounds.top + actionBounds.height / 2) - (columnBounds.top + columnBounds.height / 2))).toBeLessThan(0.1);
      expect(actions.style.marginTop).toBe('');
    });
  }

  it('lets the title and controls fill separate rows without fixed minimum widths', () => {
    const fixture = TestBed.createComponent(EntityTableLayoutTestHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement;
    const title = getComputedStyle(root.querySelector('.entity-table-title-layout'));
    const controls = getComputedStyle(root.querySelector('.entity-table-controls-layout'));

    expect(title.boxSizing).toBe('border-box');
    expect(title.flex).toBe('1 1 100%');
    expect(title.fontSize).toBe('27px'); // the internal development record: the one page-title voice
    expect(title.letterSpacing).toBe('-0.55px');
    expect(title.fontWeight).toBe('400');
    expect(title.minWidth).toBe('0px');
    expect(title.maxWidth).toBe('100%');

    expect(controls.display).toBe('flex');
    expect(controls.boxSizing).toBe('border-box');
    expect(controls.flex).toBe('1 1 100%');
    expect(controls.flexDirection).toBe('row');
    expect(controls.flexWrap).toBe('wrap');
    expect(controls.justifyContent).toBe('flex-end');
    expect(controls.alignItems).toBe('center');
    expect(controls.alignContent).toBe('center');
    expect(controls.minWidth).toBe('0px');
  });

  it('preserves the selected-row action toolbar despite its display binding', () => {
    const fixture = TestBed.createComponent(EntityTableLayoutTestHostComponent);
    fixture.detectChanges();

    const styles = getComputedStyle(fixture.nativeElement.querySelector('.entity-table-multi-actions-layout'));
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('wrap');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('center');
  });

  // the internal development record: the widget menu is an ng-template on the helm dropdown-menu -- no hidden
  // menu host sits in the cell any more, so the gap rule needs no exclusion.
  it('preserves widget/value alignment with no hidden menu host in the cell', () => {
    const fixture = TestBed.createComponent(EntityTableLayoutTestHostComponent);
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('.entity-table-cell-layout');
    const styles = getComputedStyle(cell);
    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.justifyContent).toBe('flex-start');
    expect(styles.alignItems).toBe('center');
    expect(styles.alignContent).toBe('center');

    expect(getComputedStyle(cell.querySelector('mat-icon')).marginRight).toBe('4px');
    expect(cell.querySelector('mat-menu, hlm-dropdown-menu')).toBeNull();
    expect(cell.children.length).toBe(2);
    expect(getComputedStyle(cell.querySelector('.value')).marginRight).toBe('0px');

    fixture.componentInstance.widget = false;
    fixture.detectChanges();
    expect(cell.querySelector('mat-icon')).toBeNull();
    expect(cell.children.length).toBe(1);
    expect(getComputedStyle(cell.querySelector('.value')).marginRight).toBe('0px');
  });

  it('moves the widget/value gap to the logical end in RTL', () => {
    const fixture = TestBed.createComponent(EntityTableLayoutTestHostComponent);
    fixture.componentInstance.direction = 'rtl';
    fixture.detectChanges();

    const icon = getComputedStyle(fixture.nativeElement.querySelector('.entity-table-cell-layout > mat-icon'));
    expect(icon.marginLeft).toBe('4px');
    expect(icon.marginRight).toBe('0px');
  });
});
