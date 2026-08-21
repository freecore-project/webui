import { VMListComponent } from './vm-list.component';

describe('VMListComponent GRUB clone guard', () => {
  let component: VMListComponent;

  beforeEach(() => {
    component = new VMListComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('hides cloning for an existing GRUB VM', () => {
    expect(component.isActionVisible('CLONE', {
      bootloader: 'GRUB',
      status: { state: 'STOPPED' },
    })).toBeFalse();
  });

  it('keeps cloning available for supported bootloaders', () => {
    for (const bootloader of ['UEFI', 'UEFI_CSM']) {
      expect(component.isActionVisible('CLONE', {
        bootloader,
        status: { state: 'STOPPED' },
      })).toBeTrue();
    }
  });
});
