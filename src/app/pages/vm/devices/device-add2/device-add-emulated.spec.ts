import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { VmService } from '../../../../services/vm.service';
import { DeviceAddComponent } from './device-add.component';

// the internal development record: what an emulated (QEMU) guest may have added.
describe('DeviceAddComponent emulated guest policy', () => {
  let component: DeviceAddComponent;

  beforeEach(() => {
    component = new DeviceAddComponent(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      new VmService({} as any, {} as any),
    );
    component.diskFormGroup = new UntypedFormGroup({ type: new UntypedFormControl('AHCI') });
    component.rawfileFormGroup = new UntypedFormGroup({ type: new UntypedFormControl('AHCI') });
    component.nicFormGroup = new UntypedFormGroup({ type: new UntypedFormControl('E1000') });
    component.vncFormGroup = new UntypedFormGroup({ wait: new UntypedFormControl(true) });
    (component as any).nicType = {
      options: [{ label: 'Intel e82585 (e1000)', value: 'E1000' }, { label: 'VirtIO', value: 'VIRTIO' }],
    };
  });

  it('offers VirtIO only, no PCI passthrough and no waiting for VNC', () => {
    const dtypeField = component.fieldConfig.find((field) => field.name === 'dtype');
    component.applyEmulatedGuestPolicy(dtypeField);

    expect(dtypeField.options.map((option) => option.value)).toEqual(['CDROM', 'NIC', 'DISK', 'RAW', 'VNC']);
    for (const config of [component.diskFieldConfig, component.rawfileFieldConfig]) {
      expect(config.find((field) => field.name === 'type').options).toEqual([{ label: 'VirtIO', value: 'VIRTIO' }]);
    }
    expect(component.diskFormGroup.value.type).toBe('VIRTIO');
    expect(component.rawfileFormGroup.value.type).toBe('VIRTIO');
    expect((component as any).nicType.options).toEqual([{ label: 'VirtIO', value: 'VIRTIO' }]);
    expect(component.nicFormGroup.value.type).toBe('VIRTIO');
    expect(component.vncFieldConfig.find((field) => field.name === 'wait').isHidden).toBeTrue();
    expect(component.vncFormGroup.value.wait).toBeFalse();
  });

  it('is only applied to emulated architectures', () => {
    const vmService = new VmService({} as any, {} as any);
    expect(vmService.isEmulated('amd64')).toBeFalse();
    expect(vmService.isEmulated(undefined)).toBeFalse();
    expect(vmService.isEmulated('aarch64')).toBeTrue();
    expect(vmService.isEmulated(' RISCV64 ')).toBeTrue();
  });
});
