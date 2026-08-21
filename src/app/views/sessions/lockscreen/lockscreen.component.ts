import { Component, OnInit, ViewChild } from '@angular/core';
import { MatLegacyProgressBar as MatProgressBar } from '@angular/material/legacy-progress-bar';
import { MatLegacyButton as MatButton } from '@angular/material/legacy-button';

@Component({
  selector: 'app-lockscreen',
  templateUrl: './lockscreen.component.html',
  styleUrls: ['./lockscreen.component.css'],
  })
export class LockscreenComponent implements OnInit {
  @ViewChild(MatProgressBar, { static: false }) progressBar: MatProgressBar;
  @ViewChild(MatButton, { static: false }) submitButton: MatButton;

  lockscreenData = {
    password: '',
  };

  constructor() { }

  ngOnInit() {
  }

  unlock() {
    console.log(this.lockscreenData);

    this.submitButton.disabled = true;
    this.progressBar.mode = 'indeterminate';
  }
}
