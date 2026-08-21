import { fakeAsync, flushMicrotasks } from '@angular/core/testing';

import { PluginsComponent } from './plugins.component';

describe('PluginsComponent public IP lookup', () => {
  function createComponent(): PluginsComponent {
    return new PluginsComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  it('normalizes the browser fetch response', fakeAsync(() => {
    spyOn(window, 'fetch').and.returnValue(Promise.resolve({
      text: () => Promise.resolve('203.0.113.10\n'),
    } as Response));

    const component = createComponent();
    flushMicrotasks();

    expect(window.fetch).toHaveBeenCalledOnceWith('https://ipv4.icanhazip.com/');
    expect((component as any).publicIp).toBe('203.0.113.10');
  }));

  it('retains an empty public IP when the lookup fails', fakeAsync(() => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('offline')));
    spyOn(console, 'log');

    const component = createComponent();
    flushMicrotasks();

    expect((component as any).publicIp).toBe('');
  }));
});
