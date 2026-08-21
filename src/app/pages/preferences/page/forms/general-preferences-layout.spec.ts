import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { IXAutoDirective } from 'app/directives/common/ix-auto.directive';
import { FormCheckboxComponent } from 'app/pages/common/entity/entity-form/components/form-checkbox/form-checkbox.component';
import { TooltipComponent } from 'app/pages/common/entity/entity-form/components/tooltip/tooltip.component';
import { TooltipDocReplacePipe } from 'app/pages/common/entity/entity-form/components/tooltip/tooltip-docreplace';
import { DocsService } from 'app/services/docs.service';

@Component({
  standalone: false,
  selector: 'general-preferences-layout-test-host',
  template: '<div class="general-preferences-embedded-layout">Form</div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./general-preferences-form.component.css'],
})
class GeneralPreferencesLayoutTestHostComponent {}

// Keep the real Preferences host styles and embedded row structure. Only the
// preferences event bus is omitted; both the checkbox and its help are real.
@Component({
  standalone: false,
  selector: 'general-preferences-form',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./general-preferences-form.component.css'],
})
class PreferencesSpacingContainerComponent {}

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <general-preferences-form class="ix-blue" style="width: 640px;">
      <div class="fieldset-container fieldset-display-default">
        <div class="entity-form-embedded-fieldset-layout fieldset preferences">
          <div class="entity-form-embedded-field-layout form-inline">
            <form-checkbox #first></form-checkbox>
          </div>
          <div class="entity-form-embedded-field-layout form-inline">
            <form-checkbox #second></form-checkbox>
          </div>
        </div>
      </div>
    </general-preferences-form>
    <section class="ix-blue reference-form" style="width: 640px;">
      <div class="fieldset-container fieldset-display-default">
        <div class="entity-form-embedded-fieldset-layout fieldset preferences">
          <div class="entity-form-embedded-field-layout form-inline">
            <form-checkbox #referenceFirst></form-checkbox>
          </div>
          <div class="entity-form-embedded-field-layout form-inline">
            <form-checkbox #referenceSecond></form-checkbox>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['../../../common/entity/entity-form/entity-form-embedded.component.css'],
})
class PreferencesCheckboxSpacingHostComponent implements OnInit {
  @ViewChild('first', { static: true }) first: FormCheckboxComponent;
  @ViewChild('second', { static: true }) second: FormCheckboxComponent;
  @ViewChild('referenceFirst', { static: true }) referenceFirst: FormCheckboxComponent;
  @ViewChild('referenceSecond', { static: true }) referenceSecond: FormCheckboxComponent;

  ngOnInit(): void {
    [this.first, this.second, this.referenceFirst, this.referenceSecond].forEach((checkbox, index) => {
      checkbox.config = {
        type: 'checkbox', name: `preference_${index}`,
        placeholder: index % 2 ? 'Enable Password Toggle' : 'Prefer buttons with icons only',
        tooltip: 'Choose how controls appear in the interface.',
      };
      checkbox.group = new UntypedFormGroup({ [checkbox.config.name]: new UntypedFormControl(false) });
      checkbox.fieldShow = 'show';
    });
  }
}

describe('General Preferences embedded-form layout', () => {
  let fixture: ComponentFixture<GeneralPreferencesLayoutTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GeneralPreferencesLayoutTestHostComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeneralPreferencesLayoutTestHostComponent);
    fixture.detectChanges();
  });

  it('preserves the component-host flex-row contract', () => {
    const styles = getComputedStyle(fixture.nativeElement);

    expect(styles.display).toBe('flex');
    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flexDirection).toBe('row');
    expect(styles.flexWrap).toBe('nowrap');
  });

  it('preserves the full-width embedded-form flex contract', () => {
    const styles = getComputedStyle(fixture.nativeElement.querySelector('.general-preferences-embedded-layout'));

    expect(styles.boxSizing).toBe('border-box');
    expect(styles.flex).toBe('1 1 100%');
    expect(styles.maxWidth).toBe('100%');
    expect(styles.minWidth).toBe('auto');
  });
});

