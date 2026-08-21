import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxDualListboxModule } from './dual-list.module';

// the internal development record: the dual list draws a template item (Accounts -> Groups -> Members) on a plain row --
// what mat-list (8px above and below) and mat-list-item (48px, 16px sides) drew: 64px, the text on a 24px
// line from 20px down at 14px, one line, clipped; a picked row is still the chosen one.
@Component({
  standalone: false,
  template: `
    <app-dual-listbox [items]="users" [(selectedItems)]="members" minHeight="400px" maxHeight="400px"
      title1="All users" title2="Group members">
      <ng-template #templateItem let-item="data"><span class="pointer">{{ item.username }}</span></ng-template>
    </app-dual-listbox>
  `,
})
class DualListHostComponent {
  users = [{ id: 1, username: 'root' }, { id: 2, username: 'daemon' }, { id: 3, username: 'operator' }];
  members = [{ id: 1, username: 'root' }];
}

describe('dual list rows (the internal development record)', () => {
  let fixture: ComponentFixture<DualListHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [DualListHostComponent], imports: [NgxDualListboxModule] }).compileComponents();
    fixture = TestBed.createComponent(DualListHostComponent);
    fixture.nativeElement.style.cssText = 'display:block; width:1000px';
    fixture.detectChanges();
  });

  it('draws each template item on the 64px row mat-list gave it, without Material', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('mat-list, mat-list-item')).toBeNull();
    const rows = Array.from(root.querySelectorAll<HTMLElement>('.dual-list-row'));
    expect(rows.length).toBe(3); // daemon + operator on the left, root on the right
    for (const row of rows) {
      const box = row.getBoundingClientRect();
      const text = row.querySelector('span').getBoundingClientRect();
      const style = getComputedStyle(row);
      expect(Math.round(box.height)).toBe(64);
      expect([style.fontSize, style.lineHeight, style.whiteSpace, style.overflow]).toEqual(['14px', '24px', 'nowrap', 'hidden']);
      expect(Math.round(text.left - box.left)).toBe(16);
      expect(Math.round(text.top - box.top)).toBe(20);
    }
  });

  it('marks a picked row as the chosen one', () => {
    const row = fixture.nativeElement.querySelector('.container-items .draggable') as HTMLElement;
    row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    row.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    fixture.detectChanges();
    expect(row.classList).toContain('chosen');
  });
});
