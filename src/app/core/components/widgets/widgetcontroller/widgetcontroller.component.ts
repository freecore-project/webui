import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  Input, Output, QueryList, ViewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { CoreEvent } from 'app/core/services/core.service';
import { WidgetComponent } from 'app/core/components/widgets/widget/widget.component';
import { LayoutMediaObserver } from 'app/services/layout-media-observer.service';
import { T } from '../../../../translate-marker';

export interface DashConfigItem {
  name: string; // Shown in UI fields
  identifier?: string; // Comma separated 'key,value' eg. pool might have 'name,tank'
  rendered: boolean;
  position?: number;
}

@Component({
  standalone: false,
  selector: 'widget-controller',
  templateUrl: './widgetcontroller.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./widgetcontroller.component.css'],
})
export class WidgetControllerComponent extends WidgetComponent implements AfterViewInit {
  @Input() dashState: DashConfigItem[] = [];
  @Input()renderedWidgets?: number[] = [];
  @Input()hiddenWidgets?: number[] = [];

  @Output() launcher = new EventEmitter();
  @ViewChildren('launcherButton', { read: ElementRef }) private launcherButtons: QueryList<ElementRef<HTMLButtonElement>>;
  private mediaSub: Subscription;

  title: string = T('Dashboard');
  subtitle: string = T('Navigation');
  widgetColorCssVar = 'var(--accent)';
  configurable = false;
  screenType = 'Desktop'; // Desktop || Mobile

  constructor(public router: Router, public translate: TranslateService, public mediaObserver: LayoutMediaObserver) {
    super(translate);

    this.mediaSub = mediaObserver.asObservable().pipe(
      filter((changes) => changes.length > 0),
      map((changes) => changes[0]),
    ).subscribe((evt) => {
      const st = evt.mqAlias == 'xs' ? 'Mobile' : 'Desktop';
      this.screenType = st;
    });
  }

  ngOnDestroy() {
    this.mediaSub.unsubscribe();
    this.core.unregister({ observerClass: this });
  }

  ngAfterViewInit() {
    this.core.register({ observerClass: this, eventName: 'ThemeChanged' }).subscribe((evt: CoreEvent) => {
    });
  }

  nameFromIdentifier(identifier) {
    const spl = identifier.split(',');
    const key = spl[0];
    const value = spl[1];

    if (key == 'name') {
      return value;
    }
    return '';
  }

  launchWidget(widget) {
    this.launcher.emit(widget);
  }

  widgetKey(widget: DashConfigItem): string {
    return `${widget.name}:${widget.identifier || ''}`;
  }

  focusWidget(widget?: DashConfigItem): void {
    const buttons = this.launcherButtons?.toArray() || [];
    const target = widget && buttons.find((button) => button.nativeElement.dataset.widgetKey === this.widgetKey(widget));
    (target || buttons[0])?.nativeElement.focus();
  }
}
