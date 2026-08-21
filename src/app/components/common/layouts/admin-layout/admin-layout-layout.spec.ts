import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FC_DRAWER } from 'app/components/common/drawer/fc-drawer';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AdminLayoutComponent } from './admin-layout.component';

@Component({
  standalone: false,
  selector: 'admin-layout-layout-test-host',
  template: `
    <fc-drawer-container
      class="admin-shell-layout app-side-nav-container"
      [class.xs]="media.isActive('xs')"
      [class.sm]="media.isActive('sm')"
      [class.md]="media.isActive('md')"
      [class.lg]="media.isActive('lg')"
      [class.xl]="media.isActive('xl')"
    >
      <fc-drawer
        class="admin-primary-sidenav-layout primary-sidenav"
        [opened]="true"
        mode="side"
      >
        <div class="admin-navigation-layout primary-navigation">Navigation</div>
      </fc-drawer>
      <fc-drawer-content
        class="admin-main-content-layout main-content"
        [style.--admin-sidenav-width]="sidenavWidth"
        [style.margin-left]="sidenavWidth"
      >
        Content
      </fc-drawer-content>
      <fc-drawer class="notification-sidenav" mode="over" position="end">
        <div class="admin-navigation-layout notification-navigation">Notifications</div>
      </fc-drawer>
    </fc-drawer-container>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./admin-layout.component.css'],
})
class AdminLayoutLayoutTestHostComponent {
  activeAlias = '';
  sidenavWidth = '240px';
  media = {
    isActive: (alias: string): boolean => alias === this.activeAlias,
  };
}

describe('admin shell layout', () => {
  let fixture: ComponentFixture<AdminLayoutLayoutTestHostComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AdminLayoutLayoutTestHostComponent],
      imports: [...FC_DRAWER, NoopAnimationsModule], // the internal development record: the shell's drawers
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminLayoutLayoutTestHostComponent);
    fixture.detectChanges();
  });

  it('preserves each mutually exclusive responsive shell marker', () => {
    const aliases = ['xs', 'sm', 'md', 'lg', 'xl'];
    const shell = fixture.nativeElement.querySelector('.admin-shell-layout');

    aliases.forEach((activeAlias) => {
      fixture.componentInstance.activeAlias = activeAlias;
      fixture.detectChanges();

      aliases.forEach((alias) => {
        expect(shell.classList.contains(alias)).toBe(alias === activeAlias);
      });
    });
  });

  it('preserves the shell row and primary-sidenav flex contracts', () => {
    const shell = getComputedStyle(fixture.nativeElement.querySelector('.admin-shell-layout'));
    const sidenav = getComputedStyle(fixture.nativeElement.querySelector('.primary-sidenav'));

    expect(shell.display).toBe('flex');
    expect(shell.boxSizing).toBe('border-box');
    expect(shell.flexDirection).toBe('row');
    expect(shell.flexWrap).toBe('nowrap');
    expect(sidenav.display).toBe('block');
    expect(sidenav.boxSizing).toBe('border-box');
    expect(sidenav.flex).toBe('1 1 100%');
    expect(sidenav.maxWidth).toBe('none');
  });

  it('preserves both non-wrapping navigation columns', () => {
    const navigationHosts = fixture.nativeElement.querySelectorAll('.admin-navigation-layout');

    expect(navigationHosts.length).toBe(2);
    navigationHosts.forEach((navigation: Element) => {
      const styles = getComputedStyle(navigation);

      expect(styles.display).toBe('flex');
      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flexDirection).toBe('column');
      expect(styles.flexWrap).toBe('nowrap');
    });
  });

  it('preserves the dynamic main-content flex, minimum, and margin widths', () => {
    const contentElement = fixture.nativeElement.querySelector('.main-content');

    ['240px', '48px', '0px'].forEach((sidenavWidth) => {
      fixture.componentInstance.sidenavWidth = sidenavWidth;
      fixture.detectChanges();

      const styles = getComputedStyle(contentElement);
      const calculatedWidth = sidenavWidth === '0px' ? '100%' : `calc(100% - ${sidenavWidth})`;

      expect(styles.boxSizing).toBe('border-box');
      expect(styles.flex).toBe(`1 1 ${calculatedWidth}`);
      expect(styles.minWidth).toBe(calculatedWidth);
      expect(styles.maxWidth).toBe('none');
      expect(styles.marginLeft).toBe(sidenavWidth);
    });
  });
});


describe('15.2 sidebar width', () => {
  it('matches the expanded, collapsed, hidden and overlay layouts', () => {
    const shell = Object.create(AdminLayoutComponent.prototype) as AdminLayoutComponent;
    const wasCollapsed = document.body.classList.contains('collapsed-menu');
    try {
      shell.isSidenavOpen = true;
      shell.sidenavMode = 'side';
      document.body.classList.remove('collapsed-menu');
      expect(shell.getSidenavWidth()).toBe('216px');
      document.body.classList.add('collapsed-menu');
      expect(shell.getSidenavWidth()).toBe('48px');
      shell.sidenavMode = 'over';
      expect(shell.getSidenavWidth()).toBe('0px');
      shell.sidenavMode = 'side';
      shell.isSidenavOpen = false;
      expect(shell.getSidenavWidth()).toBe('0px');
    } finally {
      document.body.classList.toggle('collapsed-menu', wasCollapsed);
    }
  });
});

describe('15.2 shell scope on the body (the internal development record)', () => {
  // Dialogs, menus and select panels hang off <body>, so the shell marks the
  // body with fc-ui while it is mounted and clears it when it goes.
  it('adds fc-ui to the body on init and removes it on destroy', () => {
    const shell = Object.create(AdminLayoutComponent.prototype) as AdminLayoutComponent;
    Object.assign(shell, {
      themeService: { allThemes: [], currentTheme: () => ({ name: 'freecore' }) },
      media: { isActive: () => false },
      core: { emit: () => undefined },
      checkIfConsoleMsgShows: () => undefined,
    });
    document.body.classList.remove('fc-ui');
    jasmine.clock().install();
    try {
      shell.ngOnInit();
      expect(document.body.classList.contains('fc-ui')).toBe(true);
      shell.ngOnDestroy();
      expect(document.body.classList.contains('fc-ui')).toBe(false);
    } finally {
      jasmine.clock().uninstall();
      document.body.classList.remove('fc-ui');
    }
  });
});
