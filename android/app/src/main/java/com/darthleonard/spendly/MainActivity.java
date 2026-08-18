package com.darthleonard.spendly;

import android.os.Bundle;
import com.darthleonard.spendly.plugins.bluetooth.BluetoothTransferPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothTransferPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

