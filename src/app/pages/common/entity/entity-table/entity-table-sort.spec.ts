import { EntityTableComponent } from './entity-table.component';

describe('EntityTableComponent sorting', () => {
  let component: EntityTableComponent;
  let originalRows: any[];

  beforeEach(() => {
    component = Object.create(EntityTableComponent.prototype);
    originalRows = [
      { name: 'Bravo', active: false },
      { name: 'Alpha', active: true },
      { name: 'Charlie', active: false },
    ];

    component.conf = { columns: [], config: {} };
    component.sortKey = 'name';
    component.rows = [...originalRows];
    component.currentRows = component.rows;
    component.activeSorts = [];
    component.showActions = true;
    component.paginationPageIndex = 0;
    (component as any).originalRows = [];
    (component as any).syncOriginalRowOrder(component.rows);
    (component as any).storageService = {
      tableSorter: (rows, prop, dir) => rows.sort((first, second) => {
        const result = first[prop] < second[prop] ? -1 : first[prop] > second[prop] ? 1 : 0;
        return dir === 'asc' ? result : -result;
      }),
    };
    (component as any).setPaginationInfo = jasmine.createSpy('setPaginationInfo');
  });

  it('cycles neutral, ascending, descending, and neutral while restoring original order', () => {
    component.reorderEvent({
      column: { prop: 'name' },
      prevValue: undefined,
      newValue: 'asc',
      sorts: [{ prop: 'name', dir: 'asc' }],
    });
    expect(component.activeSorts).toEqual([{ prop: 'name', dir: 'asc' }]);
    expect(component.rows.map((row) => row.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);

    component.reorderEvent({
      column: { prop: 'name' },
      prevValue: 'asc',
      newValue: 'desc',
      sorts: [{ prop: 'name', dir: 'desc' }],
    });
    expect(component.activeSorts).toEqual([{ prop: 'name', dir: 'desc' }]);
    expect(component.rows.map((row) => row.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);

    component.reorderEvent({
      column: { prop: 'name' },
      prevValue: 'desc',
      newValue: 'asc',
      sorts: [{ prop: 'name', dir: 'asc' }],
    });
    expect(component.activeSorts).toEqual([]);
    expect(component.rows).toEqual(originalRows);
  });

  it('keeps one active sort when switching to another column', () => {
    component.activeSorts = [{ prop: 'name', dir: 'desc' }];

    component.reorderEvent({
      column: { prop: 'active' },
      prevValue: undefined,
      newValue: 'asc',
      sorts: [
        { prop: 'name', dir: 'desc' },
        { prop: 'active', dir: 'asc' },
      ],
    });

    expect(component.activeSorts).toEqual([{ prop: 'active', dir: 'asc' }]);
  });
});
