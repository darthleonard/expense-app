import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  BluetoothDeviceInfo,
  BluetoothState,
  IncomingTransferPrompt,
  TransferProgress,
  TransferState,
  TransferSummary,
} from '../../core/models/share-data.model';
import { BluetoothTransferService } from '../../core/services/bluetooth-transfer.service';
import { ShareService } from '../../core/services/share.service';

@Component({
  selector: 'app-share-data',
  templateUrl: './share-data.page.html',
  styleUrls: ['./share-data.page.scss'],
  standalone: false,
})
export class ShareDataPage implements OnInit, OnDestroy {
  mode: 'idle' | 'send' | 'receive' = 'idle';
  state: TransferState = 'idle';

  bluetoothState: BluetoothState = {
    supported: true,
    enabled: true,
    hasPermissions: true,
  };

  discoveredDevices: BluetoothDeviceInfo[] = [];
  pairedDevices: BluetoothDeviceInfo[] = [];
  isDiscovering = false;

  selectedDevice: BluetoothDeviceInfo | null = null;
  progress: TransferProgress = { bytesTransferred: 0, totalBytes: 0, percentage: 0 };
  summary: TransferSummary | null = null;
  errorMessage: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private shareService: ShareService,
    private bluetoothTransfer: BluetoothTransferService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    await this.refreshBluetoothState();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private setupSubscriptions() {
    // 1. Discovered Device
    this.subs.push(
      this.bluetoothTransfer.deviceDiscovered$.subscribe((device) => {
        if (!this.discoveredDevices.some((d) => d.address === device.address)) {
          this.discoveredDevices.push(device);
        }
      })
    );

    // 2. Discovery Finished
    this.subs.push(
      this.bluetoothTransfer.discoveryFinished$.subscribe(() => {
        this.isDiscovering = false;
      })
    );

    // 3. Incoming Connection Prompt on Receiver
    this.subs.push(
      this.bluetoothTransfer.incomingConnection$.subscribe(async (prompt) => {
        await this.handleIncomingPrompt(prompt);
      })
    );

    // 4. Transfer Progress
    this.subs.push(
      this.bluetoothTransfer.transferProgress$.subscribe((prog) => {
        this.progress = prog;
      })
    );

    // 5. Server Error
    this.subs.push(
      this.bluetoothTransfer.serverError$.subscribe((err) => {
        this.errorMessage = err;
        this.state = 'error';
      })
    );
  }

  async refreshBluetoothState() {
    this.bluetoothState = await this.bluetoothTransfer.checkState();
  }

  // ── Send Flow ─────────────────────────────────────────────────────────────

  async onSelectSend() {
    this.resetState();
    this.mode = 'send';
    this.state = 'checking_permissions';

    await this.refreshBluetoothState();

    if (!this.bluetoothState.hasPermissions) {
      const granted = await this.bluetoothTransfer.requestPermissions();
      if (!granted) {
        this.showToast('SHARE_PERMISSIONS_REQUIRED', 'danger');
        this.state = 'error';
        this.errorMessage = 'SHARE_PERMISSIONS_REQUIRED';
        return;
      }
    }

    if (!this.bluetoothState.enabled) {
      const enabled = await this.bluetoothTransfer.requestEnable();
      if (!enabled) {
        this.showToast('SHARE_BT_DISABLED', 'warning');
        this.state = 'error';
        this.errorMessage = 'SHARE_BT_DISABLED';
        return;
      }
    }

    await this.startDeviceDiscovery();
  }

  async startDeviceDiscovery() {
    this.state = 'discovering_devices';
    this.isDiscovering = true;
    this.discoveredDevices = [];

    this.pairedDevices = await this.bluetoothTransfer.getPairedDevices();
    await this.bluetoothTransfer.startDiscovery();
  }

  async onSelectDevice(device: BluetoothDeviceInfo) {
    this.selectedDevice = device;
    this.state = 'connecting';
    this.errorMessage = null;

    try {
      await this.bluetoothTransfer.stopDiscovery();
      this.isDiscovering = false;

      this.state = 'preparing_data';
      this.progress = { bytesTransferred: 0, totalBytes: 0, percentage: 0 };

      this.state = 'sending';
      await this.shareService.send(device.address);

      this.state = 'completed';
      await this.showToast('SHARE_SEND_SUCCESS', 'success');
    } catch (err: any) {
      console.error('Send error:', err);
      this.state = 'error';
      this.errorMessage = err?.message || 'SHARE_SEND_FAILED';
      await this.showToast(this.errorMessage || 'SHARE_SEND_FAILED', 'danger');
    }
  }

