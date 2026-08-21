import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { of } from 'rxjs';

import { MaterialModule } from '../../../../appMaterial.module';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import { DialogService, WebSocketService } from '../../../../services';
import { EntityTreeTableComponent } from './entity-tree-table.component';
import { EntityTreeNode, EntityTreeTable } from './entity-tree-table.model';
import { FileSizePipe } from './filesize.pipe';

describe('EntityTreeTableComponent', () => {
  let fixture: ComponentFixture<EntityTreeTableComponent>;
  let nodes: EntityTreeNode[];
  let antiLockSvg: string;
  let typographyStyles: string[];

  beforeAll(async () => {
    // Use the shipped SVG, served by the existing Karma assets configuration.
    const response = await fetch('/assets/customicons/anti-lock.svg');
    expect(response.ok).toBe(true);
    antiLockSvg = await response.text();

    // Apply the shipped typography through the real component's emulated scope,
    // so Material Icons' direction rule cannot leak into unrelated RTL fixtures.
    typographyStyles = await Promise.all([
      '/assets/styles/fonts.css',
      '/assets/iconfont/material-icons.css',
    ].map(async (path) => {
      const stylesheet = await fetch(path);
      expect(stylesheet.ok).toBe(true);
      const css = await stylesheet.text();
      return css.replace(/url\((['"]?)([^'")]+)\1\)/g, (_, quote, resource) => (
        `url("${new URL(resource, stylesheet.url).href}")`
      ));
    }));
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EntityTreeTableComponent, FileSizePipe],
      imports: [
        CommonModule,
        CommonDirectivesModule,
        MaterialModule,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
        HlmButtonImports, HlmCheckboxImports, HlmDropdownMenuImports, HlmTooltipImports, // the internal development record: the row menu
      ],
      providers: [
        {
          provide: WebSocketService,
          useValue: { call: jasmine.createSpy().and.returnValue(of([])) },
        },
        {
          provide: DialogService,
          useValue: {},
        },
      ],
    }).overrideComponent(EntityTreeTableComponent, {
      add: { styles: typographyStyles },
    }).compileComponents();
    TestBed.inject(MatIconRegistry).addSvgIconLiteral(
      'anti-lock', TestBed.inject(DomSanitizer).bypassSecurityTrustHtml(antiLockSvg),
    );

    nodes = [
      {
        data: { name: 'Bravo', type: 'Filesystem' },
        children: [{ data: { name: 'Child', type: 'Dataset' } }],
      },
      { data: { name: 'Alpha', type: 'Filesystem' } },
      { data: { name: 'Charlie', type: 'Filesystem' } },
    ];

    const conf: EntityTreeTable = {
      columns: [
        { name: 'Name', prop: 'name' },
        { name: 'Type', prop: 'type' },
      ],
      tableData: nodes,
    };

    fixture = TestBed.createComponent(EntityTreeTableComponent);
    fixture.componentInstance.conf = conf;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders app-owned styles and applies a real expand-mode column resize', () => {
    const root = fixture.nativeElement as HTMLElement;
    const table = root.querySelector('table') as HTMLTableElement;
    const headers = root.querySelectorAll('th');
    const resizer = headers[0].querySelector('.entity-tree-table__column-resizer') as HTMLElement;

    expect(root.querySelector('.entity-tree-table')).not.toBeNull();
    expect(resizer).not.toBeNull();
    expect(getComputedStyle(table).tableLayout).toBe('auto');

    const firstWidthBefore = headers[0].getBoundingClientRect().width;
    const secondWidthBefore = headers[1].getBoundingClientRect().width;
    const tableWidthBefore = table.getBoundingClientRect().width;
    const startX = resizer.getBoundingClientRect().right;

    expect(firstWidthBefore).toBeGreaterThanOrEqual(200);

    resizer.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: startX,
    }));
    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      buttons: 1,
      clientX: startX + 40,
    }));
    document.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      clientX: startX + 40,
    }));
    fixture.detectChanges();

    expect(headers[0].getBoundingClientRect().width).toBeGreaterThan(firstWidthBefore);
    expect(headers[1].getBoundingClientRect().width).toBeCloseTo(secondWidthBefore, 0);
    expect(table.getBoundingClientRect().width).toBeGreaterThan(tableWidthBefore);

    const firstWidthAfterGrowth = headers[0].getBoundingClientRect().width;
    const tableWidthAfterGrowth = table.getBoundingClientRect().width;
    const shrinkStartX = resizer.getBoundingClientRect().right;

    resizer.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: shrinkStartX,
    }));
    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      buttons: 1,
      clientX: shrinkStartX - 20,
    }));
    document.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      clientX: shrinkStartX - 20,
    }));
    fixture.detectChanges();

    expect(headers[0].getBoundingClientRect().width).toBeLessThan(firstWidthAfterGrowth);
    expect(headers[1].getBoundingClientRect().width).toBeCloseTo(secondWidthBefore, 0);
    expect(table.getBoundingClientRect().width).toBeLessThan(tableWidthAfterGrowth);
  });

  it('expands a node with an accessible native control', () => {
    const root = fixture.nativeElement as HTMLElement;
    const toggler = root.querySelector(
      '.entity-tree-table__toggler:not(.entity-tree-table__toggler--hidden)',
    ) as HTMLButtonElement;

    expect(root.querySelectorAll('tbody tr').length).toBe(3);
    expect(toggler.getAttribute('aria-expanded')).toBe('false');

    toggler.click();
    fixture.detectChanges();

    expect(toggler.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelectorAll('tbody tr').length).toBe(4);
  });

  it('distinguishes alternating rows and retains the legacy lock baseline', () => {
    nodes[0].data.is_encrypted_root = true;
    nodes[0].data.non_encrypted_on_encrypted = false;
    nodes[0].data.locked = true;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const rows = root.querySelectorAll('tbody tr');
    const iconWrapper = rows[0].querySelector('.icons') as HTMLElement;

    expect(getComputedStyle(rows[1]).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(iconWrapper.querySelector('mat-icon')).not.toBeNull();
    expect(getComputedStyle(iconWrapper).display).toBe('inline-flex');
    expect(getComputedStyle(iconWrapper).verticalAlign).toBe('middle');
  });

  it('keeps real-font rows compact and size values on one line without aligning actions to the text baseline', async () => {
    const root = fixture.nativeElement as HTMLElement;
    root.style.font = '14px / 23px "IBM Plex Sans"';
    root.style.width = '640px';
    fixture.componentInstance.conf.columns.push({ name: 'Used', prop: 'used', filesizePipe: true });
    nodes.forEach((node) => {
      node.data.used = 98304;
      node.data.actions = [{ label: 'Inspect', onClick: () => undefined }];
    });
    nodes[0].data.is_encrypted_root = true;
    nodes[0].data.non_encrypted_on_encrypted = false;
    nodes[0].data.locked = true;
    nodes[1].data.is_encrypted_root = true;
    nodes[1].data.non_encrypted_on_encrypted = false;
    nodes[1].data.locked = false;
    nodes[2].data.is_encrypted_root = false;
    nodes[2].data.non_encrypted_on_encrypted = true;
    fixture.detectChanges();
    await document.fonts.ready;

    const rows = Array.from(root.querySelectorAll('tbody tr'));
    rows.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const action = row.querySelector('.entity-tree-table__actions-column > .row-kebab'); // the internal development record: the ghost kebab
      const actionRect = action.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(35);
      expect(rect.height).toBeLessThanOrEqual(37);
      expect(Math.abs((actionRect.top + actionRect.bottom - rect.top - rect.bottom) / 2)).toBeLessThan(2);
      const size = row.querySelector('.entity-tree-table__size') as HTMLElement;
      expect(size.textContent.trim()).toBe('96 KiB');
      expect(getComputedStyle(size).whiteSpace).toBe('nowrap');
      const name = row.querySelector('td > span:not(.icons)');
      const lock = row.querySelector('.icons mat-icon');
      const lockBottom = lock.getBoundingClientRect().bottom - name.getBoundingClientRect().bottom;
      expect(lockBottom).toBeGreaterThanOrEqual(0);
      expect(lockBottom).toBeLessThanOrEqual(2);
    });
    // the internal development record: the lock state is a Symbols ligature in the one icon font.
    ['lock', 'lock_open'].forEach((name, index) => {
      const lock = rows[index].querySelector('.icons mat-icon');
      expect(lock).not.toBeNull();
      expect(lock.textContent.trim()).toBe(name);
      expect(getComputedStyle(lock).fontFamily).toContain('Material Symbols Outlined');
    });
    expect(rows[2].querySelector('.icons mat-icon svg path')).not.toBeNull();
  });

  it('sorts every tree level and restores exact original order on the third click', () => {
    nodes[0].children.push({ data: { name: 'Able Child', type: 'Dataset' } });
    nodes[0].expanded = true;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const firstHeader = root.querySelector('th') as HTMLElement;
    const visibleNames = () => Array.from(root.querySelectorAll('tbody tr'))
      .map((row) => (row.querySelector('td') as HTMLElement).textContent.trim());

    expect(firstHeader.getAttribute('aria-sort')).toBe('none');
    expect(firstHeader.querySelector('.entity-tree-table__sort-icon')).toBeNull();
    expect(visibleNames()).toEqual(['Bravo', 'Child', 'Able Child', 'Alpha', 'Charlie']);

    firstHeader.click();
    fixture.detectChanges();
    expect(firstHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(firstHeader.querySelector('.entity-tree-table__sort-icon')?.getAttribute('data-sort-order'))
      .toBe('ascending');
    expect(visibleNames()).toEqual(['Alpha', 'Bravo', 'Able Child', 'Child', 'Charlie']);

    firstHeader.click();
    fixture.detectChanges();
    expect(firstHeader.getAttribute('aria-sort')).toBe('descending');
    expect(firstHeader.querySelector('.entity-tree-table__sort-icon')?.getAttribute('data-sort-order'))
      .toBe('descending');
    expect(visibleNames()).toEqual(['Charlie', 'Bravo', 'Child', 'Able Child', 'Alpha']);

    firstHeader.click();
    fixture.detectChanges();
    expect(firstHeader.getAttribute('aria-sort')).toBe('none');
    expect(firstHeader.querySelector('.entity-tree-table__sort-icon')).toBeNull();
    expect(visibleNames()).toEqual(['Bravo', 'Child', 'Able Child', 'Alpha', 'Charlie']);
  });
});
