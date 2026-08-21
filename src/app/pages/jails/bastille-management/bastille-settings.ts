import { Router } from '@angular/router';
import { escape } from 'lodash';
import { EMPTY, forkJoin, Observable, of, throwError } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { DialogService, WebSocketService } from '../../../services';
import { T } from '../../../translate-marker';
import { DialogFormConfiguration } from '../../common/entity/entity-dialog/dialog-form-configuration.interface';
import { rangeValidator } from '../../common/entity/entity-form/validators/range-validation';
import { showNoPoolDialog } from '../../common/no-pool-dialog';

export interface BastilleSettings {
  pool: string;
  startup_delay: number;
  parallel_limit: number;
  adopt?: boolean;
}

export interface BastilleAdoptionPlan {
  pool: string;
  dataset: string;
  state: 'ABSENT' | 'MANAGED' | 'ADOPTABLE' | 'BLOCKED';
  jails: { name: string; operable: boolean; reason: string | null }[];
  releases: string[];
  create: string[];
  convert: string[];
  mark: string[];
  blockers: string[];
}

function adoptionMessage(plan: BastilleAdoptionPlan): string {
  // Below the tree, a dataset is named by its last part: config, backups.
  const names = (datasets: string[]): string => escape(datasets.map((dataset) => dataset.split('/').pop()).join(', '));
  const found = [
    plan.jails.length ? `${T('Jails')}: ${escape(plan.jails.map((jail) => jail.name).join(', '))}` : T('No jails'),
    ...(plan.releases.length ? [`${T('Releases')}: ${escape(plan.releases.join(', '))}`] : []),
  ].join('<br>');
  const unusable = plan.jails.filter((jail) => !jail.operable).map((jail) => (
    `<br>${escape(jail.name)}: ${escape(jail.reason)}`
  )).join('');
  const steps = [
    ...(plan.create.length ? [`${T('creates')} ${names(plan.create)}`] : []),
    ...(plan.convert.length === 1 ? [`${T('turns the folder')} ${names(plan.convert)} ${T('into a dataset with its contents')}`] : []),
    ...(plan.convert.length > 1 ? [`${T('turns the folders')} ${names(plan.convert)} ${T('into datasets with their contents')}`] : []),
    ...(plan.mark.length ? [T('marks the datasets as Bastille storage')] : []),
  ];
  const doing = steps.length > 1 ? `${steps.slice(0, -1).join(', ')} ${T('and')} ${steps[steps.length - 1]}` : steps.join('');
  return `<p><code>${escape(plan.dataset)}</code> ${T('already holds Bastille data that FreeCORE did not create.')}</p>`
    + `<p>${found}</p>`
    + (unusable ? `<p>${T('Listed, but FreeCORE cannot start them as they are:')}${unusable}</p>` : '')
    + `<p>${T('Adopting it takes a snapshot first, then')} ${doing}. `
    + `${T('Jails, releases and their settings are not changed.')}</p>`;
}

// the internal development record: a pool can arrive with a Bastille tree another system made (XigmaNAS's
// Bastille extension). the internal development record previews what adopting it changes; nothing is
// adopted until the administrator confirms it here.
function confirmAdoption(
  ws: WebSocketService, dialog: DialogService, settings: BastilleSettings,
): Observable<BastilleSettings> {
  return ws.call('bastille.adoption_preview', [settings.pool]).pipe(
    switchMap((plan: BastilleAdoptionPlan) => {
      if (plan.state === 'BLOCKED') {
        const message = `${T('Bastille cannot use the data already in')} ${plan.dataset}: ${plan.blockers.join(' ')}`;
        return throwError(() => ({ message, reason: message }));
      }
      if (plan.state !== 'ADOPTABLE') { return of(settings); }
      return dialog.confirm({
        title: T('Adopt Existing Bastille Data'),
        message: adoptionMessage(plan),
        buttonMsg: T('Adopt'),
        hideCheckBox: true,
      }).pipe(
        take(1),
        switchMap((adopt) => (adopt ? of({ ...settings, adopt: true }) : EMPTY)),
      );
    }),
  );
}

