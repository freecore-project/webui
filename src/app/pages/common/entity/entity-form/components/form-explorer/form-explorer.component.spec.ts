import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TreeModule } from '@ali-hm/angular-tree-component';
import { TranslateModule } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { FieldConfig } from '../../models/field-config.interface';
import { EntityFormService } from '../../services/entity-form.service';
import { FieldLabelPipe, FieldPlaceholderPipe } from '../field-label.pipe';
import { FormErrorsComponent } from '../form-errors/form-errors.component';
import { FormExplorerComponent } from './form-explorer.component';

// the internal development record: the explorer on spartan -- the #351 path box with a ghost icon toggle, the
// tree kept on angular-tree-component and fed by a stubbed service. Fallback ladder: line #2A353D,
// bg1 #10151A, fg2 #97A6AE, red #E3625A.
describe('form-explorer on spartan (the internal development record)', () => {
  let fixture: ComponentFixture<FormExplorerComponent>;
  let component: FormExplorerComponent;
  let group: UntypedFormGroup;
  const q = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const qa = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));
  const until = async (ready: () => boolean): Promise<void> => {
    for (let i = 0; i < 100 && !ready(); i++) { await new Promise((resolve) => setTimeout(resolve, 10)); fixture.detectChanges(); }
    fixture.detectChanges();
  };
  const mid = (el: Element): number => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
  const service = {
    getFilesystemListdirChildren: jasmine.createSpy('listdir').and.callFake(() => Promise.resolve([
      { name: '/mnt/tank', subTitle: 'tank', hasChildren: true, acl: true },
      { name: '/mnt/notes.txt', subTitle: 'notes.txt', hasChildren: false },
    ])),
    getPoolDatasets: () => Promise.resolve([]),
  };

  const mount = (config: Partial<FieldConfig>, control = new UntypedFormControl('')): void => {
    group = new UntypedFormGroup({ [config.name]: control });
    component.config = { type: 'explorer', initial: '/mnt', explorerType: 'directory', ...config } as FieldConfig;
    component.group = group;
    component.fieldShow = 'show';
    fixture.detectChanges();
  };

  beforeEach(async () => {
    service.getFilesystemListdirChildren.calls.reset();
    await TestBed.configureTestingModule({
      declarations: [FormExplorerComponent, FormErrorsComponent, FieldLabelPipe, FieldPlaceholderPipe, IXAutoDirective],
      imports: [ReactiveFormsModule, TranslateModule.forRoot(), TreeModule, MatIconModule, HlmButtonImports, HlmFieldImports, HlmInputImports, HlmInputGroupImports, HlmLabelImports, HlmTextareaImports],
      providers: [{ provide: EntityFormService, useValue: service }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(FormExplorerComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '700px';
    fixture.nativeElement.style.color = 'var(--fg1, #DCE3E6)';
    // the tree paint lives in the shell layer and competes with the theme's tree rules: both scopes on
    fixture.nativeElement.classList.add('fc-ui', 'ix-blue');
    fixture.nativeElement.style.setProperty('--line', '#2A353D');
    fixture.nativeElement.style.setProperty('--bg1', '#10151A');
    fixture.nativeElement.style.setProperty('--fg1', '#DCE3E6');
    fixture.nativeElement.style.setProperty('--fg2', '#97A6AE');
  });

  it('draws the #351 path box beside a 32px ghost toggle on the box row, the tree below, with the hooks the pages key on', () => {
    mount({ name: 'path', placeholder: 'Path', required: true, tooltip: 'Pick a path.' });
    expect(q('.dynamic-field').getAttribute('ix-auto')).toBe('explorer__Path');
    expect(q('label').textContent.trim()).toBe('Path');
    expect(q('label').getAttribute('for')).toBe('path-input');
    const input = q('input') as HTMLInputElement;
    expect(input.id).toBe('path-input');
    expect(input.getAttribute('ix-auto')).toBe('input__path');
    expect(input.required).toBeTrue();
    const box = q('hlm-input-group');
    expect(box.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(box).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(q('hlm-field').getBoundingClientRect().height).toBe(72);
    const toggle = q('.explorer-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('ix-auto')).toBe('button__main-folder');
    expect(toggle.getAttribute('data-slot')).toBe('button');
    expect(toggle.getBoundingClientRect().width).toBe(32);
    expect(toggle.getBoundingClientRect().height).toBe(32);
    expect(Math.round(toggle.getBoundingClientRect().top)).toBe(Math.round(box.getBoundingClientRect().top));
    expect(getComputedStyle(toggle).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(q('.explorer-folder')).fontSize).toBe('20px');
    const tree = q('tree-root');
    expect(tree.id).toBe('box3');
    expect(tree.getBoundingClientRect().top).toBeGreaterThanOrEqual(q('hlm-field').getBoundingClientRect().bottom);
    expect(Math.round(tree.getBoundingClientRect().width)).toBe(Math.round(q('.form-ex-flex-container').getBoundingClientRect().width));
    expect(getComputedStyle(tree).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(getComputedStyle(tree).backgroundColor).toBe('rgb(16, 21, 26)');
    expect(getComputedStyle(tree).borderTopLeftRadius).toBe('6px');
    // the theme's bg1 slab behind the group is gone; the toggle has no UA padding left
    expect(getComputedStyle(q('.form-ex-flex-container')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(toggle).paddingLeft).toBe('0px');
    expect(q('.explorer-folder').getBoundingClientRect().width).toBe(20);
    expect(Math.round(q('.form-ex-flex-container').getBoundingClientRect().width)).toBe(630);
    const tip = q('#box2 > tooltip').getBoundingClientRect();
    expect(getComputedStyle(q('#box2 > tooltip')).position).toBe('absolute');
    expect(Math.round(tip.right)).toBe(Math.round(q('#box2').getBoundingClientRect().right));
    expect(q('mat-form-field')).toBeNull();
    expect(q('.mat-mdc-icon-button')).toBeNull();
    expect(q('mat-error')).toBeNull();
  });

  it('aligns the toggle with the box when the field has no label, and hides everything when hidden', () => {
    mount({ name: 'path', placeholder: 'Path', showLabel: false } as Partial<FieldConfig>);
    expect(q('label')).toBeNull();
    expect(q('.form-ex-labelled')).toBeNull();
    expect(Math.round(q('.explorer-toggle').getBoundingClientRect().top)).toBe(Math.round(q('hlm-input-group').getBoundingClientRect().top));
    mount({ name: 'path', placeholder: 'Path', isHidden: true });
    expect(q('.form-explorer')).toBeNull();
  });

  it('hides and shows the tree from the toggle', () => {
    mount({ name: 'path', placeholder: 'Path' });
    expect(q('tree-root')).not.toBeNull();
    (q('.explorer-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('tree-root')).toBeNull();
    (q('.explorer-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('tree-root')).not.toBeNull();
  });

  it('lists the children the service returns on expand and writes a clicked path into the control', async () => {
    mount({ name: 'path', placeholder: 'Path' });
    expect(qa('tree-node').length).toBe(1); // the /mnt root, collapsed
    (q('.toggle-children-wrapper') as HTMLElement).click();
    await until(() => qa('tree-node').length === 3);
    expect(service.getFilesystemListdirChildren).toHaveBeenCalled();
    const names = qa('tree-node-content > span').map((el) => el.textContent.trim().split(/\s/)[0]);
    expect(names).toEqual(['/mnt', 'tank', 'notes.txt']);
    expect(q('.dataset-subtitle').getAttribute('title')).toBe('An ACL is present in this path');
    expect(q('.dataset-subtitle').hasAttribute('mattooltip')).toBeFalse();
    expect(getComputedStyle(q('.dataset-subtitle')).color).toBe('rgb(220, 227, 230)'); // a quiet badge, not the accent slab
    const rows = qa('.node-content-wrapper');
    // the 24px row on the ladder: 3 + 18 + 3, no theme lead, chevron and glyph on the text's middle
    expect(getComputedStyle(rows[1]).borderTopLeftRadius).toBe('4px');
    expect(getComputedStyle(rows[1]).paddingLeft).toBe('6px');
    expect(getComputedStyle(rows[1]).marginLeft).toBe('0px');
    expect(rows[1].getBoundingClientRect().height).toBe(24);
    expect(Math.round(rows[2].getBoundingClientRect().top - rows[1].getBoundingClientRect().top)).toBe(24);
    expect(getComputedStyle(qa('tree-node-content > span')[1]).lineHeight).toBe('18px');
    expect(Math.abs(mid(q('.toggle-children')) - mid(qa('tree-node-content > span')[0]))).toBeLessThanOrEqual(1);
    expect(Math.abs(mid(qa('tree-node-content mat-icon')[1]) - mid(qa('tree-node-content > span')[1]))).toBeLessThanOrEqual(1);
    rows[1].click();
    fixture.detectChanges();
    expect(group.controls.path.value).toBe('/mnt/tank');
    expect((q('input') as HTMLInputElement).value).toBe('/mnt/tank');
    expect(rows[1].classList).toContain('node-content-wrapper-focused');
    expect(getComputedStyle(rows[1]).boxShadow).toBe('none');
    expect(getComputedStyle(rows[1]).backgroundColor).not.toBe('rgb(231, 244, 249)'); // the lib's light focus fill
  });

  it('writes the ticked nodes of a multiple explorer through the tree checkboxes, into the textarea', async () => {
    mount({ name: 'sources', placeholder: 'Sources', multiple: true, tristate: false } as Partial<FieldConfig>, new UntypedFormControl([]));
    (q('.toggle-children-wrapper') as HTMLElement).click();
    await until(() => qa('tree-node').length === 3);
    const boxes = qa('input.tree-node-checkbox');
    expect(boxes.length).toBe(3);
    expect(getComputedStyle(boxes[1]).accentColor).toBe('rgb(220, 227, 230)');
    boxes[1].click();
    fixture.detectChanges();
    boxes[2].click();
    fixture.detectChanges();
    expect(group.controls.sources.value).toEqual(['/mnt/tank', '/mnt/notes.txt']);
    expect((q('textarea') as HTMLTextAreaElement).value).toBe('/mnt/tank,/mnt/notes.txt');
    boxes[1].click();
    fixture.detectChanges();
    expect(group.controls.sources.value).toEqual(['/mnt/notes.txt']);
  });

  it('warns on a root click when the root is not selectable, in the field subscript', () => {
    mount({ name: 'path', placeholder: 'Path', rootSelectable: false } as Partial<FieldConfig>);
    (q('.node-content-wrapper') as HTMLElement).click();
    fixture.detectChanges();
    expect(group.controls.path.value).toBe('');
    expect(q('.field-subscript .form-error-line').textContent).toContain('Root node is not a valid value');
  });

  it('binds a multiple explorer to a textarea on the #351 stack', () => {
    mount({ name: 'sources', placeholder: 'Sources', multiple: true } as Partial<FieldConfig>, new UntypedFormControl(['/mnt/a']));
    expect(q('hlm-input-group')).toBeNull();
    const area = q('textarea') as HTMLTextAreaElement;
    expect(area.id).toBe('sources-input');
    expect(area.value).toBe('/mnt/a');
    expect(getComputedStyle(area).borderTopColor).toBe('rgb(42, 53, 61)');
    expect(q('.tree-node-checkbox')).not.toBeNull(); // useCheckbox follows multiple
  });

  it('lists server-side errors as the shared line under the box and disables the toggle with the field', () => {
    mount({ name: 'path', placeholder: 'Path', hasErrors: true, errors: 'No such path.', disabled: true } as Partial<FieldConfig>);
    expect(q('.field-subscript .form-error-line').textContent).toContain('No such path.');
    expect(getComputedStyle(q('.form-error-line')).color).toBe('rgb(227, 98, 90)');
    expect((q('.explorer-toggle') as HTMLButtonElement).disabled).toBeTrue();
    expect(getComputedStyle(q('.explorer-toggle')).opacity).toBe('0.4');
    expect(q('tree-root')).toBeNull();
    component.config.disabled = false;
    fixture.detectChanges();
    expect(q('tree-root')).not.toBeNull();
    expect((q('.explorer-toggle') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('keeps the consumer contract on customTemplateStringOptions and survives a re-init', () => {
    const getChildren = jasmine.createSpy('getChildren').and.returnValue(Promise.resolve([]));
    const options: any = { displayField: 'Path', isExpandedField: 'expanded', idField: 'uuid', getChildren, nodeHeight: 23, useVirtualScroll: false };
    mount({ name: 'folder', placeholder: 'Folder', customTemplateStringOptions: options } as Partial<FieldConfig>);
    expect(options.explorer).toBe(component);
    expect(options.explorerComponent).toBe(component);
    expect(options.actionMapping).toBe(component['actionMapping']);
    expect(component.customTemplateStringOptions).toBe(options);
    component.ngOnInit(); // cloudsync re-invokes it when the credential changes
    fixture.detectChanges();
    expect(options.displayField).toBe('Path');
    expect(qa('tree-node').length).toBe(1);
    component.nodes = [{ name: '/x', subTitle: '/x', hasChildren: true }]; // replication resets the root
    fixture.detectChanges();
    expect(q('tree-node-content > span').textContent.trim()).toBe('/x');
  });
});
