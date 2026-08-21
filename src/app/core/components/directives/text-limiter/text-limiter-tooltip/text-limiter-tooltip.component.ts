import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  standalone: false,
  selector: 'text-limiter-tooltip',
  templateUrl: './text-limiter-tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./text-limiter-tooltip.component.css'],
})
export class TextLimiterTooltipComponent implements OnInit {
  @Input() text = '';

  constructor() { }

  ngOnInit() {
  }
}
