import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-plugins-retired',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<p>Redirecting to Applications…</p>',
})
export class PluginsRetiredComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.navigate(['/applications'], {
      replaceUrl: true,
      queryParams: { legacy: 'iocage-plugin-store' },
    });
  }
}