  // ── Receive Flow ──────────────────────────────────────────────────────────

  async onSelectReceive() {
    this.resetState();
    this.mode = 'receive';
    this.state = 'checking_permissions';

    await this.refreshBluetoothState();

    if (!this.bluetoothState.hasPermissions) {
      const granted = await this.bluetoothTransfer.requestPermissions();
      if (!granted) {
        this.showToast('SHARE_PERMISSIONS_REQUIRED', 'danger');
        this.state = 'error';
        this.errorMessage = 'SHARE_PERMISSIONS_REQUIRED';
        return;
      }
    }

    if (!this.bluetoothState.enabled) {
      const enabled = await this.bluetoothTransfer.requestEnable();
      if (!enabled) {
        this.showToast('SHARE_BT_DISABLED', 'warning');
        this.state = 'error';
        this.errorMessage = 'SHARE_BT_DISABLED';
        return;
      }
    }

    this.state = 'waiting_connection';
    try {
      await this.bluetoothTransfer.startServer();
    } catch (err: any) {
      console.error('Server start error:', err);
      this.state = 'error';
      this.errorMessage = err?.message || 'SHARE_SERVER_FAILED';
    }
  }

  private async handleIncomingPrompt(prompt: IncomingTransferPrompt) {
    this.state = 'incoming_prompt';

    const header = await this.translate.get('SHARE_INCOMING_TITLE').toPromise();
    const body = (await this.translate.get('SHARE_INCOMING_MSG').toPromise()).replace(
      '{device}',
      prompt.senderName || prompt.senderAddress
    );
    const cancelLabel = await this.translate.get('CANCEL').toPromise();
    const acceptLabel = await this.translate.get('CONFIRM').toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message: body,
      backdropDismiss: false,
      buttons: [
        {
          text: cancelLabel,
          role: 'cancel',
          handler: async () => {
            await this.bluetoothTransfer.rejectTransfer();
            this.state = 'waiting_connection';
          },
        },
        {
          text: acceptLabel,
          handler: async () => {
            await this.processIncomingTransfer();
          },
        },
      ],
    });

    await alert.present();
  }

  private async processIncomingTransfer() {
    this.state = 'receiving';
    this.progress = { bytesTransferred: 0, totalBytes: 0, percentage: 0 };

    try {
      const payload = await this.bluetoothTransfer.acceptTransfer();

      this.state = 'updating_db';
      this.summary = await this.shareService.applyReceivedData(payload);

      this.state = 'completed';
      await this.showToast('SHARE_RECEIVE_SUCCESS', 'success');
    } catch (err: any) {
      console.error('Receive error:', err);
      this.state = 'error';
      this.errorMessage = err?.message || 'SHARE_RECEIVE_FAILED';
      await this.showToast(this.errorMessage || 'SHARE_RECEIVE_FAILED', 'danger');
    }
  }

  // ── Helpers & Cleanup ─────────────────────────────────────────────────────

  async onCancel() {
    await this.bluetoothTransfer.cancelTransfer();
    this.resetState();
  }

  resetState() {
    this.mode = 'idle';
    this.state = 'idle';
    this.discoveredDevices = [];
    this.pairedDevices = [];
    this.selectedDevice = null;
    this.progress = { bytesTransferred: 0, totalBytes: 0, percentage: 0 };
    this.summary = null;
    this.errorMessage = null;
    this.isDiscovering = false;
  }

  private cleanup() {
    this.subs.forEach((s) => s.unsubscribe());
    this.subs = [];
    this.bluetoothTransfer.cancelTransfer();
  }

  private async showToast(key: string, color: 'success' | 'warning' | 'danger') {
    let message = key;
    try {
      message = await this.translate.get(key).toPromise();
    } catch (e) {
      message = key;
    }
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 'alert-circle',
    });
    await toast.present();
  }
}
