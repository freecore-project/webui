import { handleNavigationError } from './app.module';

describe('Angular 19 navigation error handler', () => {
  beforeEach(() => {
    spyOn(console, 'error');
  });

  it('requests a reload for a failed lazy chunk', () => {
    const reload = jasmine.createSpy('reload');
    const error = new Error('Loading chunk 42 failed');

    handleNavigationError(error, reload);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledOnceWith(error);
  });

  it('logs another navigation error without requesting a reload', () => {
    const reload = jasmine.createSpy('reload');
    const error = new Error('Guard rejected navigation');

    handleNavigationError(error, reload);

    expect(reload).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledOnceWith(error);
  });
});
