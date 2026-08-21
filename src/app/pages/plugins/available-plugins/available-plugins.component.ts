import {
  ChangeDetectionStrategy, Component, Input, OnInit,
} from '@angular/core';
import { Router } from '@angular/router';

import { PreferencesService } from 'app/core/services/preferences.service';
import { WebSocketService, JailService, DialogService } from '../../../services';
import { EntityUtils } from '../../common/entity/utils';
import { T } from '../../../translate-marker';
import { CatalogStripEntry } from '../catalog-strip/catalog-strip.component';

/**
 * the internal development record: the Plugins page header (the entity table's cardHeaderComponent) as 15.0 shipped it
 * -- browse a collection, refresh its index, pick a plugin, install -- on the 15.1 kit: the collection
 * picker row, the catalog strip, and the selected plugin's panel above the strip as 13.3 drew it.
 */
@Component({
  standalone: false,
  selector: 'app-plugins-list',
  templateUrl: './available-plugins.component.html',
  styleUrls: ['./available-plugins.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [JailService],
})
export class AvailablePluginsComponent implements OnInit {
  @Input() config: any;
  @Input() parent: any;

  protected queryCall = 'plugin.available';
  protected queryCallOption = {};

  plugins: any[];
  entries: CatalogStripEntry[] = [];
  selectedPlugin: any;
  availableRepo = [];
  selectedRepo: any;
  completeList: any;
  installedPlugins: any = {};
  loading = true;
  expand = this.prefService.preferences.expandAvailablePlugins;

  readonly repoLabel = (value: string): string => {
    const repo = this.availableRepo.find((item) => item.git_repository === value);
    return repo ? repo.name : value;
  };

  constructor(private ws: WebSocketService, protected jailService: JailService,
    private router: Router, protected dialogService: DialogService,
    protected prefService: PreferencesService) {
    this.ws.call('plugin.official_repositories').subscribe(
      (res) => {
        for (const repo in res) {
          this.availableRepo.push(res[repo]);
        }
        if (this.availableRepo.length === 0) {
          this.loading = false;
          this.dialogService.report(T('No Repositories'), T('No repositories is found.'), '500px', 'info', true);
        } else {
          const freecoreRepo = this.availableRepo.filter((repo) => repo.name === 'FreeCORE');
          const officialRepo = this.availableRepo.filter((repo) => repo.name === 'iXsystems');
          const defaultRepo = freecoreRepo[0] || officialRepo[0] || this.availableRepo[0];
          this.selectedRepo = defaultRepo['git_repository'];
          this.getPlugin();
          this.getCompletePluginList();
        }
      },
      (err) => {
        this.loading = false;
        new EntityUtils().handleWSError(this.parent, err, this.parent.dialogService);
      },
    );
  }

  getInstances() {
    this.ws.call('plugin.query').subscribe(
      (res) => {
        for (const item of res) {
          if (this.installedPlugins[item.plugin] == undefined) {
            this.installedPlugins[item.plugin] = 0;
          }
          this.installedPlugins[item.plugin]++;
        }
      },
    );
  }

  ngOnInit() {
    this.getInstances();
  }

  getPlugin(cache = true) {
    if (!this.selectedRepo) {
      return;
    }
    this.parent.cardHeaderReady = false;
    this.loading = true;
    this.queryCallOption['plugin_repository'] = this.selectedRepo;
    this.queryCallOption['cache'] = cache;

    this.ws.job(this.queryCall, [this.queryCallOption]).subscribe(
      (res) => {
        if (res.result) {
          this.plugins = res.result;
          for (let i = 0; i < this.plugins.length; i++) {
            let revision = this.plugins[i]['revision'];
            if (revision !== 'N/A' && revision !== '0') {
              revision = '_' + revision;
            } else {
              revision = '';
            }
            this.plugins[i]['version'] = this.plugins[i]['version'] + revision;
          }
          this.entries = this.plugins.map((plugin) => ({
            id: plugin.plugin, title: plugin.name, description: plugin.description, icon: plugin.icon,
          }));
          this.selectedPlugin = res.result[0];
          this.loading = false;
          this.parent.cardHeaderReady = true;
          this.parent.conf.availablePlugins = this.plugins;
        }
        if (res.error) {
          this.loading = false;
          this.parent.dialogService.errorReport('Get Plugins Failed', res.error, res.exception);
        }
      },
      (err) => {
        this.loading = false;
        new EntityUtils().handleWSError(this.parent, err, this.parent.dialogService);
      },
      () => {
        if (this.parent.loaderOpen) {
          this.parent.loader.close();
          this.parent.loaderOpen = false;
        }
      },
    );
  }

  getCompletePluginList(index = 0, plugins = []) {
    if (index >= this.availableRepo.length) {
      this.completeList = plugins;
      this.parent.conf.allPlugins = this.completeList;
      return;
    }

    this.ws.job(this.queryCall, [{ plugin_repository: this.availableRepo[index]['git_repository'] }]).subscribe(
      (res) => {
        if (res.result) {
          plugins = plugins.concat(res.result);
        }
      },
      (err) => {
        new EntityUtils().handleWSError(this.parent, err, this.parent.dialogService);
        this.getCompletePluginList(index + 1, plugins);
      },
      () => {
        this.getCompletePluginList(index + 1, plugins);
      },
    );
  }

  switchRepo(repo: string) {
    if (!repo || repo === this.selectedRepo) {
      return;
    }
    this.selectedRepo = repo;
    this.parent.loader.open();
    this.parent.loaderOpen = true;
    this.queryCallOption['plugin_repository'] = this.selectedRepo;
    this.getPlugin();
  }

  select(entry: CatalogStripEntry) {
    this.selectedPlugin = (this.plugins || []).find((plugin) => plugin.plugin === entry.id) || this.selectedPlugin;
  }

  install(plugin) {
    if (!plugin.official) {
      this.parent.dialogService.confirm(
        T('Warning'),
        T('This plugin is not part of the official FreeCORE plugin collection. The FreeCORE project does\
 not provide support in configuration, diagnosis, or use of this unofficial plugin. Thorough research\
 is strongly recommended before installing or using an unofficial plugin.'),
        true, T('Continue'),
      ).subscribe(
        (res) => {
          if (res) {
            this.router.navigate(new Array('').concat(['plugins', 'add', plugin.plugin, { plugin_repository: this.selectedRepo }]));
          }
        },
      );
    } else {
      this.router.navigate(new Array('').concat(['plugins', 'add', plugin.plugin, { plugin_repository: this.selectedRepo }]));
    }
  }

  updatePreference() {
    this.expand = !this.expand;
    this.prefService.preferences.expandAvailablePlugins = this.expand;
    this.prefService.savePreferences();
  }
}
