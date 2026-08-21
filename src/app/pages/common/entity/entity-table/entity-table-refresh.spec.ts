import { EntityTableComponent } from './entity-table.component';

describe('EntityTableComponent refresh pagination', () => {
  function table(preservePageOnRefresh = true): EntityTableComponent {
    const component = Object.create(EntityTableComponent.prototype);
    component.conf = { columns: [], preservePageOnRefresh };
    component.paginationPageIndex = 2;
    component.paginationPageSize = 10;
    component.showDefaults = true;
    component.expandedRows = 0;
    component.asyncView = true;
    component.filter = { nativeElement: { value: '' } };
    component.generateRows = (response) => response.data;
    component.syncOriginalRowOrder = () => {};
    component.setFilteredRows = () => {};
    component.setPaginationInfo = () => {};
    component.updateTableHeightAfterDetailToggle = () => {};
    component.storageService = { tableSorter: () => {} };
    return component;
  }

  const rows = (count: number): any[] => Array.from({ length: count }, (_, id) => ({ id }));

  it('keeps the current page during an opted-in background refresh', () => {
    const component = table();
    component.handleData(rows(50), true);
    expect(component.paginationPageIndex).toBe(2);
    expect(component.currentRows.length).toBe(50);
  });

  it('clamps the page when peers disappear, including an empty list', () => {
    const component = table();
    component.handleData(rows(12), true);
    expect(component.paginationPageIndex).toBe(1);
    component.handleData([], true);
    expect(component.paginationPageIndex).toBe(0);
  });

  it('preserves the existing refresh behavior for other tables', () => {
    const component = table(false);
    component.handleData(rows(50), true);
    expect(component.paginationPageIndex).toBe(0);
  });

  it('still resets the page for an explicit non-background reload', () => {
    const component = table();
    component.handleData(rows(50), false);
    expect(component.paginationPageIndex).toBe(0);
  });
});
