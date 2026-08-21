import { VmService } from '../../../services/vm.service';
import { VmFormComponent } from './vm-form.component';

describe('VmFormComponent bootloader policy', () => {
  let component: VmFormComponent;

  beforeEach(() => {
    const storageService = {
      convertBytestoHumanReadable: jasmine.createSpy('convertBytestoHumanReadable').and.returnValue('1 GiB'),
    };
    component = new VmFormComponent(
      {} as any,
      {} as any,
      storageService as any,
      {} as any,
      {} as any,
      new VmService({} as any, {} as any),
      {} as any,
    );
    component.fieldConfig = [{ name: 'bootloader', options: [] } as any, { name: 'arch', options: [] } as any];
  });

  // the internal development record
  it('shows the architecture, read-only, and defaults a record without one to amd64', () => {
    const incoming = component.resourceTransformIncomingRestData({ bootloader: 'UEFI', memory: 1024, arch: 'aarch64' });
    const arch = component.fieldConfig.find((field) => field.name === 'arch');

    expect(incoming.arch).toBe('aarch64');
    expect(arch.disabled).toBeTrue();
    expect(arch.options.map((option) => option.value)).toEqual(['amd64', 'aarch64', 'riscv64']);
    expect(component.resourceTransformIncomingRestData({ bootloader: 'UEFI', memory: 1024 }).arch).toBe('amd64');
  });

  it('never submits the architecture: the control is disabled when the form initialises', () => {
    const valueChanges = { subscribe: jasmine.createSpy('subscribe') };
    const archControl = { disable: jasmine.createSpy('disable'), enable: jasmine.createSpy('enable') };
    component.afterInit({
      formGroup: {
        controls: {
          bootloader: { disable: () => {}, enable: () => {} },
          arch: archControl,
          memory: { valueChanges },
          vcpus: { valueChanges },
          cores: { valueChanges },
          threads: { valueChanges },
        },
      },
    });

    expect(archControl.disable).toHaveBeenCalledWith({ emitEvent: false });
  });

  for (const retired of ['GRUB', 'UEFI_CSM']) {
    it(`renders a stale ${retired} record as unsupported without making it selectable`, () => {
      const incoming = component.resourceTransformIncomingRestData({ bootloader: retired, memory: 1024 });
      const bootloader = component.fieldConfig.find((field) => field.name === 'bootloader');

      expect(incoming.bootloader).toBe(retired);
      expect(bootloader.options).toEqual([{ label: 'UEFI', value: 'UEFI' }]);
      expect(bootloader.disabled).toBeTrue();
      expect(bootloader.hasErrors).toBeTrue();
      expect(bootloader.warnings).toContain('unsupported in FreeCORE 15.1');
      expect(bootloader.warnings).toContain('ordinary UEFI');
      expect((component as any).save_button_enabled).toBeFalse();
    });
  }

  it('keeps the stale record blocked regardless of response and form initialization order', () => {
    component.resourceTransformIncomingRestData({ bootloader: 'GRUB', memory: 1024 });
    const valueChanges = { subscribe: jasmine.createSpy('subscribe') };
    const bootloaderControl = {
      disable: jasmine.createSpy('disable'),
      enable: jasmine.createSpy('enable'),
    };
    component.afterInit({
      formGroup: {
        controls: {
          bootloader: bootloaderControl,
          memory: { valueChanges },
          vcpus: { valueChanges },
          cores: { valueChanges },
          threads: { valueChanges },
        },
      },
    });
    const bootloader = component.fieldConfig.find((field) => field.name === 'bootloader');

    expect(bootloader.options).toEqual([{ label: 'UEFI', value: 'UEFI' }]);
    expect(bootloader.disabled).toBeTrue();
    expect((component as any).save_button_enabled).toBeFalse();
    expect(bootloaderControl.disable).toHaveBeenCalledWith({ emitEvent: false });
    expect(bootloaderControl.enable).not.toHaveBeenCalled();
  });

  it('keeps an ordinary UEFI VM editable', () => {
    component.resourceTransformIncomingRestData({ bootloader: 'UEFI', memory: 1024 });
    const bootloader = component.fieldConfig.find((field) => field.name === 'bootloader');

    expect(bootloader.options).toEqual([{ label: 'UEFI', value: 'UEFI' }]);
    expect(bootloader.disabled).toBeFalse();
    expect(bootloader.hasErrors).toBeFalse();
    expect((component as any).save_button_enabled).toBeTrue();
  });
});