describe('General Preferences checkbox spacing', () => {
  let fixture: ComponentFixture<PreferencesCheckboxSpacingHostComponent>;
  let preferences: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        PreferencesCheckboxSpacingHostComponent, PreferencesSpacingContainerComponent,
        FormCheckboxComponent, TooltipComponent, TooltipDocReplacePipe, IXAutoDirective,
      ],
      imports: [
        CommonModule, DragDropModule, MatFormFieldModule, MatIconModule, HlmCheckboxImports, HlmLabelImports,
        NoopAnimationsModule, ReactiveFormsModule, TranslateModule.forRoot(),
      ],
      providers: [{ provide: DocsService, useValue: { docReplace: (message: string) => message } }],
    }).compileComponents();
    fixture = TestBed.createComponent(PreferencesCheckboxSpacingHostComponent);
    fixture.detectChanges();
    await document.fonts.ready;
    preferences = fixture.nativeElement.querySelector('general-preferences-form');
  });

  afterEach(() => fixture.destroy());

  // the internal development record: form-checkbox renders on spartan -- a 32px row (the #352 state-layer size)
  // with the 16px box centred in a 32px cell. Preferences keeps the internal development record's own gutter policy
  // (form-inline margins 0, form-checkbox 5px below), so its rows pitch at 37; the reference form
  // shows the unscoped default (8px embedded margins, no gutter): 48.
  it('keeps the Preferences row policy on the 32px spartan row, with aligned help, without changing other embedded forms', () => {
    const rows = Array.from(preferences.querySelectorAll<HTMLElement>('.checkbox-row'));
    const center = (element: HTMLElement): number => {
      const rect = element.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    expect(center(rows[1]) - center(rows[0])).toBeCloseTo(37, 1);
    rows.forEach((row) => {
      expect(row.getBoundingClientRect().height).toBeCloseTo(32, 1);
      const cell = row.querySelector<HTMLElement>('.checkbox-cell');
      const box = row.querySelector<HTMLElement>('button[role="checkbox"]');
      expect(cell.getBoundingClientRect().height).toBeCloseTo(32, 1);
      expect(cell.getBoundingClientRect().width).toBeCloseTo(32, 1);
      expect(box.getBoundingClientRect().width).toBeCloseTo(16, 1);
      const help = row.querySelector<HTMLElement>('.tooltip-icon');
      expect(Math.abs(center(help) - center(box))).toBeLessThan(5);
      expect(help.getBoundingClientRect().left).toBeGreaterThanOrEqual(box.getBoundingClientRect().right);
    });
    rows[0].querySelector<HTMLButtonElement>('button[role="checkbox"]').click();
    expect(fixture.componentInstance.first.group.get('preference_0').value).toBeTrue();

    const reference = fixture.nativeElement.querySelector('.reference-form');
    const referenceRows: NodeListOf<HTMLElement> = reference.querySelectorAll('.checkbox-row');
    expect(center(referenceRows[1]) - center(referenceRows[0])).toBeCloseTo(48, 1);
    expect(getComputedStyle(reference.querySelector('.form-inline')).margin).toBe('8px');
    expect(getComputedStyle(reference.querySelector('.form-checkbox')).marginBottom).toBe('0px');
  });

  it('lets long translated labels and warnings increase row height without clipping or covering the next preference', () => {
    const first = fixture.componentInstance.first;
    first.config.placeholder = 'Preserve screen space with icons and tooltips instead of text labels when displaying available actions.';
    first.config.warnings = 'This preference changes how action labels appear throughout the interface.';
    preferences.style.width = '320px';
    fixture.detectChanges();

    const row = preferences.querySelector<HTMLElement>('.form-inline');
    const label = row.querySelector<HTMLElement>('.checkbox-label');
    const warning = row.querySelector<HTMLElement>('.form-error-line');
    const next = preferences.querySelectorAll<HTMLElement>('.form-inline')[1];
    expect(label.textContent.trim()).toBe(first.config.placeholder);
    expect(label.getBoundingClientRect().height).toBeGreaterThan(parseFloat(getComputedStyle(label).lineHeight) * 2);
    expect(label.scrollHeight).toBeLessThanOrEqual(label.clientHeight + 1);
    expect(warning.textContent.trim()).toBe(first.config.warnings);
    expect(warning.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(warning.getBoundingClientRect().bottom).toBeLessThanOrEqual(row.getBoundingClientRect().bottom);
    expect(next.getBoundingClientRect().top).toBeGreaterThanOrEqual(warning.getBoundingClientRect().bottom + 4);
    expect(row.getBoundingClientRect().height).toBeGreaterThan(32);
    expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(preferences.getBoundingClientRect().right);
  });
});
