package com.datalogger;

import android.app.Application;
import com.datalogger.BuildConfig;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeApplicationEntryPoint;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.defaults.DefaultReactHost;
import com.facebook.react.defaults.DefaultReactNativeHost;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {
  private final ReactNativeHost reactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        protected List<com.facebook.react.ReactPackage> getPackages() {
          return new PackageList(this).getPackages();
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }
      };

  private ReactHost reactHost;

  @Override
  @Deprecated
  public ReactNativeHost getReactNativeHost() {
    return reactNativeHost;
  }

  @Override
  public ReactHost getReactHost() {
    if (reactHost == null) {
      reactHost = DefaultReactHost.getDefaultReactHost(getApplicationContext(), reactNativeHost, null);
    }
    return reactHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    ReactNativeApplicationEntryPoint.loadReactNative(this);
  }
}
