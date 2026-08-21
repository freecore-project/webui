import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { ipValidator } from './ip-validation';

describe('ipValidator', () => {
  function validate(
    value: string[],
    type?: 'ipv4' | 'ipv6' | 'all',
  ) {
    const control = new UntypedFormControl(value);
    new UntypedFormGroup({ addresses: control });

    return type ? ipValidator(type)(control) : ipValidator()(control);
  }

  it('retains IPv4 as the default wildcard family', () => {
    expect(validate(['0.0.0.0', '192.0.2.1'])).toEqual({
      ip: true,
      info: ['IPv4', '0.0.0.0', '192.0.2.1'],
    });
    expect(validate(['::', '2001:db8::1'])).toBeNull();
  });

  it('checks IPv6 wildcard mixing when explicitly selected', () => {
    expect(validate(['::', '2001:db8::1'], 'ipv6')).toEqual({
      ip: true,
      info: ['IPv6', '::', '2001:db8::1'],
    });
  });

  it('checks both wildcard families in all mode', () => {
    expect(validate(['::', '2001:db8::1'], 'all')).toEqual({
      ip: true,
      info: ['IPv6', '::', '2001:db8::1'],
    });
  });

  it('retains empty, single, and non-wildcard results', () => {
    expect(validate([])).toBeNull();
    expect(validate(['0.0.0.0'])).toBeNull();
    expect(validate(['192.0.2.1', '198.51.100.1'])).toBeNull();
    expect(validate(['not-an-address', 'also-not-an-address'])).toBeNull();
  });
});
