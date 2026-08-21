import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';

// the internal development record: proves the copied helm component compiles under the webui toolchain
// (tsconfig path alias, karma/jasmine, Angular 22) and that `classes()` from helm/utils writes
// the variant classes onto the host while keeping the consumer's own class.
@Component({
  imports: [HlmButtonImports],
  template: '<button hlmBtn variant="outline" size="sm" class="mt-2">Spartan</button>',
})
class HostComponent {}

describe('spartan foundation: HlmButton', () => {
  it('renders the helm variant classes and keeps the consumer class', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.classList).toContain('inline-flex');
    expect(button.classList).toContain('h-7'); // size="sm"
    expect(button.classList).toContain('border-border'); // variant="outline"
    expect(button.classList).toContain('mt-2');
  });
});
