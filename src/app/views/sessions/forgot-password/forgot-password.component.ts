import { Component, OnInit, ViewChild } from '@angular/core';
import { MatLegacyProgressBar as MatProgressBar } from '@angular/material/legacy-progress-bar';
import { MatLegacyButton as MatButton } from '@angular/material/legacy-button';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  })
export class ForgotPasswordComponent implements OnInit {
  userEmail;
  @ViewChild(MatProgressBar, { static: false }) progressBar: MatProgressBar;
  @ViewChild(MatButton, { static: false }) submitButton: MatButton;
  constructor() { }

  ngOnInit() {
  }
  submitEmail() {
    this.submitButton.disabled = true;
    this.progressBar.mode = 'indeterminate';
  }
}
