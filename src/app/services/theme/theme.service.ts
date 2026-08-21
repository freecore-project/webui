import { Injectable } from '@angular/core';
import * as domHelper from '../../helpers/dom.helper';
import { RestService, WebSocketService } from 'app/services';
import { CoreService, CoreEvent } from 'app/core/services/core.service';
import { ThemeUtils } from 'app/core/classes/theme-utils';
import { ApiService } from 'app/core/services/api.service';
import { Router } from '@angular/router';

// the internal development record: labels are what the theme picker shows, so the vendor name
// had to go. The `name` keys stay as-is on purpose -- they are the CSS class
// (index.html ships <body class="ix-blue">, ix-blue.scss defines .ix-blue) and
// the value persisted in user preferences. Renaming them buys nothing visible
// and breaks both.
// FreeCORE — the modern default identity. Coretrident mark, refined cool-steel
// palette from the FreeCORE brand tokens; distinct from the inherited TrueNAS blue.
export const DefaultTheme = {
  name: 'freecore',
  label: 'FreeCORE',
  labelSwatch: 'blue',
  description: 'FreeCORE — modern dark',
  mascot: 'FreeCORE_mascot.png',
  logo: 'FreeCORE_logo_horizontal.png',
  accentColors: ['blue', 'cyan', 'green', 'violet', 'orange', 'magenta', 'yellow', 'red'],
  primary: 'var(--blue)',
  // the internal development record: the header sits on the bg1 panel step with the sidebar;
  // the page ground is bg0. Ladder from freecore-brand tokens.json (round 3).
  topbar: '#10151A',
  // the internal development record: the mono world's one accent (brand core.accent), spent
  // on focus, the active-nav bar, links and one primary per view -- a literal,
  // not one of the eight chart colours.
  accent: '#8FB4C7',
  bg0: '#0B0F13',
  bg1: '#10151A',
  bg2: '#171E24',
  line: '#2A353D',
  fg1: '#DCE3E6',
  fg2: '#97A6AE',
  'alt-bg1': '#212A31',
  'alt-bg2': '#2C3740',
  'alt-fg1': 'rgba(151,166,174,0.5)',
  'alt-fg2': '#C7D1D6',
  yellow: '#D6AD4C',
  orange: '#DC8752',
  red: '#E3625A',
  magenta: '#C676A6',
  violet: '#9A83D3',
  blue: '#4E93C4',
  cyan: '#3DB2BC',
  green: '#56A96A',
};

/**
 * the internal development record: the surface ladder every theme exposes as CSS vars.
 * A theme that carries bg0/line (the FreeCORE default, from the brand tokens)
 * is used as-is. The others derive: the canvas is bg1 pulled toward black --
 * 29% for a dark theme, 4% for a light one -- and the hairline is 12% of fg1
 * mixed into bg1. color-mix() keeps the derivation in the browser, so no
 * colour math here has to agree with the CSS.
 */
export function ladderVars(theme: Pick<Theme, 'bg0' | 'bg1' | 'line' | 'fg1'>, isDark: boolean): { bg0: string; line: string } {
  const bg0 = theme.bg0 || `color-mix(in srgb, ${theme.bg1} ${isDark ? 71 : 96}%, black)`;
  const line = theme.line || `color-mix(in srgb, ${theme.fg1} 12%, ${theme.bg1})`;
  return { bg0, line };
}

export interface Theme {
  name: string;
  description: string;
  label: string;
  labelSwatch?: string;
  accentColors: string[];
  topbar?: string; // CSS var from palette. Defaults to primary
  'topbar-txt'?: string; // Optional topbar text override (ix-dark carries it; setCssVars recomputes anyway)
  favorite?: boolean; // Deprecate: Hasn't been used since the theme switcher was in the topbar
  hasDarkLogo?: boolean; // Deprecate: logo colors are set with CSS now
  logoPath?: string; // Deprecate: Themes haven't used this in a couple of releases now
  logoTextPath?: string; // Deprecate: Themes haven't used this in a couple of releases now
  mascot?: string; // Identity image (System widget) — follows the active theme (FreeCORE vs FreeBSD)
  logo?: string; // Horizontal lockup (signin) — follows the active theme
  slogan?: string; // Signin slogan — follows the active theme
  primary: string;
  accent: string;
  // the internal development record: bg0 (page canvas, one step under bg1) and line (every
  // hairline) are the ONLY keys added since the brand tokens were locked --
  // setCssVars() emits each key as a global CSS var, so it derives both for the
  // themes that do not carry them. Do not add others.
  bg0?: string;
  bg1: string;
  bg2: string;
  line?: string;
  fg1: string;
  fg2: string;
  'alt-bg1': string;
  'alt-bg2': string;
  'alt-fg1': string;
  'alt-fg2': string;
  yellow: string;
  orange: string;
  red: string;
  magenta: string;
  violet: string;
  blue: string;
  cyan: string;
  green: string;
}

