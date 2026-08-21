import { VmService } from '../../../services/vm.service';
import { VmFormComponent } from './vm-form.component';

describe('VmFormComponent GRUB migration choices', () => {
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
    component.fieldConfig = [{ name: 'bootloader', options: [] } as any];
  });

  it('preserves GRUB only when the existing VM already uses it', () => {
    const incoming = component.resourceTransformIncomingRestData({ bootloader: 'GRUB', memory: 1024 });
    const bootloader = component.fieldConfig.find((field) => field.name === 'bootloader');

    expect(incoming.bootloader).toBe('GRUB');
    expect(bootloader.options.some((option) => option.value === 'GRUB')).toBeTrue();
    expect(bootloader.options.some((option) => option.value === 'UEFI')).toBeTrue();
    expect(bootloader.options.some((option) => option.value === 'UEFI_CSM')).toBeTrue();
  });

  it('preserves the existing GRUB option regardless of response and form initialization order', () => {
    component.resourceTransformIncomingRestData({ bootloader: 'GRUB', memory: 1024 });
    const valueChanges = { subscribe: jasmine.createSpy('subscribe') };
    component.afterInit({
      formGroup: {
        controls: {
          memory: { valueChanges },
          vcpus: { valueChanges },
          cores: { valueChanges },
          threads: { valueChanges },
        },
      },
    });
    const bootloader = component.fieldConfig.find((field) => field.name === 'bootloader');

    expect(bootloader.options.some((option) => option.value === 'GRUB')).toBeTrue();
  });

  it('does not offer a transition from UEFI to GRUB', () => {
    component.resourceTransformIncomingRestData({ bootloader: 'UEFI', memory: 1024 });
    const bootloader = component.fieldConfig.find((field) => field.name === 'bootloader');

    expect(bootloader.options.some((option) => option.value === 'GRUB')).toBeFalse();
  });
});
