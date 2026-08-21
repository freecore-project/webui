import { WebTerminalService } from './web-terminal.service';

describe('WebTerminalService input bytes', () => {
  let service: WebTerminalService;
  let socket: jasmine.SpyObj<WebSocket>;

  beforeEach(() => {
    service = new WebTerminalService({} as any, {} as any);
    socket = jasmine.createSpyObj<WebSocket>('WebSocket', ['send']);
    Object.defineProperty(socket, 'readyState', { value: WebSocket.OPEN });
    (service as any).socket = socket;
  });

  it('does not send input while disconnected', () => {
    service.send('ignored');

    expect(socket.send).not.toHaveBeenCalled();
  });

  it('encodes string input as UTF-8 bytes', () => {
    (service as any).connected = true;

    service.send('Aå');

    const payload = socket.send.calls.mostRecent().args[0] as Uint8Array;
    expect(payload instanceof Uint8Array).toBeTrue();
    expect(Array.from(payload)).toEqual([65, 195, 165]);
  });

  it('copies typed-array input into an owned ArrayBuffer payload', () => {
    (service as any).connected = true;
    const input = new Uint8Array([0, 128, 255]);

    service.send(input);

    const payload = socket.send.calls.mostRecent().args[0] as Uint8Array;
    expect(payload).not.toBe(input);
    expect(payload.buffer instanceof ArrayBuffer).toBeTrue();
    expect(Array.from(payload)).toEqual([0, 128, 255]);

    input[0] = 42;
    expect(Array.from(payload)).toEqual([0, 128, 255]);
  });
});
