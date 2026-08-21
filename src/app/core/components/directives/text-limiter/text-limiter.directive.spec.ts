import { Overlay, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { ElementRef } from '@angular/core';

import { TextLimiterDirective } from './text-limiter.directive';

describe('TextLimiterDirective', () => {
  it('should create an instance', () => {
    const directive = new TextLimiterDirective(
      new ElementRef({}),
      {} as OverlayPositionBuilder,
      {} as Overlay,
    );
    expect(directive).toBeTruthy();
  });
});
