import { Component, OnInit, ViewChild } from '@angular/core';
import { MatLegacyProgressBar as MatProgressBar } from '@angular/material/legacy-progress-bar';
import { MatLegacyButton as MatButton } from '@angular/material/legacy-button';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  })
export class SignupComponent implements OnInit {
  @ViewChild(MatProgressBar, { static: false }) progressBar: MatProgressBar;
  @ViewChild(MatButton, { static: false }) submitButton: MatButton;
  signupData = {
    email: '',
    password: '',
    confirmPassword: '',
    isAgreed: '',
  };

  constructor() {}

  ngOnInit() {
  }

  signup() {
    console.log(this.signupData);

    this.submitButton.disabled = true;
    this.progressBar.mode = 'indeterminate';
  }
}
