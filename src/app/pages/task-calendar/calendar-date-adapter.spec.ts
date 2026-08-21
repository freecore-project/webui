import { TestBed } from '@angular/core/testing';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

describe('Task Calendar DateAdapter', () => {
  let adapter: DateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CalendarModule.forRoot({
          provide: DateAdapter,
          useFactory: adapterFactory,
        }),
      ],
    });

    adapter = TestBed.inject(DateAdapter);
  });

  it('provides date-fns calendar arithmetic through the existing module contract', () => {
    const initial = new Date(2026, 7, 26, 12);
    const next = adapter.addDays(initial, 2);

    expect(adapter.differenceInDays(next, initial)).toBe(2);
    expect(adapter.getDate(next)).toBe(28);
  });
});
