package dev.personal.ntfylistener

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// JS에서 requireOptionalNativeModule('NtfyListener')로 부르는 모듈
class NtfyListenerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("NtfyListener")

    // 새 설정을 저장하고 서비스를 (다시) 시작한다
    Function("configure") { json: String ->
      ListenerConfig.parse(json) // 형식이 잘못됐으면 여기서 예외가 나서 JS로 전달된다
      ListenerConfig.save(context, json)
      ListenerService.start(context)
    }

    Function("stop") {
      ListenerConfig.clear(context)
      context.stopService(Intent(context, ListenerService::class.java))
    }

    Function("isRunning") {
      ListenerService.running
    }

    Function("isIgnoringBatteryOptimizations") {
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    // 아직 제외되지 않았으면 "배터리 최적화에서 제외할까요?" 창을 띄운다. 안 되면 설정 화면 목록으로.
    // 이미 제외됐으면 그 창이 뜨지 않으므로, 되돌릴 수 있게 앱 정보 화면(배터리 항목이 있는 곳)을 연다.
    Function("openBatterySettings") {
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      if (pm.isIgnoringBatteryOptimizations(context.packageName)) {
        context.startActivity(
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
      } else {
        try {
          @SuppressLint("BatteryLife")
          val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            .setData(Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
        } catch (e: Exception) {
          Log.w("NtfyListener", "battery dialog failed", e)
          context.startActivity(
            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          )
        }
      }
      Unit
    }
  }
}
