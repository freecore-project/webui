import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, Subscription, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { EntityUtils } from '../pages/common/entity/utils';
import { RestService } from './rest.service';
import { WebSocketService } from './ws.service';
import { T } from '../translate-marker';

@Injectable()
export class VmService {
  protected volume_resource_name = 'storage/volume';

  constructor(protected rest: RestService, protected ws: WebSocketService) {}

  getStorageVolumes() { return this.rest.get(this.volume_resource_name, {}); }

  getVM(vm: string) {
    return this.ws.call('vm.query', [[['name', '=', vm]], { get: true }]);
  }

  getBootloaderOptions() {
    return [
      ['UEFI', 'UEFI'],
    ];
  }

  getNICTypes() {
    return [
      ['E1000', 'Intel e82585 (e1000)'],
      ['VIRTIO', 'VirtIO'],
    ];
  }

  // the internal development record: the QEMU lane. amd64 is the host's own architecture and runs
  // natively on bhyve; anything else is emulated by QEMU/TCG. The labels are static
  // so a stored value always renders; what a host can *run* comes from vm.arch_choices.
  static readonly nativeArchitecture = 'amd64';

  getArchitectureLabels() {
    return [
      ['amd64', T('amd64 (native, bhyve)')],
      ['aarch64', T('aarch64 (emulated, QEMU)')],
      ['riscv64', T('riscv64 (emulated, QEMU)')],
    ];
  }

  isEmulated(arch: string): boolean {
    const normalized = typeof arch === 'string' ? arch.trim().toLowerCase() : '';
    return normalized !== '' && normalized !== VmService.nativeArchitecture;
  }

  /**
   * The architecture options for the VM forms. amd64 (bhyve) is always present and
   * always first: it is the default and stays selectable exactly as it always was,
   * whether or not this host can run it (create and start report that, as they
   * always have). The emulated architectures are only *added* when the host reports
   * them available, so a host without the lane sees the list it always saw and
   * nothing is ever auto-selected on the operator's behalf. the internal development record
   */
  getArchitectureChoices(): Observable<{ label: string; value: string; emulated: boolean; reason: string }[]> {
    const labels = new Map(this.getArchitectureLabels().map(([value, label]) => [value, label]));
    const native = {
      value: VmService.nativeArchitecture, label: labels.get(VmService.nativeArchitecture), emulated: false, reason: null,
    };
    return this.ws.call('vm.arch_choices').pipe(
      map((choices) => [
        native,
        ...Object.keys(choices || {})
          .filter((arch) => arch !== VmService.nativeArchitecture && choices[arch].available)
          .map((arch) => ({
            value: arch,
            label: labels.get(arch) || choices[arch].label,
            emulated: !!choices[arch].emulated,
            reason: choices[arch].reason,
          })),
      ]),
      catchError(() => of([native])),
    );
  }
}
