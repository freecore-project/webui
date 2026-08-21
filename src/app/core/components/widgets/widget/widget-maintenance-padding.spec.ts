import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacyCardModule } from '@angular/material/legacy-card';

@Component({
  template: `<mat-card class="widget" style="width:320px;padding:0">
    <mat-card-content style="width:100%;padding:16px">Content</mat-card-content>
  </mat-card><mat-card><mat-card-content>Unrelated</mat-card-content></mat-card>`,
  styleUrls: ['../../../../../assets/styles/fork-polish.css'],
  })
class MaintenancePaddingHost {}

describe('maintenance dashboard content sizing', () => {
  let fixture: ComponentFixture<MaintenancePaddingHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MaintenancePaddingHost], imports: [MatLegacyCardModule],
    }).compileComponents();
    fixture = TestBed.createComponent(MaintenancePaddingHost);
    fixture.detectChanges();
  });
  afterEach(() => fixture?.destroy());

  it('includes existing symmetric padding in percentage width without adding padding elsewhere', () => {
    const root = fixture.nativeElement as HTMLElement;
    const content = root.querySelector('.widget mat-card-content');
    expect(getComputedStyle(content).boxSizing).toBe('border-box');
    expect(getComputedStyle(content).paddingLeft).toBe('16px');
    expect(getComputedStyle(content).paddingRight).toBe('16px');
    expect(content.getBoundingClientRect().width).toBe(root.querySelector('.widget').getBoundingClientRect().width);
    expect(getComputedStyle(root.querySelector('mat-card:not(.widget) mat-card-content')).paddingLeft).toBe('0px');
  });
});
