package dev.personal.ntfylistener

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import java.util.Calendar

// JS(src/native/listener.ts)가 넘겨주는 설정. 휴대폰을 다시 켰을 때도 쓰려고 SharedPreferences에 저장한다.

// name: 앱에서 정한 표시 이름 (알림에 보여 준다)
data class TopicConfig(val id: String, val topic: String, val name: String, val muted: Boolean)

data class ServerConfig(
  val url: String,
  val auth: String,
  val username: String,
  val secret: String,
  val topics: List<TopicConfig>
) {
  fun authHeader(): String? = when (auth) {
    "basic" ->
      if (username.isNotEmpty() && secret.isNotEmpty())
        "Basic " + Base64.encodeToString("$username:$secret".toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
      else null
    "token" -> if (secret.isNotEmpty()) "Bearer $secret" else null
    else -> null
  }
}

data class QuietHours(val enabled: Boolean, val start: Int, val end: Int) {
  // 23시~7시처럼 자정을 넘어가는 경우도 처리한다
  fun isNow(): Boolean {
    if (!enabled || start == end) return false
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return if (start < end) hour in start until end else hour >= start || hour < end
  }
}

data class ListenerConfig(
  val servers: List<ServerConfig>,
  val quiet: QuietHours,
  val urgentBypass: Boolean
) {
  companion object {
    private const val PREFS = "ntfy_listener"
    private const val KEY = "config"

    fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(context: Context, json: String) = prefs(context).edit().putString(KEY, json).apply()

    // 저장된 설정 원문 (바뀌었는지 비교할 때 쓴다)
    fun raw(context: Context): String? = prefs(context).getString(KEY, null)

    fun clear(context: Context) = prefs(context).edit().remove(KEY).apply()

    fun load(context: Context): ListenerConfig? {
      val json = prefs(context).getString(KEY, null) ?: return null
      return try {
        parse(json)
      } catch (e: Exception) {
        null
      }
    }

    fun parse(json: String): ListenerConfig {
      val root = JSONObject(json)
      val servers = root.getJSONArray("servers")
      val list = (0 until servers.length()).map { i ->
        val s = servers.getJSONObject(i)
        val topics = s.getJSONArray("topics")
        ServerConfig(
          url = s.getString("url").trimEnd('/'),
          auth = s.optString("auth", "none"),
          username = s.optString("username", ""),
          secret = s.optString("secret", ""),
          topics = (0 until topics.length()).map { j ->
            val t = topics.getJSONObject(j)
            TopicConfig(
              t.getString("id"),
              t.getString("topic"),
              t.optString("name").ifEmpty { t.getString("topic") },
              t.optBoolean("muted", false)
            )
          }
        )
      }
      val q = root.optJSONObject("quiet")
      return ListenerConfig(
        servers = list.filter { it.topics.isNotEmpty() },
        quiet = QuietHours(q?.optBoolean("enabled") ?: false, q?.optInt("start", 23) ?: 23, q?.optInt("end", 7) ?: 7),
        urgentBypass = root.optBoolean("urgentBypass", true)
      )
    }
  }
}
