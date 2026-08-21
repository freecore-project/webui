import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { of } from 'rxjs';
import { MaterialModule } from '../../../../appMaterial.module';
import { CommonDirectivesModule } from '../../../../directives/common/common-directives.module';
import { DialogService, WebSocketService } from '../../../../services';
import { MultipathsComponent } from '../../../storage/multipaths/multipaths.component';
import { VolumeStatusComponent } from '../../../storage/volumes/volume-status/volume-status.component';
import { VolumesListTableConfig } from '../../../storage/volumes/volumes-list/volumes-list.component';
import { BootStatusListComponent } from '../../../system/bootenv/bootenv-status/bootenv-status.component';
import { EntityTreeTableComponent } from './entity-tree-table.component';
import { EntityTreeNode, EntityTreeTable } from './entity-tree-table.model';
import { FileSizePipe } from './filesize.pipe';

// the internal development record: exercise the real renderer and its native resize/sort paths.
// The default projection is Pools-only; the other consumers keep canonical columns.
describe('Pools opt-in tree column projection', () => {
  let fixture: ComponentFixture<EntityTreeTableComponent>;
  let root: HTMLElement;
  let conf: EntityTreeTable;
  let nodes: EntityTreeNode[];
  let fonts: string;
  const defaults = ['name', 'type', 'used_parsed', 'available_parsed'];

  beforeAll(async () => {
    const response = await fetch('/assets/styles/fonts.css');
    fonts = (await response.text()).replace(/url\((['"]?)([^'")]+)\1\)/g, (_, quote, resource) => `url("${new URL(resource, response.url).href}")`);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EntityTreeTableComponent, FileSizePipe],
      imports: [CommonModule, CommonDirectivesModule, MaterialModule, NoopAnimationsModule, TranslateModule.forRoot(), HlmButtonImports, HlmDropdownMenuImports, HlmTooltipImports],
      providers: [{ provide: WebSocketService, useValue: { call: () => of([]) } }, { provide: DialogService, useValue: {} }],
    }).overrideComponent(EntityTreeTableComponent, { add: { styles: [fonts] } }).compileComponents();
    nodes = [
      { data: { name: 'bravo', type: 'FILESYSTEM', used_parsed: 20, available_parsed: 100, actions: [{ label: 'Edit', onClick: () => {} }] }, children: [
        { data: { name: 'child-z', used_parsed: 5 } }, { data: { name: 'child-a', used_parsed: 2 } },
      ] },
      { data: { name: 'alpha', type: 'VOLUME', used_parsed: 5, available_parsed: 100 } },
      { data: { name: 'charlie', type: 'FILESYSTEM', used_parsed: 10, available_parsed: 100 } },
    ];
    conf = { columns: new VolumesListTableConfig(null, null, '', [], null, null, null, null, null, null, {}, null, null, null).columns, tableData: nodes };
    fixture = TestBed.createComponent(EntityTreeTableComponent);
    fixture.componentRef.setInput('conf', conf);
    fixture.componentRef.setInput('expandRootNodes', true);
    fixture.componentRef.setInput('visibleColumnProperties', defaults);
    root = document.createElement('div');
    root.className = 'fc-ui ix-blue';
    root.style.cssText = 'position:fixed;top:0;left:0;width:668px;font-family:"IBM Plex Sans";';
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await document.fonts.ready;
  });

  afterEach(() => { fixture?.destroy(); root?.remove(); });

  function project(properties: string[] | undefined) {
    fixture.componentRef.setInput('visibleColumnProperties', properties);
    fixture.detectChanges();
  }
  const headers = () => Array.from(root.querySelectorAll('th[id]')).map((header) => header.id.replace('theader_', ''));
  const names = (list: EntityTreeNode[]) => list.map((node) => node.data.name);

  it('renders four default fields and reachable actions while retaining the canonical columns and nodes', () => {
    expect(headers()).toEqual(defaults);
    expect(conf.columns.length).toBe(9);
    expect(fixture.componentInstance.conf.tableData).toBe(nodes);
    const wrapper = root.querySelector<HTMLElement>('.entity-tree-table__wrapper');
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(wrapper.clientWidth + 1);
    const action = root.querySelector<HTMLElement>('#actions_menu_button__bravo');
    expect(action.getBoundingClientRect().right).toBeLessThanOrEqual(wrapper.getBoundingClientRect().right);
    expect(root.querySelectorAll('thead th').length).toBe(5);
    expect(root.querySelector('td').getBoundingClientRect().height).toBe(40);
  });

  it('keeps Name first and mandatory, ignores unknown props, and exposes every optional value', () => {
    project(['comments', 'unknown', 'readonly', 'name', 'name']);
    expect(headers()).toEqual(['name', 'readonly', 'comments']);
    for (const column of conf.columns.filter((col) => !defaults.includes(col.prop))) {
      nodes[0].data[column.valueProp || column.prop] = 'property-value';
      project([...defaults, column.prop]);
      expect(headers()).toContain(column.prop);
      expect(Array.from(root.querySelectorAll('tbody td')).find((cell) => cell.id.startsWith(`tbody__${column.prop}_`))).toBeDefined();
      expect(root.textContent).toContain('property-value');
    }
    project([]);
    expect(headers()).toEqual(['name']);
    expect(root.querySelector('.entity-tree-table__toggler')).not.toBeNull();
  });

  it('renders and sorts real Dedup property shapes through the Pools formatter without changing the column key', () => {
    const datasetData = [
      { name: 'local-on', value: 'ON', source: 'LOCAL' },
      { name: 'local-off', value: 'OFF', source: 'LOCAL' },
      { name: 'inherited', value: 'ON', source: 'INHERITED' },
    ].map(({ name, value, source }) => ({
      id: `tank/${name}`, name, type: 'FILESYSTEM', encrypted: false, children: [],
      available: { parsed: 100 }, used: { parsed: 10 },
      deduplication: { parsed: value, value, rawvalue: value.toLowerCase(), source },
    }));
    const rawProperties = datasetData.map((data) => data.deduplication);
    // Production passes these same dataset objects both as raw lookup data and
    // as children. Exercise that alias through the real constructor/formatter.
    spyOn(VolumesListTableConfig.prototype, 'getActions').and.returnValue([]);
    spyOn(VolumesListTableConfig.prototype, 'getEncryptedDatasetActions').and.returnValue([]);
    const config = new VolumesListTableConfig(
      null, null, 'tank', datasetData, null, null, null, null,
      { get: () => of('Inherits') } as any, null,
      { encrypted: false, children: datasetData }, null, null, null,
    );
    const records = [...config.tableData];
    fixture.componentRef.setInput('conf', config);
    project(['name', 'deduplication']);
    expect(headers()).toEqual(['name', 'deduplication']);
    const cells = () => Array.from(root.querySelectorAll<HTMLElement>('td[id^="tbody__deduplication_"]'))
      .map((cell) => cell.textContent.trim());
    expect(cells()).toEqual(['ON', 'OFF', 'Inherits (ON)']);
    const sort = () => { root.querySelector<HTMLElement>('#theader_deduplication').click(); fixture.detectChanges(); };
    sort();
    expect(names(config.tableData)).toEqual(['inherited', 'local-off', 'local-on']);
    expect(cells()).toEqual(['Inherits (ON)', 'OFF', 'ON']);
    sort();
    expect(names(config.tableData)).toEqual(['local-on', 'local-off', 'inherited']);
    expect(config.tableData.every((node) => records.includes(node))).toBeTrue();
    datasetData.forEach((data, index) => expect(data.deduplication).toBe(rawProperties[index]));
    expect(datasetData[2].deduplication.source).toBe('INHERITED');
    project(['name']);
    expect(names(config.tableData)).toEqual(['local-on', 'local-off', 'inherited']);
  });

  it('resets manual widths and the total width when a preceding column is hidden', () => {
    const header = root.querySelector<HTMLElement>('#theader_type');
    const resizer = header.querySelector<HTMLElement>('.entity-tree-table__column-resizer');
    const original = header.getBoundingClientRect().width;
    const x = resizer.getBoundingClientRect().right;
    resizer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: x }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x + 180 }));
    fixture.detectChanges();
    expect(header.getBoundingClientRect().width).toBeGreaterThan(original);
    expect(fixture.componentInstance.tableWidth).not.toBeNull();
    project(['name', 'used_parsed', 'available_parsed']);
    expect(fixture.componentInstance.columnWidths).toEqual([]);
    expect(fixture.componentInstance.tableWidth).toBeNull();
    // The selection also stops the in-progress drag.
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x + 250 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.columnWidths).toEqual([]);
    expect(root.querySelector('#theader_used_parsed').getBoundingClientRect().width).toBeCloseTo(112, 0);
    const wrapper = root.querySelector<HTMLElement>('.entity-tree-table__wrapper');
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(wrapper.clientWidth + 1);
  });

  it('preserves recursive three-state sorting and restores captured order when its column is hidden', () => {
    const sort = () => { root.querySelector<HTMLElement>('#theader_used_parsed').click(); fixture.detectChanges(); };
    sort();
    expect(names(nodes)).toEqual(['alpha', 'charlie', 'bravo']);
    expect(names(nodes[2].children)).toEqual(['child-a', 'child-z']);
    sort();
    expect(names(nodes)).toEqual(['bravo', 'charlie', 'alpha']);
    expect(names(nodes[0].children)).toEqual(['child-z', 'child-a']);
    sort();
    expect(names(nodes)).toEqual(['bravo', 'alpha', 'charlie']);
    sort();
    project(['name', 'type']);
    expect(names(nodes)).toEqual(['bravo', 'alpha', 'charlie']);
    expect(names(nodes[0].children)).toEqual(['child-z', 'child-a']);
    expect(fixture.componentInstance.sortField).toBeNull();
    expect(fixture.componentInstance.sortOrder).toBe(0);
    expect(nodes[0].expanded).toBeTrue();
  });

  it('keeps long names readable and expansion/node identity through projection and resizing', () => {
    nodes[0].children[0].data.name = 'a-very-long-dataset-name-'.repeat(8);
    fixture.detectChanges();
    const first = nodes[0];
    const child = first.children[0];
    const text = child.data.name;
    expect(root.textContent).toContain(text);
    const cell = Array.from(root.querySelectorAll<HTMLElement>('td.entity-tree-name-column')).find((element) => element.textContent.includes(text));
    expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth + 1);
    expect(cell.scrollHeight).toBeLessThanOrEqual(cell.clientHeight + 1);
    project([...defaults, 'comments']);
    project(defaults);
    root.style.width = '1000px';
    fixture.detectChanges();
    root.style.width = '668px';
    fixture.detectChanges();
    expect(conf.tableData[0]).toBe(first);
    expect(conf.tableData[0].children[0]).toBe(child);
    expect(first.expanded).toBeTrue();
    expect(root.querySelector<HTMLElement>('.entity-tree-table__wrapper').scrollWidth).toBeLessThanOrEqual(669);
  });

  it('keeps the actual Pool Status, Boot Pool Status and Multipaths configs on the unprojected path', () => {
    const consumers = [
      new VolumeStatusComponent(null, null, null, null, null, null, null, null, null).treeTableConfig,
      new BootStatusListComponent(null, null, null, null, null, null).treeTableConfig,
      new MultipathsComponent().treeTableConfig,
    ];
    project(undefined);
    for (const consumer of consumers) {
      fixture.componentRef.setInput('conf', { ...consumer, tableData: nodes });
      fixture.detectChanges();
      expect(headers()).toEqual(consumer.columns.map((column) => column.prop));
      expect(getComputedStyle(root.querySelector('table')).tableLayout).toBe('auto');
      expect(root.querySelector('colgroup')).toBeNull();
    }
  });
});
