import { ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';

import { EntityTableComponent } from './entity-table.component';

describe('EntityTableComponent resize lifecycle', () => {
  let component: EntityTableComponent;
  let host: HTMLElement;
  let setPaginationInfo: jasmine.Spy;

  beforeEach(() => {
    host = document.createElement('section');
    component = Object.create(EntityTableComponent.prototype);
    (component as any)._eRef = new ElementRef(host);
    (component as any).core = jasmine.createSpyObj('CoreService', ['unregister']);
    (component as any).routeSub = new Subscription();
    (component as any).footerHeight = 50;
    component.conf = { columns: [], autoFillWindowHeight: true };
    component.paginationPageSize = 8;
    component.rowHeight = 50;
    component.selected = [];
    setPaginationInfo = jasmine.createSpy('setPaginationInfo');
    (component as any).setPaginationInfo = setPaginationInfo;
  });

  afterEach(() => {
    component.cleanup();
  });

  it('uses only the datatable body owned by this component', () => {
    const unrelatedBody = document.createElement('datatable-body');
    document.body.appendChild(unrelatedBody);
    const unrelatedRect = spyOn(unrelatedBody, 'getBoundingClientRect');
    const tableBody = document.createElement('datatable-body');
    host.appendChild(tableBody);
    spyOn(tableBody, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 160, 100, 100));

    component.setTableHeight();
    window.dispatchEvent(new Event('resize'));

    const availableHeight = window.innerHeight - 160 - component.footerHeight - 20;
    expect(component.paginationPageSize).toBe(Math.max(2, Math.floor(availableHeight / component.rowHeight)));
    expect(unrelatedRect).not.toHaveBeenCalled();
    expect(setPaginationInfo).toHaveBeenCalledTimes(1);
    unrelatedBody.remove();
  });

  it('does nothing safely when its table body is not rendered', () => {
    component.setTableHeight();

    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
    expect(setPaginationInfo).not.toHaveBeenCalled();
  });

  it('keeps one listener and removes it during cleanup', () => {
    host.appendChild(document.createElement('datatable-body'));
    component.setTableHeight();
    component.setTableHeight();

    window.dispatchEvent(new Event('resize'));
    expect(setPaginationInfo).toHaveBeenCalledTimes(1);

    component.cleanup();
    window.dispatchEvent(new Event('resize'));
    expect(setPaginationInfo).toHaveBeenCalledTimes(1);
  });
});
