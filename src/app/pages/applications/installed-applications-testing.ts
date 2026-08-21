import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpClient } from '@angular/common/http';
import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { CoreService } from '../../core/services/core.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { JobService, RestService, WebSocketService } from '../../services';
import { AppLoaderService } from '../../services/app-loader/app-loader.service';
import { DocsService } from '../../services/docs.service';
import { ErdService } from '../../services/erd.service';
import { LocaleService } from '../../services/locale.service';
import { StorageService } from '../../services/storage.service';
import { EntityTableComponent } from '../common/entity/entity-table/entity-table.component';
import { ApplicationsComponent } from './applications.component';
import { InstalledApplication } from './applications.types';

/** Test stores publish assigned records just as the real store does (the internal development record). */
export function publishInstalledRecords(store: any): void {
  let installed: InstalledApplication[] = store.installed || [];
  store.installed$ = new BehaviorSubject<InstalledApplication[] | null>(installed);
  Object.defineProperty(store, 'installed', {
    configurable: true,
    get: () => installed,
    set: (records: InstalledApplication[]) => {
      installed = records;
      store.installed$.next(records);
    },
  });
}

/** The real table and row details, with only their unused service boundaries stubbed. */
export function installedTableProviders(): Provider[] {
  return [
    StorageService,
    { provide: WebSocketService, useValue: { onCloseSubject: NEVER, call: () => NEVER } },
    { provide: RestService, useValue: { get: () => NEVER } },
    { provide: HttpClient, useValue: {} },
    { provide: AppLoaderService, useValue: { open: () => {}, close: () => {} } },
    { provide: JobService, useValue: {} },
    { provide: DocsService, useValue: { getDocs: () => of('') } },
    { provide: ErdService, useValue: { attachResizeEventToElement: () => {} } },
    { provide: LocaleService, useValue: { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' } },
    { provide: CoreService, useValue: { register: () => NEVER, unregister: () => {}, emit: () => {} } },
    { provide: PreferencesService, useValue: {
      // A different table's preference skips the engine's two-second first-use delay.
      preferences: { tableDisplayedColumns: [{ title: 'Other table', cols: [] }], preferIconsOnly: false },
      savePreferences: () => {},
    } },
  ];
}

export async function settleInstalledTable(fixture: ComponentFixture<ApplicationsComponent>): Promise<EntityTableComponent> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const table = fixture.debugElement.query(By.directive(EntityTableComponent)).componentInstance as EntityTableComponent;
  table.table?.recalculate();
  window.dispatchEvent(new Event('resize'));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return table;
}

export async function expandInstalledRow(
  fixture: ComponentFixture<ApplicationsComponent>, name: string,
): Promise<HTMLElement> {
  await settleInstalledTable(fixture);
  const cell = fixture.nativeElement.querySelector(`[id="${name}_Name"]`) as HTMLElement;
  const row = cell.closest('datatable-row-wrapper');
  const expander = row.querySelector('.datatable-icon-right') as HTMLElement;
  expander?.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return row.querySelector('app-entity-table-row-details') as HTMLElement;
}

export function installedAction(root: ParentNode, name: string, action: string): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>(`[id="action_button_${name}__${action}"]`);
}

export function installedDetail(root: ParentNode, label: string): string {
  const row = Array.from(root.querySelectorAll('.entity-table-row-detail-layout'))
    .find((element) => element.querySelector('h4').textContent.trim() === label); // the internal development record: the band's label has no colon
  return row?.querySelector('.entity-table-row-detail-value-layout').textContent.trim() || '';
}

/** the internal development record: Install/Edit, Import, Convert and Export render in dialogs, outside the page's host. */
export function dialogRoot(): HTMLElement {
  return TestBed.inject(OverlayContainer).getContainerElement();
}

/** the internal development record: press Install... beside a review and let the dialog render. */
export async function openInstallDialog(fixture: ComponentFixture<ApplicationsComponent>): Promise<HTMLElement> {
  fixture.componentInstance.openInstall();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return dialogRoot();
}

/** Drop any dialog a case left open, so the next case starts from an empty overlay. */
export function clearDialogs(): void {
  TestBed.inject(OverlayContainer).ngOnDestroy();
}
