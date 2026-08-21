import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { RestService, WebSocketService } from '../../../services';
import { EntityFormService } from '../../common/entity/entity-form/services/entity-form.service';
import { EntityModule } from '../../common/entity/entity.module';
import { FormTextareaComponent } from '../../common/entity/entity-form/components/form-textarea/form-textarea.component';
import { FormInputComponent } from '../../common/entity/entity-form/components/form-input/form-input.component';
import { FormSelectComponent } from '../../common/entity/entity-form/components/form-select/form-select.component';

describe('Bastille explicit native field labels', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [EntityFormService, { provide: WebSocketService, useValue: {} }, { provide: RestService, useValue: {} }],
    }).compileComponents();
  });
  afterEach(() => TestBed.resetTestingModule());

  for (const value of ['', 'tank']) {
    it(`retains exactly one input label with value ${JSON.stringify(value)}`, () => {
      const fixture = TestBed.createComponent(FormInputComponent);
      fixture.componentInstance.config = { type: 'input', name: 'pool', showLabel: true, label: 'Data Pool', placeholder: 'Data Pool' };
      fixture.componentInstance.group = new FormGroup({ pool: new FormControl(value) });
      fixture.detectChanges();
      // the internal development record: form-input renders on spartan -- one static hlm label, tied by `for`.
      const labels = fixture.nativeElement.querySelectorAll('label[data-slot="field-label"]');
      expect(labels.length).toBe(1);
      expect(labels[0].textContent).toBe('Data Pool');
      const input: HTMLInputElement = fixture.nativeElement.querySelector('#pool-input');
      expect(input.value).toBe(value);
      expect(labels[0].getAttribute('for')).toBe(input.id);
    });
  }

  it('keeps a populated select labeled and associates the label with the control', () => {
    const fixture = TestBed.createComponent(FormSelectComponent);
    fixture.componentInstance.config = { type: 'select', name: 'pool', showLabel: true, label: 'Data Pool', placeholder: 'Data Pool', options: [{ label: 'tank', value: 'tank' }] };
    fixture.componentInstance.group = new FormGroup({ pool: new FormControl('tank') });
    fixture.detectChanges();
    // the internal development record: form-select renders on spartan -- the hlm label is tied to the trigger by `for`.
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label[data-slot="field-label"]');
    const trigger: HTMLElement = fixture.nativeElement.querySelector('button[data-slot="select-trigger"]');
    expect(label.textContent).toContain('Data Pool');
    expect(label.getAttribute('for')).toBe(trigger.id);
    expect(trigger.textContent.trim()).toBe('tank');
    expect(fixture.nativeElement.querySelectorAll('label[data-slot="field-label"]').length).toBe(1);
  });

  it('labels multiline Notes only when explicitly requested and keeps legacy textareas unchanged', () => {
    for (const showLabel of [true, false]) {
      const fixture = TestBed.createComponent(FormTextareaComponent);
      fixture.componentInstance.config = { type: 'textarea', name: 'notes', showLabel, label: 'Notes', placeholder: 'Notes', textAreaRows: 2 };
      fixture.componentInstance.group = new FormGroup({ notes: new FormControl('First line\nSecond line') });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('label[data-slot="field-label"]').length).toBe(showLabel ? 1 : 0);
      const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
      expect(textarea.value).toBe('First line\nSecond line');
      expect(textarea.rows).toBe(2);
      fixture.destroy();
    }
  });

  it('does not activate existing labels without the explicit opt-in', () => {
    const fixture = TestBed.createComponent(FormInputComponent);
    fixture.componentInstance.config = { type: 'input', name: 'old', label: 'Existing unused label', placeholder: 'Legacy placeholder' };
    fixture.componentInstance.group = new FormGroup({ old: new FormControl('value') });
    fixture.detectChanges();

    // The guard this test exists for: a stale `label` left on an inherited
    // config stays dormant, because showLabel is what activates it.
    const label = fixture.nativeElement.querySelector('label[data-slot="field-label"]');
    expect(label.textContent).not.toBe('Existing unused label');

    // the internal development record: the field is still named, by the placeholder that
    // 13.3 floated above it. Having been promoted, it no longer also sits
    // inside the field, where it would read twice once the label floats.
    expect(label.textContent).toBe('Legacy placeholder');
    expect(fixture.nativeElement.querySelector('#old-input').placeholder).toBe('');
  });
});