@Injectable()
export class ThemeService {
  readonly freeThemeDefaultIndex = 0;
  activeTheme = 'default';
  defaultTheme = 'freecore';
  activeThemeSwatch: string[];
  private utils: ThemeUtils;

  // Theme lists
  allThemes: Theme[];
  themesMenu: Theme[];
  private _customThemes: Theme[];

  freenasThemes: Theme[] = [
    DefaultTheme,
    {
      // The inherited TrueNAS CORE 13.3 look, preserved and honestly named.
      name: 'ix-dark',
      label: 'TrueNAS 13.3',
      labelSwatch: 'blue',
      description: 'Inherited TrueNAS CORE 13.3 dark palette',
      accentColors: ['blue', 'magenta', 'orange', 'cyan', 'yellow', 'violet', 'red', 'green'],
      primary: 'var(--blue)',
      topbar: '#111111',
      'topbar-txt': 'var(--fg2)',
      accent: 'var(--alt-bg2)',
      bg1: '#1E1E1E',
      bg2: '#282828',
      fg1: '#fff',
      fg2: 'rgba(255,255,255,0.85)',
      'alt-bg1': '#383838',
      'alt-bg2': '#545454',
      'alt-fg1': 'rgba(194,194,194,0.5)',
      'alt-fg2': '#e1e1e1',
      yellow: '#DED142',
      orange: '#E68D37',
      red: '#CE2929',
      magenta: '#C006C7',
      violet: '#7617D8',
      blue: '#0095D5',
      cyan: '#00d0d6',
      green: '#71BF44',
    },
    {
      name: 'ix-blue',
      label: 'Classic Blue',
      labelSwatch: 'blue',
      description: 'Inherited CORE 13.3 light palette',
      accentColors: ['blue', 'orange', 'cyan', 'violet', 'yellow', 'magenta', 'red', 'green'],
      primary: 'var(--blue)',
      topbar: 'var(--blue)',
      accent: 'var(--yellow)',
      bg1: '#dddddd',
      bg2: '#ffffff',
      fg1: '#222222',
      fg2: '#666666',
      'alt-bg1': '#ababab',
      'alt-bg2': '#cdcdcd',
      'alt-fg1': '#181a26',
      'alt-fg2': '#282a36',
      yellow: '#DED142',
      orange: '#E68D37',
      red: '#CE2929',
      magenta: '#C006C7',
      violet: '#7617D8',
      blue: '#0095D5',
      cyan: '#00d0d6',
      green: '#71BF44',
    },
    {
      name: 'dracula',
      label: 'Dracula',
      labelSwatch: 'blue',
      description: 'Dracula color theme',
      accentColors: ['violet', 'orange', 'cyan', 'blue', 'yellow', 'magenta', 'red', 'green'],
      primary: 'var(--blue)',
      topbar: 'var(--blue)',
      accent: 'var(--violet)',
      bg1: '#181a26',
      bg2: '#282a36',
      fg1: '#a8a8a2',
      fg2: '#cacac5',
      'alt-bg1': 'rgba(122,122,122,0.25)',
      'alt-bg2': 'rgba(122,122,122,0.5)',
      'alt-fg1': '#f8f8f2',
      'alt-fg2': '#fafaf5',
      yellow: '#f1fa8c',
      orange: '#ffb86c',
      red: '#ff5555',
      magenta: '#ff79c6',
      violet: '#bd93f9',
      blue: '#6272a4',
      cyan: '#8be9fd',
      green: '#50fa7b',
    },
    {
      name: 'nord',
      label: 'Nord',
      labelSwatch: 'blue',
      description: 'Unofficial nord color theme based on https://www.nordtheme.com/',
      accentColors: ['violet', 'orange', 'cyan', 'blue', 'yellow', 'magenta', 'red', 'green'],
      primary: 'var(--alt-bg2)',
      topbar: 'var(--alt-bg2)',
      accent: 'var(--blue)',
      bg1: '#2e3440',
      bg2: '#3b4252',
      fg1: '#eceff4',
      fg2: '#e5e9f0',
      'alt-bg1': '#434c5e',
      'alt-bg2': '#4c566a',
      'alt-fg1': '#d8dee9',
      'alt-fg2': '#d8dee9',
      yellow: '#ebcb8b',
      orange: '#d08770',
      red: '#bf616a',
      magenta: '#b48ead',
      violet: '#775daa',
      blue: '#5e81aC',
      cyan: '#88c0d0',
      green: '#a3be8c',
    },
    {
      name: 'paper',
      label: 'Paper',
      labelSwatch: 'blue',
      description: 'FreeNAS 11.2 default theme',
      accentColors: ['violet', 'orange', 'cyan', 'blue', 'yellow', 'magenta', 'red', 'green'],
      primary: 'var(--blue)',
      topbar: 'var(--blue)',
      accent: 'var(--yellow)',
      bg1: '#D5D5D5',
      bg2: '#F5F5F5',
      fg1: '#222222',
      fg2: '#333333',
      'alt-bg1': 'rgba(122,152,182,0.05)',
      'alt-bg2': '#fafaf5',
      'alt-fg1': '#181a26',
      'alt-fg2': '#282a36',
      yellow: '#f0cb00',
      orange: '#ee9302',
      red: '#ff0013',
      magenta: '#d238ff',
      violet: '#c17ecc',
      blue: '#0D5687',
      cyan: '#00d0d6',
      green: '#1F9642',
    },
    {
      name: 'solarized-dark',
      label: 'Solarized Dark',
      labelSwatch: 'bg2',
      description: 'Solarized dark color scheme',
      accentColors: ['blue', 'magenta', 'cyan', 'violet', 'green', 'orange', 'yellow', 'red'],
      primary: 'var(--fg1)',
      topbar: 'var(--fg1)',
      accent: 'var(--cyan)',
      bg1: '#002b36',
      bg2: '#073642',
      fg1: '#586e75',
      fg2: '#7f99a2',
      'alt-bg1': 'rgba(122,122,122,0.25)',
      'alt-bg2': '#fdf6e3',
      'alt-fg1': '#839496',
      'alt-fg2': '#282a36',
      yellow: '#b58900',
      orange: '#cb4b16',
      red: '#dc322f',
      magenta: '#d33682',
      violet: '#6c71c4',
      blue: '#268bd2',
      cyan: '#2aa198',
      green: '#859900',
    },
    {
      name: 'midnight',
      label: 'Midnight',
      labelSwatch: 'blue',
      description: 'Dark theme with blues and greys',
      accentColors: ['violet', 'orange', 'cyan', 'blue', 'yellow', 'magenta', 'red', 'green'],
      primary: 'var(--blue)',
      topbar: 'var(--blue)',
      accent: 'var(--violet)',
      bg1: '#212a35',
      bg2: '#303d48',
      fg1: '#aaaaaa',
      fg2: '#cccccc',
      'alt-bg1': 'rgba(122,122,122,0.25)',
      'alt-bg2': '#6F6E6C',
      'alt-fg1': '#c1c1c1',
      'alt-fg2': '#e1e1e1',
      yellow: '#f0cb00',
      orange: '#ee9302',
      red: '#ff0013',
      magenta: '#d238ff',
      violet: '#c17ecc',
      blue: '#1274b5',
      cyan: '#00d0d6',
      green: '#1F9642',
    },
    {
      name: 'high-contrast',
      label: 'High Contrast',
      labelSwatch: 'fg1',
      description: 'High contrast theme based on Legacy UI color scheme',
      accentColors: ['green', 'violet', 'orange', 'cyan', 'magenta', 'red', 'yellow', 'blue'],
      primary: 'var(--blue)',
      topbar: 'var(--black)',
      accent: 'var(--magenta)',
      bg1: '#dddddd',
      bg2: '#ffffff',
      fg1: '#222222',
      fg2: '#333333',
      'alt-bg1': 'rgba(122,152,182,0.05)',
      'alt-bg2': '#fafaf5',
      'alt-fg1': '#181a26',
      'alt-fg2': '#282a36',
      yellow: '#f0cb00',
      orange: '#ee9302',
      red: '#ff0013',
      magenta: '#d238ff',
      violet: '#9844b1',
      blue: '#4784ac',
      cyan: '#00d0d6',
      green: '#59d600',
    },
    {
      // The previous FreeCORE look, preserved whole as the FreeBSD heritage
      // identity: same palette, the Beastie daemon, and "Think correctly."
      // (name kept as 'truenas-15' so saved theme preferences don't orphan).
      name: 'truenas-15',
      label: 'FreeBSD',
      labelSwatch: 'blue',
      description: 'FreeBSD heritage — the daemon, Think correctly.',
      mascot: 'FreeBSD_mascot.png',
      logo: 'FreeBSD_logo_horizontal.png',
      slogan: 'Think correctly.',
      accentColors: ['blue', 'cyan', 'green', 'violet', 'orange', 'magenta', 'yellow', 'red'],
      primary: 'var(--blue)',
      topbar: '#0b0f14',
      accent: 'var(--cyan)',
      bg1: '#10151b',
      bg2: '#171e26',
      fg1: '#e8edf4',
      fg2: '#c0cad6',
      'alt-bg1': '#1f2833',
      'alt-bg2': '#2c3846',
      'alt-fg1': 'rgba(170,186,204,0.55)',
      'alt-fg2': '#dbe3ec',
      yellow: '#e3b341',
      orange: '#f0883e',
      red: '#f85149',
      magenta: '#db61a2',
      violet: '#a371f7',
      blue: '#409cf0',
      cyan: '#39c5cf',
      green: '#3fb950',
    },
  ];

