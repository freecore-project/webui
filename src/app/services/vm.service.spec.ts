import { of, throwError } from 'rxjs';
import { VmService } from './vm.service';

describe('VmService bootloader policy', () => {
  let service: VmService;

  beforeEach(() => {
    service = new VmService({} as any, {} as any);
  });

  it('offers only supported 15.1 bootloaders', () => {
    expect(service.getBootloaderOptions()).toEqual([
      ['UEFI', 'UEFI'],
    ]);
  });
});

// the internal development record: the architecture list never hides amd64 and never reorders it.
describe('VmService.getArchitectureChoices', () => {
  const choicesFrom = (response: any) => {
    const ws = { call: jasmine.createSpy('call').and.returnValue(response) };
    let result: any[];
    new VmService({} as any, ws as any).getArchitectureChoices().subscribe((choices) => { result = choices; });
    return result;
  };

  it('keeps amd64 first and selectable even when the host cannot run it', () => {
    const result = choicesFrom(of({
      amd64: { available: false, emulated: false, reason: 'no VT-x' },
      aarch64: { available: true, emulated: true, reason: null },
      riscv64: { available: true, emulated: true, reason: null },
    }));

    expect(result.map((choice) => choice.value)).toEqual(['amd64', 'aarch64', 'riscv64']);
    expect(result[0].emulated).toBeFalse();
  });

  it('adds only the emulated architectures the host reports available', () => {
    const result = choicesFrom(of({
      amd64: { available: true, emulated: false, reason: null },
      aarch64: { available: false, emulated: true, reason: 'not installed' },
      riscv64: { available: true, emulated: true, reason: null },
    }));

    expect(result.map((choice) => choice.value)).toEqual(['amd64', 'riscv64']);
  });

  it('falls back to amd64 alone on an older middleware without the call', () => {
    expect(choicesFrom(throwError(() => new Error('no such method'))).map((choice) => choice.value)).toEqual(['amd64']);
  });
});
