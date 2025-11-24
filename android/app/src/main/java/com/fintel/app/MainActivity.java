package com.fintel.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        registerPlugin(SocialLoginPlugin.class);
    }
}
