import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { NgxFilesizeModule } from 'ngx-filesize';
import { TreeTableModule } from 'primeng/treetable';
import { of } from 'rxjs';
import { MaterialModule } from '../../../../appMaterial.module';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import { DialogService, WebSocketService } from '../../../../services';
import { EntityTreeTableComponent } from './entity-tree-table.component';

describe('maintenance PrimeNG storage polish', () => {
  let fixture: ComponentFixture<EntityTreeTableComponent>;
  let typography: string[];
  let antiLock: string;

  beforeAll(async () => {
    antiLock = await (await fetch('/assets/customicons/anti-lock.svg')).text();
    typography = await Promise.all([
      '/assets/styles/fonts.css', '/assets/iconfont/material-icons.css',
      '/assets/iconfont/mdi/css/materialdesignicons.min.css',
    ].map(async (path) => {
      const response = await fetch(path);
      expect(response.ok).toBe(true);
      return (await response.text()).replace(/url\((['"]?)([^'")]+)\1\)/g,
        (_, quote, resource) => `url("${new URL(resource.startsWith('assets/') ? `/${resource}` : resource, response.url).href}")`);
    }));
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EntityTreeTableComponent],
      imports: [CommonModule, MaterialModule, CommonDirectivesModule, TreeTableModule,
        NgxFilesizeModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: WebSocketService, useValue: { call: () => of([]) } },
        { provide: DialogService, useValue: {} },
      ],
    }).overrideComponent(EntityTreeTableComponent, {
      add: { styles: typography },
    }).compileComponents();
    TestBed.inject(MatIconRegistry).addSvgIconLiteral('anti-lock',
      TestBed.inject(DomSanitizer).bypassSecurityTrustHtml(antiLock));
    fixture = TestBed.createComponent(EntityTreeTableComponent);
    fixture.componentInstance.conf = {
      columns: [{ name: 'Name', prop: 'name' }, { name: 'Used', prop: 'used', filesizePipe: true }],
      tableData: [
        {
          data: {
            name: 'alpha',
            used: 2048,
            actions: [],
            is_encrypted_root: true,
            non_encrypted_on_encrypted: false,
            locked: true,
          },
          children: [
            { data: { name: 'child', used: 1024, actions: [] } },
          ],
        },
        { data: { name: 'bravo', used: 4096, actions: [] } },
        { data: { name: 'charlie', used: 8192, actions: [] } },
      ],
    };
    fixture.detectChanges();
    await fixture.whenStable();
    await document.fonts.ready;
  });

  afterEach(() => fixture?.destroy());

  it('keeps values with units on one line and renders compact centered cells', () => {
    const root = fixture.nativeElement as HTMLElement;
    const rows = Array.from(root.querySelectorAll('.p-treetable-tbody > tr'));
    expect(rows.length).toBe(3);
    for (const row of rows) {
      const cell = row.querySelector('td');
      expect(getComputedStyle(cell).verticalAlign).toBe('middle');
      expect(getComputedStyle(cell).paddingTop).toBe('3.5px');
      expect(row.getBoundingClientRect().height).toBeCloseTo(36, 0);
      expect(getComputedStyle(row.querySelector('.entity-tree-table__size')).whiteSpace).toBe('nowrap');
      const icon = row.querySelector('.entity-tree-table__actions > mat-icon').getBoundingClientRect();
      const box = row.getBoundingClientRect();
      expect(Math.abs((icon.top + icon.bottom - box.top - box.bottom) / 2)).toBeLessThan(1);
    }
  });

  it('keeps striping through expansion and leaves the real PrimeNG sorter usable', () => {
    const root = fixture.nativeElement as HTMLElement;
    const stripePair = () => {
      const rows = root.querySelectorAll('.p-treetable-tbody > tr');
      expect(getComputedStyle(rows[0]).backgroundColor).not.toBe(getComputedStyle(rows[1]).backgroundColor);
    };
    stripePair();
    (root.querySelector('.p-treetable-toggler') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.p-treetable-tbody > tr').length).toBe(4);
    stripePair();
    (root.querySelector('#theader_name') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.conf.tableData.map((node) => node.data.name)).toEqual(['alpha', 'bravo', 'charlie']);
    (root.querySelector('#theader_name') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.conf.tableData.map((node) => node.data.name)).toEqual(['charlie', 'bravo', 'alpha']);
    stripePair();
  });

  it('scopes optical lock alignment to the encryption wrapper, not global icons', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(getComputedStyle(root.querySelector('.icons')).transform).toBe('matrix(1, 0, 0, 1, 0, -3)');
    expect(getComputedStyle(root.querySelector('.entity-tree-table__actions > mat-icon')).transform).toBe('none');
    expect(root.querySelector('.mdi-lock')).not.toBeNull();
  });

  it('keeps narrow resizable name cells single-line without changing comments', () => {
    const root = fixture.nativeElement as HTMLElement;
    root.style.display = 'block';
    root.style.width = '671px';
    fixture.componentInstance.conf.columns.push({ name: 'Comments', prop: 'comments' });
    fixture.componentInstance.conf.tableData[0].data.name = '03-passphrase-locked';
    fixture.detectChanges();
    const name = root.querySelector('td[id^="tbody__name_"]');
    expect(getComputedStyle(name).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(name).textOverflow).toBe('ellipsis');
    expect(getComputedStyle(name).maxWidth).toBe('300px');
    for (const row of Array.from(root.querySelectorAll('.p-treetable-tbody > tr'))) {
      expect(row.getBoundingClientRect().height).toBeCloseTo(36, 0);
    }
    // Comments retain their separate app-volumes-list wrapping rule.
    expect(getComputedStyle(root.querySelector('td[id^="tbody__comments_"]')).whiteSpace).toBe('normal');
  });

  it('uses the primary theme colour for collapsed and expanded chevrons only', () => {
    const root = fixture.nativeElement as HTMLElement;
    const toggler = () => root.querySelector('.p-treetable-toggler') as HTMLButtonElement;
    const action = () => root.querySelector('.entity-tree-table__actions > mat-icon');
    const actionColor = getComputedStyle(action()).color;
    for (const color of ['rgb(0, 149, 213)', 'rgb(13, 86, 135)']) {
      root.style.setProperty('--primary', color);
      expect(getComputedStyle(toggler()).color).toBe(color);
      toggler().click();
      fixture.detectChanges();
      expect(getComputedStyle(toggler()).color).toBe(color);
      expect(getComputedStyle(action()).color).toBe(actionColor);
    }
  });

  it('still wraps a long comment in the real Pools theme context', () => {
    const root = fixture.nativeElement as HTMLElement;
    const pools = document.createElement('app-volumes-list');
    const theme = document.createElement('div');
    theme.className = 'ix-blue';
    document.body.appendChild(theme);
    theme.appendChild(pools);
    pools.appendChild(root);
    root.style.display = 'block';
    root.style.width = '671px';
    fixture.componentInstance.conf.columns.push({ name: 'Comments', prop: 'comments' });
    fixture.componentInstance.conf.tableData[0].data.comments = 'A long dataset comment with several words. '.repeat(10);
    try {
      fixture.detectChanges();
      const comment = root.querySelector('td[id^="tbody__comments_"]');
      expect(getComputedStyle(comment).whiteSpace).toBe('normal');
      expect(getComputedStyle(comment).minWidth).toBe('200px');
      expect(comment.getBoundingClientRect().height).toBeGreaterThan(36);
      expect(getComputedStyle(root.querySelector('td[id^="tbody__name_"]')).whiteSpace).toBe('nowrap');
    } finally {
      theme.remove();
    }
  });
});