  savedUserTheme = '';
  private loggedIn: boolean;

  userThemeLoaded = false;
  constructor(private rest: RestService, private ws: WebSocketService, private core: CoreService, private api: ApiService,
    private route: Router) {
    this.utils = new ThemeUtils();

    // Set default list
    this.allThemes = this.freenasThemes;
    this.themesMenu = this.freenasThemes;

    this.core.register({ observerClass: this, eventName: 'ThemeDataRequest' }).subscribe((evt: CoreEvent) => {
      this.core.emit({ name: 'ThemeData', data: this.findTheme(this.activeTheme), sender: this });
    });

    this.core.register({ observerClass: this, eventName: 'UserPreferencesChanged' }).subscribe((evt: CoreEvent) => {
      this.onPreferences(evt);
    });

    this.core.register({ observerClass: this, eventName: 'UserPreferencesReady' }).subscribe((evt: CoreEvent) => {
      this.onPreferences(evt);
    });
  }

  onPreferences(evt: CoreEvent) {
    if (evt.data.customThemes) {
      this.customThemes = evt.data.customThemes;
    }

    this.activeTheme = evt.data.userTheme == 'default' ? this.defaultTheme : evt.data.userTheme;
    this.setCssVars(this.findTheme(this.activeTheme, true));
    this.userThemeLoaded = true;
    this.core.emit({ name: 'ThemeChanged', data: this.findTheme(this.activeTheme), sender: this });

    if (evt.data.allowPwToggle) {
      (<any>document).documentElement.style.setProperty('--toggle_pw_display_prop', 'inline');
    } else if (!evt.data.allowPwToggle) {
      (<any>document).documentElement.style.setProperty('--toggle_pw_display_prop', 'none');
    }

    if (evt.data.enableWarning) {
      (<any>document).documentElement.style.setProperty('--enableWarning', 'inline');
    } else if (!evt.data.allowPwToggle) {
      (<any>document).documentElement.style.setProperty('--enableWarning', 'none');
    }
  }

