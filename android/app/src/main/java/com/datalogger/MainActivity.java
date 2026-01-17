package com.datalogger;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class MainActivity extends ReactActivity {
  @Override
  protected String getMainComponentName() {
    return "Datalogger";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this, getMainComponentName(), DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }
}