// Shared by Services and the Jails cog. Emit only after the root form finishes
// closing, so a subsequent lazy-module job dialog can restore accessibility.
export function openBastilleSettings(
  ws: WebSocketService, dialog: DialogService, router: Router,
): Observable<BastilleSettings> {
  return forkJoin({
    config: ws.call('bastille.config'),
    pools: ws.call('pool.query', [[], {}]),
  }).pipe(switchMap(({ config, pools }: any) => {
    if (!config.installed) {
      return throwError(() => ({ message: T('Bastille is not installed.') }));
    }
    const availablePools = pools.filter((pool) => (
      pool.status === 'ONLINE' && pool.healthy && pool.is_decrypted
    ));
    if (!config.configured && !availablePools.length) {
      showNoPoolDialog(dialog, router);
      return EMPTY;
    }
    let submitted: BastilleSettings;
    const poolOptions = pools.map((pool) => ({
      label: pool.name + (
        !pool.is_decrypted ? T(' (Locked)')
          : pool.status !== 'ONLINE' ? ` (${pool.status})`
            : !pool.healthy ? T(' (Unhealthy)') : ''
      ),
      value: pool.name,
      disable: pool.status !== 'ONLINE' || !pool.healthy || !pool.is_decrypted,
    }));
    const poolField: any = {
      type: 'select',
      name: 'pool',
      showLabel: true, label: T('Data Pool'), placeholder: T('Data Pool'),
      value: config.pool || '',
      required: true,
      options: poolOptions,
    };
    // the internal development record: the GUI configures the service and observes jails. Jails are
    // created and managed with the bastille command, which finds this pool on its own
    // since the internal development record -- no export, no per-shell setup to describe.
    const consoleFields: any[] = config.configured && config.paths && config.paths.mountpoint ? [{
      type: 'paragraph',
      name: 'console_access',
      paraText: `${T('Bastille data lives in')} <code>${escape(config.paths.mountpoint)}</code>.`, // the internal development record: the page shows what the CLI manages
    }] : [];
    const conf: DialogFormConfiguration = {
      title: T('Bastille Settings'),
      fieldConfig: [
        poolField,
        {
          type: 'input',
          inputType: 'number',
          name: 'startup_delay',
          showLabel: true, label: T('Startup Delay (seconds)'), placeholder: T('Startup Delay (seconds)'),
          value: config.startup_delay,
          min: 0,
          max: 3600,
          required: true,
          validation: [rangeValidator(0, 3600)],
        },
        {
          type: 'input',
          inputType: 'number',
          name: 'parallel_limit',
          showLabel: true, label: T('Parallel Start Limit'), placeholder: T('Parallel Start Limit'),
          value: config.parallel_limit,
          min: 1,
          max: 64,
          required: true,
          validation: [rangeValidator(1, 64)],
        },
        ...consoleFields,
      ],
      saveButtonText: config.configured ? T('Save') : T('Configure'),
      customSubmit: (entityDialog) => {
        const { pool, startup_delay, parallel_limit } = entityDialog.formValue;
        if (!availablePools.some((entry) => entry.name === pool)
          || !Number.isInteger(startup_delay) || startup_delay < 0 || startup_delay > 3600
          || !Number.isInteger(parallel_limit) || parallel_limit < 1 || parallel_limit > 64) { return; }
        submitted = { pool, startup_delay, parallel_limit };
        entityDialog.dialogRef.close(true);
      },
    };
    return dialog.dialogForm(conf).pipe(
      take(1),
      switchMap((confirmed) => confirmed && submitted ? of(submitted) : EMPTY),
      switchMap((settings) => (
        config.configured && settings.pool === config.pool ? of(settings) : confirmAdoption(ws, dialog, settings)
      )),
    );
  }));
}
