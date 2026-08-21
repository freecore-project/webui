import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  standalone: false,
  selector: 'form-status',
  templateUrl: './form-status.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./form-status.component.css'],
})
export class FormStatusComponent implements OnInit {
  @Input() statusIcon = 'checkmark';

  constructor() { }

  ngOnInit() {
  }
}