  resetToDefaultTheme() {
    this.activeTheme = this.defaultTheme;
    this.changeTheme(this.defaultTheme);
  }

  get isDefaultTheme() {
    return this.activeTheme == this.defaultTheme;
  }

  currentTheme(): Theme {
    return this.findTheme(this.activeTheme);
  }

  findTheme(name: string, reset?: boolean): Theme {
    if (name == 'default') {
      name = this.defaultTheme;
    }

    for (const i in this.allThemes) {
      const t = this.allThemes[i];
      if (t.name == name) { return t; }
    }

    // Optionally reset if not found
    this.resetToDefaultTheme();

    if (!reset) {
      console.warn('Theme ' + name + ' not found and reset not initiated.');
    }

    return this.freenasThemes[this.freeThemeDefaultIndex];
  }

  changeTheme(theme: string) {
    this.core.emit({ name: 'ChangeThemePreference', data: theme, sender: this });
  }

  saveCurrentTheme() {
    const theme = this.currentTheme();
    this.core.emit({ name: 'ChangeThemePreference', data: theme.name });
  }

  setCssVars(theme: Theme) {
    const keys = Object.keys(theme);
    const isDark = this.darkTest(theme.bg2);

    // the internal development record: the spartan layer keys its `dark:` modifiers off `html.dark`
    // (hlm-tailwind-preset's @custom-variant). The ladder already carries each theme's
    // light or dark values; this only tells helm which side of the switch it is on.
    (<any>document).documentElement.classList.toggle('dark', isDark);

    // Filter out deprecated properties and meta properties
    const palette = keys.filter((v) => v != 'label' && v != 'logoPath' && v != 'logoTextPath' && v != 'mascot' && v != 'logo' && v != 'slogan' && v != 'favorite' && v != 'labelSwatch' && v != 'description' && v != 'name');

    palette.forEach((color) => {
      const swatch = theme[color];

      // Generate aux. text styles
      if (this.freenasThemes[0].accentColors.indexOf(color) !== -1) {
        const txtColor = this.utils.textContrast(theme[color], theme['bg2']);
        (<any>document).documentElement.style.setProperty('--' + color + '-txt', txtColor);
      }

      (<any>document).documentElement.style.setProperty('--' + color, theme[color]);
    });

    // the internal development record: every theme gets the surface ladder. Themes without
    // bg0/line derive them here, so switching themes never leaves the previous
    // theme's values behind.
    const ladder = ladderVars(theme, isDark);
    (<any>document).documentElement.style.setProperty('--bg0', ladder.bg0);
    (<any>document).documentElement.style.setProperty('--line', ladder.line);

    // Add Black White and Grey Variables
    (<any>document).documentElement.style.setProperty('--black', '#000000');
    (<any>document).documentElement.style.setProperty('--white', '#ffffff');
    (<any>document).documentElement.style.setProperty('--grey', '#989898');

    // Utility links sit on bg2 surfaces. Keep them recognizably blue while
    // maintaining AA contrast across the built-in dark and light palettes.
    (<any>document).documentElement.style.setProperty('--project-link', isDark ? '#67b7ed' : '#005f96');

    // Set Material palette colors
    (<any>document).documentElement.style.setProperty('--primary', theme['primary']);
    (<any>document).documentElement.style.setProperty('--accent', theme['accent']);

    // Set Material aux. text styles
    const primaryColor = this.utils.colorFromMeta(theme['primary']); // eg. blue
    const accentColor = this.utils.colorFromMeta(theme['accent']); // eg. yellow
    // the internal development record: primary/accent may be a literal colour instead of a
    // var(--name) reference to one of the eight chart colours.
    const primarySwatch = theme[primaryColor] ?? theme['primary'];
    const accentSwatch = theme[accentColor] ?? theme['accent'];
    const primaryTextColor = this.utils.textContrast(primarySwatch, theme['bg2']);
    const accentTextColor = this.utils.textContrast(accentSwatch, theme['bg2']);
    const topbarTextColor = this.utils.textContrast(accentSwatch, theme['bg2']);
    (<any>document).documentElement.style.setProperty('--topbar-txt', primaryTextColor);
    (<any>document).documentElement.style.setProperty('--primary-txt', primaryTextColor);
    (<any>document).documentElement.style.setProperty('--accent-txt', accentTextColor);
    (<any>document).documentElement.style.setProperty('--highlight', accentTextColor);

    // Logo light/dark
    /* if(theme["hasDarkLogo"]){
      theme.logoPath = 'assets/images/logo.svg';
      theme.logoTextPath = 'assets/images/logo-text.svg';
    } else {
      theme.logoPath = 'assets/images/light-logo.svg';
      theme.logoTextPath = 'assets/images/light-logo-text.svg';
    } */

    // Set line colors
    const lineColor = isDark ? 'var(--dark-theme-lines)' : 'var(--light-theme-lines)';
    (<any>document).documentElement.style.setProperty('--lines', lineColor);

    // Set multiple background color contrast options
    const contrastSrc = theme['bg2'];
    const contrastDarker = this.utils.darken(contrastSrc, 5);
    const contrastDarkest = this.utils.darken(contrastSrc, 10);
    const contrastLighter = this.utils.lighten(contrastSrc, 5);
    const contrastLightest = this.utils.lighten(contrastSrc, 10);

    (<any>document).documentElement.style.setProperty('--contrast-darker', contrastDarker);
    (<any>document).documentElement.style.setProperty('--contrast-darkest', contrastDarkest);
    (<any>document).documentElement.style.setProperty('--contrast-lighter', contrastLighter);
    (<any>document).documentElement.style.setProperty('--contrast-lightest', contrastLightest);
  }

  get customThemes() {
    return this._customThemes;
  }

  set customThemes(customThemes: Theme[]) {
    this._customThemes = customThemes;
    this.allThemes = this.freenasThemes.concat(this.customThemes);
    this.core.emit({ name: 'ThemeListsChanged' });
  }

  darkTest(css: string) {
    const rgb = this.utils.forceRGB(css);
    const hsl = this.utils.rgbToHSL(rgb, false, false);

    return hsl[2] < 50;
  }
}
