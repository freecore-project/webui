import { VmService } from './vm.service';

describe('VmService bootloader policy', () => {
  let service: VmService;

  beforeEach(() => {
    service = new VmService({} as any, {} as any);
  });

  it('offers only supported bootloaders for new and non-GRUB VMs', () => {
    expect(service.getBootloaderOptions()).toEqual([
      ['UEFI', 'UEFI'],
      ['UEFI_CSM', 'UEFI-CSM'],
    ]);
    expect(service.getBootloaderOptions('UEFI').some(([value]) => value === 'GRUB')).toBeFalse();
    expect(service.getBootloaderOptions('UEFI_CSM').some(([value]) => value === 'GRUB')).toBeFalse();
  });

  it('preserves a clearly deprecated option for an existing GRUB VM', () => {
    const grub = service.getBootloaderOptions('GRUB').find(([value]) => value === 'GRUB');

    expect(grub).toBeDefined();
    expect(grub[1]).toContain('Deprecated');
    expect(grub[1]).toContain('existing VM only');
  });
});
