import { of } from 'rxjs';
import { VmService } from '../../../services/vm.service';
import helptext from '../../../helptext/vm/vm-wizard/vm-wizard';
import { VMWizardComponent } from './vm-wizard.component';

// the internal development record: the Architecture selector and what it does to the rest of the wizard.
describe('VMWizardComponent architecture policy', () => {
  let component: VMWizardComponent;
  let ws: any;
  let loader: any;
  let router: any;

  const control = (value: any) => ({ value, setValue(next: any) { this.value = next; } });
  let controls: any;
  let entityWizard: any;

  beforeEach(() => {
    ws = { call: jasmine.createSpy('call').and.returnValue(of({})) };
    loader = { open: jasmine.createSpy('open'), close: jasmine.createSpy('close') };
    router = { navigate: jasmine.createSpy('navigate') };
    const storageService = {
      convertHumanStringToNum: (value: string) => (value === '1 GiB' ? 1073741824 : 10737418240),
    };
    component = new VMWizardComponent(
      {} as any, ws, new VmService({} as any, {} as any), {} as any, loader, {} as any, {} as any, router,
      {} as any, storageService as any, { savePreferences: () => {}, preferences: {} } as any, {} as any,
    );
    controls = {
      0: {
        os: control('Windows'), enable_vnc: control(true), wait: control(true), arch: control('aarch64'),
      },
      2: { hdd_type: control('AHCI') },
      3: { NIC_type: control('E1000') },
    };
    entityWizard = { formArray: { get: ([step]: number[]) => ({ get: (name: string) => controls[step][name] }) } };
    (component as any).nicType = { options: [] };
  });

  it('trims an emulated guest to what the QEMU virt machine has', () => {
    component.applyArchitecturePolicy(entityWizard, 'aarch64');

    const os = (component as any).wizardConfig[0].fieldConfig.find((field) => field.name === 'os');
    expect(os.options.map((option) => option.value)).toEqual(['Linux', 'FreeBSD']);
    expect(controls[0].os.value).toBe('Linux');

    const hddType = (component as any).wizardConfig[2].fieldConfig.find((field) => field.name === 'hdd_type');
    expect(hddType.options).toEqual([{ label: 'VirtIO', value: 'VIRTIO' }]);
    expect(controls[2].hdd_type.value).toBe('VIRTIO');

    expect((component as any).nicType.options).toEqual([{ label: 'VirtIO', value: 'VIRTIO' }]);
    expect(controls[3].NIC_type.value).toBe('VIRTIO');

    const wait = (component as any).wizardConfig[0].fieldConfig.find((field) => field.name === 'wait');
    expect(wait.isHidden).toBeTrue();
    expect(controls[0].wait.value).toBeFalse();
    expect((component as any).summary['Architecture']).toBe('aarch64');
  });

  it('puts everything back for a native guest', () => {
    component.applyArchitecturePolicy(entityWizard, 'aarch64');
    component.applyArchitecturePolicy(entityWizard, 'amd64');

    const os = (component as any).wizardConfig[0].fieldConfig.find((field) => field.name === 'os');
    expect(os.options).toEqual(helptext.os_options);
    const hddType = (component as any).wizardConfig[2].fieldConfig.find((field) => field.name === 'hdd_type');
    expect(hddType.options).toEqual(helptext.hdd_type_options);
    expect((component as any).nicType.options.map((option) => option.value)).toEqual(['E1000', 'VIRTIO']);
    const wait = (component as any).wizardConfig[0].fieldConfig.find((field) => field.name === 'wait');
    expect(wait.isHidden).toBeFalse();
  });

  it('sends the architecture with vm.create', async () => {
    await component.customSubmit({
      arch: 'riscv64', name: 'rv', description: '', time: 'LOCAL', vcpus: 1, cores: 1, threads: 1, memory: '1 GiB',
      bootloader: 'UEFI', shutdown_timeout: 90, autostart: true, datastore: '/mnt/tank', volsize: '10 GiB',
      hdd_type: 'VIRTIO', NIC_type: 'VIRTIO', NIC_mac: '00:a0:98:11:22:33', nic_attach: 'bridge0', enable_vnc: false,
    });

    expect(ws.call).toHaveBeenCalledWith('vm.create', [jasmine.objectContaining({ arch: 'riscv64', bootloader: 'UEFI' })]);
    const payload = ws.call.calls.mostRecent().args[1][0];
    expect(payload.devices.find((device) => device.dtype === 'DISK').attributes.type).toBe('VIRTIO');
    expect(payload.devices.find((device) => device.dtype === 'NIC').attributes.type).toBe('VIRTIO');
  });

  it('defaults a payload without an architecture to amd64', async () => {
    await component.customSubmit({
      name: 'legacy', memory: '1 GiB', datastore: '/mnt/tank', volsize: '10 GiB', hdd_type: 'AHCI', NIC_type: 'E1000',
      enable_vnc: false, bootloader: 'UEFI',
    });

    expect(ws.call.calls.mostRecent().args[1][0].arch).toBe('amd64');
  });
});
