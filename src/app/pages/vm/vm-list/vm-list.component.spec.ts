import { VMListComponent } from './vm-list.component';

describe('VMListComponent bootloader policy', () => {
  let component: VMListComponent;
  let dialogService: any;

  beforeEach(() => {
    dialogService = { report: jasmine.createSpy('report') };
    component = new VMListComponent(
      {} as any,
      { convertBytestoHumanReadable: () => '1 GiB' } as any,
      {} as any,
      dialogService,
      {} as any,
      {} as any,
    );
  });

  for (const [retired, label] of [['GRUB', 'GRUB'], ['UEFI_CSM', 'UEFI-CSM']]) {
    it(`shows a stale ${retired} row as unsupported and only leaves deletion available`, () => {
      const rows = component.resourceTransformIncomingRestData([{
        id: 7,
        name: 'legacy',
        bootloader: retired,
        memory: 1024,
        shutdown_timeout: 90,
        devices: [],
        status: { state: 'ERROR' },
      }]);

      expect(rows[0].bootloader).toBe(retired);
      expect(rows[0].bootloader_display).toBe(`${label} (Unsupported in FreeCORE 15.1)`);
      expect(rows[0].unsupported_bootloader).toBeTrue();
      expect(rows[0].state).toBe(`UNSUPPORTED (${label})`);
      expect(component.isActionVisible('DELETE', rows[0])).toBeTrue();
      for (const action of ['START', 'EDIT', 'CLONE', 'DEVICES', 'SERIAL']) {
        expect(component.isActionVisible(action, rows[0])).toBeFalse();
      }
    });
  }

  // the internal development record
  it('shows the architecture, defaulting an older row to amd64, and an unavailable lane as such', () => {
    const rows = component.resourceTransformIncomingRestData([
      {
        id: 1, name: 'old', bootloader: 'UEFI', memory: 1024, shutdown_timeout: 90, devices: [], status: { state: 'STOPPED' },
      },
      {
        id: 2, name: 'arm', bootloader: 'UEFI', arch: 'aarch64', memory: 1024, shutdown_timeout: 90, devices: [],
        status: { state: 'ERROR', domain_state: 'UNAVAILABLE', error: 'libvirt on this system was built without its QEMU driver.' },
      },
    ]);

    expect(rows[0].arch).toBe('amd64');
    expect(rows[0].state).toBe('STOPPED');
    expect(rows[1].arch).toBe('aarch64');
    expect(rows[1].state).toBe('UNAVAILABLE');
    expect(component.columns.find((column) => column.prop === 'arch').name).toBe('Architecture');
  });

  it('keeps cloning available for supported bootloaders', () => {
    expect(component.isActionVisible('CLONE', {
      bootloader: 'UEFI',
      status: { state: 'STOPPED' },
    })).toBeTrue();
  });

  for (const retired of ['GRUB', 'UEFI_CSM']) {
    it(`does not send an autostart mutation for a stale ${retired} row`, () => {
      component.onCheckboxChange({ bootloader: retired, autostart: true });

      expect(dialogService.report).toHaveBeenCalled();
    });
  }
});
