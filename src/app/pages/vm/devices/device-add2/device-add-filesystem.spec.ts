import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { VmService } from '../../../../services/vm.service';
import helptext from '../../../../helptext/vm/devices/device-add-edit';
import { DeviceAddComponent } from './device-add.component';

// the internal development record: NVMe as a disk mode, and a shared directory (virtio-9p) as a device.
describe('DeviceAddComponent NVMe and shared directory', () => {
  let component: DeviceAddComponent;
  let ws: { call: jasmine.Spy };

  beforeEach(() => {
    ws = { call: jasmine.createSpy('call').and.returnValue(of(null)) };
    component = new DeviceAddComponent(
      { navigate: () => undefined } as any, { params: of({ pk: '7', name: 'guest' }) } as any, {} as any, ws as any,
      {} as any, {} as any, { open: () => undefined, close: () => undefined } as any, {} as any, {} as any, {} as any,
      new VmService({} as any, {} as any),
    );
  });

  it('offers NVMe as a disk and raw-file mode, and the shared directory as a device type', () => {
    expect(helptext.mode_options.map((option) => option.value)).toEqual(['AHCI', 'VIRTIO', 'NVME']);
    for (const config of [component.diskFieldConfig, component.rawfileFieldConfig]) {
      expect(config.find((field) => field.name === 'type').options).toBe(helptext.mode_options);
    }
    const dtypeField = component.fieldConfig.find((field) => field.name === 'dtype');
    expect(dtypeField.options.map((option) => option.value))
      .toEqual(['CDROM', 'NIC', 'DISK', 'RAW', 'PCI', 'VNC', 'FILESYSTEM']);
    expect(component.filesystemFieldConfig.map((field) => field.name)).toEqual(['source', 'tag', 'readonly', 'order']);
    expect(component.filesystemFieldConfig.find((field) => field.name === 'source').explorerType).toBe('directory');
  });

  it('submits an NVMe disk with the sector size the way the other modes do', () => {
    component.formGroup = new UntypedFormGroup({ dtype: new UntypedFormControl('DISK') });
    component.activeFormGroup = new UntypedFormGroup({
      path: new UntypedFormControl('/dev/zvol/tank/vm/guest'),
      type: new UntypedFormControl('NVME'),
      sectorsize: new UntypedFormControl(4096),
      order: new UntypedFormControl(null),
    });

    component.onSubmit(new Event('submit'));

    expect(ws.call).toHaveBeenCalledWith('vm.device.create', [{
      vm: 7,
      dtype: 'DISK',
      attributes: {
        path: '/dev/zvol/tank/vm/guest', type: 'NVME', physical_sectorsize: 4096, logical_sectorsize: 4096,
      },
      order: null,
    }]);
  });

  it('submits a shared directory as source, tag and readonly, with no sector-size keys', () => {
    component.formGroup = new UntypedFormGroup({ dtype: new UntypedFormControl('FILESYSTEM') });
    component.activeFormGroup = new UntypedFormGroup({
      source: new UntypedFormControl('/mnt/tank/shared'),
      tag: new UntypedFormControl('shared'),
      readonly: new UntypedFormControl(true),
      order: new UntypedFormControl(1002),
    });

    component.onSubmit(new Event('submit'));

    expect(ws.call).toHaveBeenCalledWith('vm.device.create', [{
      vm: 7,
      dtype: 'FILESYSTEM',
      attributes: { source: '/mnt/tank/shared', tag: 'shared', readonly: true },
      order: 1002,
    }]);
  });

  it('keeps the tag to what the guest can mount', () => {
    const [, pattern] = helptext.share_tag_validation;
    const control = new UntypedFormControl('');
    new UntypedFormGroup({ tag: control }); // regexValidator only judges a control that has a parent
    for (const tag of ['shared', 'a', 'Data-1.0_x', 'x'.repeat(32)]) {
      control.setValue(tag);
      expect(pattern(control)).withContext(tag).toBeNull();
    }
    for (const tag of ['-leading', 'has space', 'x'.repeat(33), 'sl/ash']) {
      control.setValue(tag);
      expect(pattern(control)).withContext(tag).not.toBeNull();
    }
  });

  it('offers neither to an emulated guest', () => {
    component.diskFormGroup = new UntypedFormGroup({ type: new UntypedFormControl('NVME') });
    component.rawfileFormGroup = new UntypedFormGroup({ type: new UntypedFormControl('NVME') });
    component.nicFormGroup = new UntypedFormGroup({ type: new UntypedFormControl('E1000') });
    component.vncFormGroup = new UntypedFormGroup({ wait: new UntypedFormControl(true) });
    const dtypeField = component.fieldConfig.find((field) => field.name === 'dtype');

    component.applyEmulatedGuestPolicy(dtypeField);

    expect(dtypeField.options.map((option) => option.value)).toEqual(['CDROM', 'NIC', 'DISK', 'RAW', 'VNC']);
    for (const config of [component.diskFieldConfig, component.rawfileFieldConfig]) {
      expect(config.find((field) => field.name === 'type').options).toEqual([{ label: 'VirtIO', value: 'VIRTIO' }]);
    }
    expect(component.diskFormGroup.value.type).toBe('VIRTIO');
    expect(component.rawfileFormGroup.value.type).toBe('VIRTIO');
  });
});
