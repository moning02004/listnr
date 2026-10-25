package dev.personal.ntfylistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// 휴대폰을 켜거나 앱이 업데이트되면, 저장된 설정이 있을 때 서비스를 다시 시작한다
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    val config = ListenerConfig.load(context) ?: return
    if (config.servers.isNotEmpty()) ListenerService.start(context)
  }
}
