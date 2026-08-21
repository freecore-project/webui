// the internal development record: the Jails glyph -- the same mark that ships on 15.0 and
// 15.1 -- sits on the Symbols 24-unit grid at the set's optical size instead of
// edge to edge on its 27x22 canvas. Read from the shipped asset, served by the
// Karma assets configuration, and measured as the sidebar would render it.
describe('15.2 Jails glyph (the internal development record)', () => {
  let svg: SVGSVGElement;
  let holder: HTMLElement;

  beforeAll(async () => {
    const response = await fetch('/assets/customicons/jail_icon.svg');
    expect(response.ok).toBe(true);
    holder = document.createElement('div');
    holder.style.cssText = 'position:absolute; left:-1000px; top:0; width:18px; height:18px; color: rgb(151, 166, 174);';
    holder.innerHTML = await response.text();
    document.body.appendChild(holder);
    svg = holder.querySelector('svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
  });

  afterAll(() => holder.remove());

  it('is drawn on the 24-unit grid in currentColor and keeps its paths', () => {
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(8);
    expect(getComputedStyle(svg.querySelector('path')).fill).toBe('rgb(151, 166, 174)');
  });

  it('occupies the set\'s optical box: 18 of 24 units wide, centred, inside the 3-unit margins', () => {
    const art = (svg.querySelector('g') as SVGGElement).getBBox();
    const matrix = (svg.querySelector('g') as SVGGElement).getCTM();
    // getBBox is in the group's own units; map it through the transform to viewBox units.
    const scale = matrix.a / (18 / 24);
    const left = matrix.e / (18 / 24) + art.x * scale;
    const right = left + art.width * scale;
    const top = matrix.f / (18 / 24) + art.y * scale;
    const bottom = top + art.height * scale;
    expect(right - left).toBeCloseTo(18, 0);
    expect(left).toBeCloseTo(3, 0);
    expect(right).toBeCloseTo(21, 0);
    expect(top).toBeGreaterThanOrEqual(3);
    expect(bottom).toBeLessThanOrEqual(21);
    expect(Math.abs((top + bottom) / 2 - 12)).toBeLessThan(0.5);
  });
});
