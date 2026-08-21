import { CustomizerComponent } from './customizer.component';

describe('CustomizerComponent', () => {
  it('creates with a navigation publisher', () => {
    const navigation = {
      publishNavigationChange: jasmine.createSpy('publishNavigationChange'),
    };
    const component = new CustomizerComponent(navigation as any);

    expect(component).toBeTruthy();
  });
});
