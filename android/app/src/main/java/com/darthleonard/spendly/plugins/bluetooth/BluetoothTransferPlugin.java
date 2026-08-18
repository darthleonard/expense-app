package com.darthleonard.spendly.plugins.bluetooth;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "BluetoothTransfer",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE
            },
            alias = "bluetooth"
        ),
        @Permission(
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            },
            alias = "location"
        )
    }
)
@SuppressLint("MissingPermission")
public class BluetoothTransferPlugin extends Plugin {
    private static final String TAG = "BluetoothTransferPlugin";
    private static final String SERVICE_NAME = "SpendlyShare";
    private static final UUID SPENDLY_UUID = UUID.fromString("fa87c0d0-afac-11de-8a39-0800200c9a66");

    private static final byte STATUS_READY = 0x01;
    private static final byte STATUS_REJECT = 0x15;
    private static final byte STATUS_COMPLETE = 0x06;

    private BluetoothAdapter bluetoothAdapter;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private BluetoothServerSocket serverSocket;
    private BluetoothSocket activeServerSocket;
    private BluetoothSocket activeClientSocket;

    private BroadcastReceiver discoveryReceiver;
    private boolean isDiscovering = false;

    @Override
    public void load() {
        super.load();
        BluetoothManager bluetoothManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) {
            bluetoothAdapter = bluetoothManager.getAdapter();
        }
    }

    @PluginMethod
    public void checkBluetoothState(PluginCall call) {
        JSObject ret = new JSObject();
        if (bluetoothAdapter == null) {
            ret.put("supported", false);
            ret.put("enabled", false);
            ret.put("hasPermissions", false);
            call.resolve(ret);
            return;
        }

        ret.put("supported", true);
        ret.put("enabled", bluetoothAdapter.isEnabled());
        ret.put("hasPermissions", hasRequiredPermissions());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasRequiredPermissions()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAlias("bluetooth", call, "permissionCallback");
        } else {
            requestPermissionForAlias("location", call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasRequiredPermissions());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBluetoothEnable(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device.");
            return;
        }

        if (bluetoothAdapter.isEnabled()) {
            JSObject ret = new JSObject();
            ret.put("enabled", true);
            call.resolve(ret);
            return;
        }

        Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
        startActivityForResult(call, enableBtIntent, "enableBluetoothResult");
    }

    @ActivityCallback
    private void enableBluetoothResult(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        ret.put("enabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (!ensureReady(call)) return;

        JSArray devicesArray = new JSArray();
        Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
        if (pairedDevices != null) {
            for (BluetoothDevice device : pairedDevices) {
                JSObject dev = new JSObject();
                dev.put("name", device.getName() != null ? device.getName() : "Unknown Device");
                dev.put("address", device.getAddress());
                dev.put("bonded", true);
                devicesArray.put(dev);
            }
        }

        JSObject ret = new JSObject();
        ret.put("devices", devicesArray);
        call.resolve(ret);
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (!ensureReady(call)) return;

        stopDiscoveryInternal();

        if (bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }

        discoveryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                    BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    if (device != null) {
                        JSObject dev = new JSObject();
                        dev.put("name", device.getName() != null ? device.getName() : "Unknown Device");
                        dev.put("address", device.getAddress());
                        dev.put("bonded", device.getBondState() == BluetoothDevice.BOND_BONDED);
                        notifyListeners("deviceDiscovered", dev);
                    }
                } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                    isDiscovering = false;
                    JSObject fin = new JSObject();
                    fin.put("finished", true);
                    notifyListeners("discoveryFinished", fin);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        getContext().registerReceiver(discoveryReceiver, filter);

        boolean started = bluetoothAdapter.startDiscovery();
        isDiscovering = started;

        JSObject ret = new JSObject();
        ret.put("started", started);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        stopDiscoveryInternal();
        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    private void stopDiscoveryInternal() {
        try {
            if (bluetoothAdapter != null && bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
        } catch (Exception ignored) {}

        if (discoveryReceiver != null) {
            try {
                getContext().unregisterReceiver(discoveryReceiver);
            } catch (Exception ignored) {}
            discoveryReceiver = null;
        }
        isDiscovering = false;
    }

    @PluginMethod
    public void makeDiscoverable(PluginCall call) {
        if (!ensureReady(call)) return;
        int duration = call.getInt("duration", 120);

        Intent discoverableIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
        discoverableIntent.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, duration);
        startActivityForResult(call, discoverableIntent, "discoverableResult");
    }

    @ActivityCallback
    private void discoverableResult(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        ret.put("discoverable", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void startServer(PluginCall call) {
        if (!ensureReady(call)) return;

        stopServerInternal();

        executor.execute(() -> {
            try {
                serverSocket = bluetoothAdapter.listenUsingInsecureRfcommWithServiceRecord(SERVICE_NAME, SPENDLY_UUID);
                Log.d(TAG, "Server socket listening on UUID: " + SPENDLY_UUID);

                JSObject readyObj = new JSObject();
                readyObj.put("listening", true);
                readyObj.put("localDeviceName", bluetoothAdapter.getName());
                readyObj.put("localDeviceAddress", bluetoothAdapter.getAddress());
                notifyListeners("serverReady", readyObj);

                activeServerSocket = serverSocket.accept();
                Log.d(TAG, "Incoming connection accepted from: " + activeServerSocket.getRemoteDevice().getName());

                InputStream in = activeServerSocket.getInputStream();

                // Read 4-byte length header
                byte[] lenBytes = new byte[4];
                int readHeader = readFully(in, lenBytes, 0, 4);
                if (readHeader < 4) {
                    throw new Exception("Incomplete transfer header.");
                }
                int totalSize = ByteBuffer.wrap(lenBytes).getInt();
                if (totalSize <= 0 || totalSize > 50 * 1024 * 1024) {
                    throw new Exception("Invalid payload size: " + totalSize);
                }

                // Read sender device name length (2 bytes) + string
                byte[] nameLenBytes = new byte[2];
                readFully(in, nameLenBytes, 0, 2);
                int nameLen = ByteBuffer.wrap(nameLenBytes).getShort();
                byte[] nameBytes = new byte[nameLen];
                readFully(in, nameBytes, 0, nameLen);
                String senderName = new String(nameBytes, StandardCharsets.UTF_8);

                JSObject connObj = new JSObject();
                connObj.put("senderName", senderName);
                connObj.put("senderAddress", activeServerSocket.getRemoteDevice().getAddress());
                connObj.put("totalSize", totalSize);
                notifyListeners("incomingConnection", connObj);

            } catch (Exception e) {
                Log.e(TAG, "Server accept error", e);
                JSObject err = new JSObject();
                err.put("error", e.getMessage());
                notifyListeners("serverError", err);
            }
        });

        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void acceptTransfer(PluginCall call) {
        if (activeServerSocket == null || !activeServerSocket.isConnected()) {
            call.reject("No active incoming connection to accept.");
            return;
        }

        executor.execute(() -> {
            try {
                OutputStream out = activeServerSocket.getOutputStream();
                InputStream in = activeServerSocket.getInputStream();

                // Send READY byte to sender
                out.write(STATUS_READY);
                out.flush();

                // Read 4-byte length
                byte[] lenBytes = new byte[4];
                readFully(in, lenBytes, 0, 4);
                int totalBytes = ByteBuffer.wrap(lenBytes).getInt();

                ByteArrayOutputStream buffer = new ByteArrayOutputStream(totalBytes);
                byte[] chunk = new byte[4096];
                int totalRead = 0;

                while (totalRead < totalBytes) {
                    int toRead = Math.min(chunk.length, totalBytes - totalRead);
                    int read = in.read(chunk, 0, toRead);
                    if (read == -1) break;
                    buffer.write(chunk, 0, read);
                    totalRead += read;

                    int percentage = (int) (((double) totalRead / totalBytes) * 100);
                    JSObject progressObj = new JSObject();
                    progressObj.put("bytesTransferred", totalRead);
                    progressObj.put("totalBytes", totalBytes);
                    progressObj.put("percentage", percentage);
                    notifyListeners("transferProgress", progressObj);
                }

                if (totalRead < totalBytes) {
                    throw new Exception("Connection lost before transfer completed.");
                }

                // Send COMPLETE byte
                out.write(STATUS_COMPLETE);
                out.flush();

                String jsonStr = buffer.toString(StandardCharsets.UTF_8.name());
                JSONObject jsonPayload = new JSONObject(jsonStr);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("payload", JSObject.fromJSONObject(jsonPayload));
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Error receiving transfer payload", e);
                call.reject("Transfer failed: " + e.getMessage());
            } finally {
                stopServerInternal();
            }
        });
    }

    @PluginMethod
    public void rejectTransfer(PluginCall call) {
        if (activeServerSocket != null) {
            try {
                OutputStream out = activeServerSocket.getOutputStream();
                out.write(STATUS_REJECT);
                out.flush();
            } catch (Exception ignored) {}
        }
        stopServerInternal();
        JSObject ret = new JSObject();
        ret.put("rejected", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        stopServerInternal();
        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    private void stopServerInternal() {
        try {
            if (activeServerSocket != null) {
                activeServerSocket.close();
                activeServerSocket = null;
            }
        } catch (Exception ignored) {}

        try {
            if (serverSocket != null) {
                serverSocket.close();
                serverSocket = null;
            }
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void sendData(PluginCall call) {
        if (!ensureReady(call)) return;

        String address = call.getString("address");
        JSObject payloadObj = call.getObject("payload");

        if (address == null || payloadObj == null) {
            call.reject("Device address and payload are required.");
            return;
        }

        stopDiscoveryInternal();

        executor.execute(() -> {
            BluetoothSocket clientSocket = null;
            try {
                BluetoothDevice targetDevice = bluetoothAdapter.getRemoteDevice(address);
                if (targetDevice == null) {
                    call.reject("Target device not found.");
                    return;
                }

                clientSocket = targetDevice.createInsecureRfcommSocketToServiceRecord(SPENDLY_UUID);
                activeClientSocket = clientSocket;

                Log.d(TAG, "Connecting to target device: " + address);
                clientSocket.connect();
                Log.d(TAG, "Connected to: " + address);

                OutputStream out = clientSocket.getOutputStream();
                InputStream in = clientSocket.getInputStream();

                byte[] payloadBytes = payloadObj.toString().getBytes(StandardCharsets.UTF_8);
                int totalSize = payloadBytes.length;

                // Send 4-byte length
                byte[] lenBytes = ByteBuffer.allocate(4).putInt(totalSize).array();
                out.write(lenBytes);

                // Send device name length (2 bytes) + device name string
                String myName = bluetoothAdapter.getName() != null ? bluetoothAdapter.getName() : "Spendly Device";
                byte[] myNameBytes = myName.getBytes(StandardCharsets.UTF_8);
                byte[] nameLenBytes = ByteBuffer.allocate(2).putShort((short) myNameBytes.length).array();
                out.write(nameLenBytes);
                out.write(myNameBytes);
                out.flush();

                // Wait for receiver acceptance handshake byte
                int response = in.read();
                if (response == STATUS_REJECT) {
                    call.reject("Transfer was rejected by the receiving device.");
                    return;
                } else if (response != STATUS_READY) {
                    call.reject("Transfer handshake failed with status code: " + response);
                    return;
                }

                // Send length header again for body payload
                out.write(lenBytes);
                out.flush();

                // Stream payload bytes in chunks
                int chunkSize = 4096;
                int offset = 0;

                while (offset < totalSize) {
                    int length = Math.min(chunkSize, totalSize - offset);
                    out.write(payloadBytes, offset, length);
                    offset += length;
                    out.flush();

                    int percentage = (int) (((double) offset / totalSize) * 100);
                    JSObject progressObj = new JSObject();
                    progressObj.put("bytesTransferred", offset);
                    progressObj.put("totalBytes", totalSize);
                    progressObj.put("percentage", percentage);
                    notifyListeners("transferProgress", progressObj);
                }

                // Wait for completion ACK
                int ack = in.read();
                if (ack != STATUS_COMPLETE) {
                    call.reject("Receiver did not acknowledge complete transfer.");
                    return;
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("bytesSent", totalSize);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Error sending data", e);
                call.reject("Failed to send data: " + e.getMessage());
            } finally {
                try {
                    if (clientSocket != null) {
                        clientSocket.close();
                    }
                } catch (Exception ignored) {}
                activeClientSocket = null;
            }
        });
    }

    @PluginMethod
    public void cancelTransfer(PluginCall call) {
        try {
            if (activeClientSocket != null) {
                activeClientSocket.close();
                activeClientSocket = null;
            }
        } catch (Exception ignored) {}
        stopServerInternal();
        stopDiscoveryInternal();

        JSObject ret = new JSObject();
        ret.put("canceled", true);
        call.resolve(ret);
    }

    private boolean ensureReady(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported.");
            return false;
        }
        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled.");
            return false;
        }
        if (!hasRequiredPermissions()) {
            call.reject("Bluetooth permissions are not granted.");
            return false;
        }
        return true;
    }

    public boolean hasRequiredPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("bluetooth") == com.getcapacitor.PermissionState.GRANTED;
        } else {
            return getPermissionState("location") == com.getcapacitor.PermissionState.GRANTED;
        }
    }

    private int readFully(InputStream in, byte[] buffer, int offset, int length) throws Exception {
        int totalRead = 0;
        while (totalRead < length) {
            int read = in.read(buffer, offset + totalRead, length - totalRead);
            if (read == -1) break;
            totalRead += read;
        }
        return totalRead;
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        stopDiscoveryInternal();
        stopServerInternal();
        if (activeClientSocket != null) {
            try {
                activeClientSocket.close();
            } catch (Exception ignored) {}
            activeClientSocket = null;
        }
        executor.shutdownNow();
    }
}
