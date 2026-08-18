import { Injectable, NgZone } from '@angular/core';
import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { Subject, Observable } from 'rxjs';
import {
  BluetoothDeviceInfo,
  BluetoothState,
  IncomingTransferPrompt,
  SharePayload,
  TransferProgress,
} from '../models/share-data.model';

export interface BluetoothTransferPluginInterface {
  checkBluetoothState(): Promise<BluetoothState>;
  requestPermissions(): Promise<{ granted: boolean }>;
  requestBluetoothEnable(): Promise<{ enabled: boolean }>;
  getPairedDevices(): Promise<{ devices: BluetoothDeviceInfo[] }>;
  startDiscovery(): Promise<{ started: boolean }>;
  stopDiscovery(): Promise<{ stopped: boolean }>;
  makeDiscoverable(options?: { duration?: number }): Promise<{ discoverable: boolean }>;
  startServer(): Promise<{ started: boolean }>;
  acceptTransfer(): Promise<{ success: boolean; payload: SharePayload }>;
  rejectTransfer(): Promise<{ rejected: boolean }>;
  stopServer(): Promise<{ stopped: boolean }>;
  sendData(options: { address: string; payload: SharePayload }): Promise<{ success: boolean; bytesSent: number }>;
  cancelTransfer(): Promise<{ canceled: boolean }>;
  addListener(eventName: string, listenerFunc: (...args: any[]) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const NativePlugin = registerPlugin<BluetoothTransferPluginInterface>('BluetoothTransfer');

@Injectable({
  providedIn: 'root',
})
export class BluetoothTransferService {
  private deviceDiscoveredSubject = new Subject<BluetoothDeviceInfo>();
  private discoveryFinishedSubject = new Subject<void>();
  private incomingConnectionSubject = new Subject<IncomingTransferPrompt>();
  private transferProgressSubject = new Subject<TransferProgress>();
  private serverErrorSubject = new Subject<string>();

  public deviceDiscovered$: Observable<BluetoothDeviceInfo> = this.deviceDiscoveredSubject.asObservable();
  public discoveryFinished$: Observable<void> = this.discoveryFinishedSubject.asObservable();
  public incomingConnection$: Observable<IncomingTransferPrompt> = this.incomingConnectionSubject.asObservable();
  public transferProgress$: Observable<TransferProgress> = this.transferProgressSubject.asObservable();
  public serverError$: Observable<string> = this.serverErrorSubject.asObservable();

  private isNative = Capacitor.isNativePlatform();
  private activeHandles: PluginListenerHandle[] = [];

  constructor(private ngZone: NgZone) {
    if (this.isNative) {
      this.initNativeListeners();
    }
  }

  private async initNativeListeners() {
    try {
      const h1 = await NativePlugin.addListener('deviceDiscovered', (device: BluetoothDeviceInfo) => {
        this.ngZone.run(() => this.deviceDiscoveredSubject.next(device));
      });
      const h2 = await NativePlugin.addListener('discoveryFinished', () => {
        this.ngZone.run(() => this.discoveryFinishedSubject.next());
      });
      const h3 = await NativePlugin.addListener('incomingConnection', (prompt: IncomingTransferPrompt) => {
        this.ngZone.run(() => this.incomingConnectionSubject.next(prompt));
      });
      const h4 = await NativePlugin.addListener('transferProgress', (progress: TransferProgress) => {
        this.ngZone.run(() => this.transferProgressSubject.next(progress));
      });
      const h5 = await NativePlugin.addListener('serverError', (err: { error: string }) => {
        this.ngZone.run(() => this.serverErrorSubject.next(err?.error || 'Server error'));
      });
      this.activeHandles = [h1, h2, h3, h4, h5];
    } catch (e) {
      console.warn('Could not register BluetoothTransfer listeners:', e);
    }
  }

  async checkState(): Promise<BluetoothState> {
    if (!this.isNative) {
      return { supported: true, enabled: true, hasPermissions: true };
    }
    return NativePlugin.checkBluetoothState();
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.isNative) return true;
    const res = await NativePlugin.requestPermissions();
    return res.granted;
  }

  async requestEnable(): Promise<boolean> {
    if (!this.isNative) return true;
    const res = await NativePlugin.requestBluetoothEnable();
    return res.enabled;
  }

  async getPairedDevices(): Promise<BluetoothDeviceInfo[]> {
    if (!this.isNative) {
      return [
        { name: 'Pixel 8 (Simulated)', address: '00:11:22:33:44:55', bonded: true },
        { name: 'Galaxy Tab (Simulated)', address: '66:77:88:99:AA:BB', bonded: true },
      ];
    }
    const res = await NativePlugin.getPairedDevices();
    return res.devices || [];
  }

  async startDiscovery(): Promise<boolean> {
    if (!this.isNative) {
      setTimeout(() => {
        this.deviceDiscoveredSubject.next({
          name: 'Nearby Device A (Simulated)',
          address: 'AA:BB:CC:DD:EE:01',
          bonded: false,
        });
      }, 500);
      setTimeout(() => {
        this.deviceDiscoveredSubject.next({
          name: 'Nearby Device B (Simulated)',
          address: 'AA:BB:CC:DD:EE:02',
          bonded: false,
        });
      }, 1000);
      setTimeout(() => {
        this.discoveryFinishedSubject.next();
      }, 2000);
      return true;
    }
    const res = await NativePlugin.startDiscovery();
    return res.started;
  }

  async stopDiscovery(): Promise<void> {
    if (!this.isNative) return;
    await NativePlugin.stopDiscovery();
  }

  async startServer(): Promise<boolean> {
    if (!this.isNative) {
      return true;
    }
    const res = await NativePlugin.startServer();
    return res.started;
  }

  async acceptTransfer(): Promise<SharePayload> {
    if (!this.isNative) {
      throw new Error('Native platform required for transfer.');
    }
    const res = await NativePlugin.acceptTransfer();
    return res.payload;
  }

  async rejectTransfer(): Promise<void> {
    if (!this.isNative) return;
    await NativePlugin.rejectTransfer();
  }

  async stopServer(): Promise<void> {
    if (!this.isNative) return;
    await NativePlugin.stopServer();
  }

  async sendData(address: string, payload: SharePayload): Promise<{ success: boolean; bytesSent: number }> {
    if (!this.isNative) {
      // Simulate progress for browser testing
      for (let p = 10; p <= 100; p += 20) {
        await new Promise((r) => setTimeout(r, 80));
        this.transferProgressSubject.next({
          bytesTransferred: p * 100,
          totalBytes: 10000,
          percentage: p,
        });
      }
      return { success: true, bytesSent: 10000 };
    }
    return NativePlugin.sendData({ address, payload });
  }

  async cancelTransfer(): Promise<void> {
    if (!this.isNative) return;
    await NativePlugin.cancelTransfer();
  }

  public emitMockIncomingPrompt(prompt: IncomingTransferPrompt) {
    this.incomingConnectionSubject.next(prompt);
  }
}
