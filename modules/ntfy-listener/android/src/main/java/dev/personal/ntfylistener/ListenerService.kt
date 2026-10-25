package dev.personal.ntfylistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

// 앱이 꺼져 있어도 ntfy 서버와 연결을 유지하면서 새 메시지를 시스템 알림으로 띄우는 서비스.
//
// 서버마다 스레드 하나가 `/토픽1,토픽2/ws` WebSocket을 열어 두고 메시지를 받는다.
// (`/json` 스트림은 nginx 같은 프록시가 HTTP/1.1에서 응답을 붙잡아 두는 경우가 있어서 WebSocket을 쓴다.
//  연결이 살아 있는지는 OkHttp가 30초마다 ping을 보내 확인하고, 응답이 없으면 끊고 다시 연결한다)
class ListenerService : Service() {

  companion object {
    private const val TAG = "NtfyListener"
    private const val FOREGROUND_ID = 1
    private const val CH_SERVICE = "ntfy_service"
    private const val CH_QUIET = "ntfy_quiet"
    private const val ACCENT = 0xFF2F7D6D.toInt()

    private val client: OkHttpClient by lazy {
      OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()
    }

    @Volatile
    var running = false
      private set

    fun start(context: Context) {
      try {
        ContextCompat.startForegroundService(context, Intent(context, ListenerService::class.java))
      } catch (e: Exception) {
        // 안드로이드 12+에서 앱이 백그라운드일 때 시작이 막히는 경우. 다음에 앱을 열면 다시 시도된다.
        Log.w(TAG, "could not start service", e)
      }
    }
  }

  private val connections = mutableListOf<Connection>()
  private lateinit var notifications: NotificationManager
  private var config: ListenerConfig? = null
  private var appliedRaw: String? = null // 지금 연결에 쓰고 있는 설정 원문

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    notifications = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    createChannels()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val cfg = ListenerConfig.load(this)
    // startForegroundService로 불렸으면 몇 초 안에 반드시 startForeground를 불러야 한다
    startInForeground(cfg)
    if (cfg == null || cfg.servers.isEmpty()) {
      stopSelf()
      return START_NOT_STICKY
    }
    // 설정이 그대로면 연결을 끊었다 다시 맺지 않는다 (앱을 열 때마다 설정을 다시 보내기 때문)
    val raw = ListenerConfig.raw(this)
    val alive = synchronized(connections) { connections.isNotEmpty() }
    if (raw == appliedRaw && alive) return START_STICKY
    config = cfg
    appliedRaw = raw
    restartConnections(cfg)
    running = true
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    synchronized(connections) {
      connections.forEach { it.shutdown() }
      connections.clear()
    }
    super.onDestroy()
  }

  // ---------- 연결 ----------

  private fun restartConnections(cfg: ListenerConfig) {
    synchronized(connections) {
      connections.forEach { it.shutdown() }
      connections.clear()
      cfg.servers.forEach { server ->
        val c = Connection(server)
        connections.add(c)
        c.start()
      }
    }
  }

  private inner class Connection(private val server: ServerConfig) : Thread("ntfy-${server.url}") {
    @Volatile private var stopped = false
    @Volatile private var socket: WebSocket? = null
    @Volatile private var retry = 0

    fun shutdown() {
      stopped = true
      interrupt()
      socket?.cancel()
    }

    override fun run() {
      while (!stopped) {
        try {
          connectOnce()
        } catch (_: InterruptedException) {
          return
        } catch (e: Exception) {
          if (stopped) return
          Log.w(TAG, "connection to ${server.url} failed: ${e.message}")
        }
        if (stopped) return
        // 2초, 4초, 8초 … 최대 60초 기다렸다가 다시 연결
        val wait = minOf(60_000L, 2_000L shl minOf(retry++, 5))
        try { Thread.sleep(wait) } catch (_: InterruptedException) { return }
      }
    }

    // 연결이 끊길 때까지 이 스레드에서 기다렸다가 돌아온다. 메시지는 OkHttp 스레드에서 처리된다.
    private fun connectOnce() {
      val topics = server.topics.joinToString(",") { it.topic }
      val since = SeenState.since(this@ListenerService, server.url)
      val url = "${server.url}/$topics/ws" + (since?.let { "?since=" + URLEncoder.encode(it, "UTF-8") } ?: "")
      val request = Request.Builder()
        .url(url)
        .header("User-Agent", "listnr")
        .apply { server.authHeader()?.let { header("Authorization", it) } }
        .build()

      val closed = CountDownLatch(1)
      val failure = AtomicReference<Throwable?>(null)
      val authFailed = AtomicReference(false)

      val ws = client.newWebSocket(request, object : WebSocketListener() {
        override fun onMessage(webSocket: WebSocket, text: String) {
          val event = try { JSONObject(text) } catch (_: Exception) { return }
          when (event.optString("event")) {
            "open" -> retry = 0
            "message", "message_delete", "message_clear" -> handle(server, event)
          }
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
          webSocket.close(1000, null)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
          closed.countDown()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
          val code = response?.code
          if (code == 401 || code == 403) authFailed.set(true)
          failure.set(if (code != null) IllegalStateException("HTTP $code") else t)
          closed.countDown()
        }
      })
      socket = ws

      try {
        // 끊길 때까지 기다린다 (shutdown()이 부르는 interrupt로도 깨어난다)
        closed.await()
      } finally {
        ws.cancel()
        socket = null
      }

      if (authFailed.get()) {
        Log.w(TAG, "${server.url}: auth failed")
        // 비밀번호가 틀렸으면 계속 두드리지 않고 길게 쉰다
        Thread.sleep(5 * 60_000L)
        return
      }
      failure.get()?.let { throw if (it is Exception) it else RuntimeException(it) }
    }
  }

  // ---------- 메시지 처리 ----------

  private fun handle(server: ServerConfig, e: JSONObject) {
    val id = e.optString("id")
    val time = e.optLong("time")
    val topicName = e.optString("topic")
    val topic = server.topics.find { it.topic == topicName } ?: return
    if (!SeenState.markSeen(this, server.url, id, time)) return // 이미 처리한 메시지

    val seq = e.optString("sequence_id").ifEmpty { id }
    val notifId = (server.url + "|" + topicName + "|" + seq).hashCode()

    when (e.optString("event")) {
      "message_delete", "message_clear" -> notifications.cancel(notifId)
      "message" -> if (!topic.muted) notify(server, topic, e, notifId)
    }
  }

  private fun notify(server: ServerConfig, topic: TopicConfig, e: JSONObject, notifId: Int) {
    val cfg = config ?: return
    val priority = e.optInt("priority", 3).coerceIn(1, 5)
    val quiet = cfg.quiet.isNow() && !(cfg.urgentBypass && priority == 5)
    val channel = if (quiet) CH_QUIET else "ntfy_p$priority"

    val title = e.optString("title").ifEmpty { topic.name }
    var text = e.optString("message")
    e.optJSONObject("attachment")?.let { a -> if (text.isEmpty()) text = "첨부 파일: " + a.optString("name") }

    // 알림을 누르면: click 주소가 있으면 그걸 열고, 없으면 앱의 그 토픽 화면을 연다
    val click = e.optString("click")
    val target = if (click.isNotEmpty()) {
      Intent(Intent.ACTION_VIEW, Uri.parse(click))
    } else {
      Intent(Intent.ACTION_VIEW, Uri.parse("listnr://topic/${topic.id}")).setPackage(packageName)
    }
    target.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val pending = PendingIntent.getActivity(
      this, notifId, target, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = NotificationCompat.Builder(this, channel)
      .setSmallIcon(R.drawable.ntfy_listener_icon)
      .setColor(ACCENT)
      .setContentTitle(title)
      .setContentText(text)
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
      .setSubText(topic.name)
      .setWhen(e.optLong("time") * 1000)
      .setShowWhen(true)
      .setAutoCancel(true)
      .setContentIntent(pending)
      .setGroup(server.url + "|" + topic.topic)
      .setPriority(
        when (priority) {
          1 -> NotificationCompat.PRIORITY_MIN
          2 -> NotificationCompat.PRIORITY_LOW
          4, 5 -> NotificationCompat.PRIORITY_HIGH
          else -> NotificationCompat.PRIORITY_DEFAULT
        }
      )

    try {
      notifications.notify(notifId, builder.build())
    } catch (ex: SecurityException) {
      Log.w(TAG, "notification permission missing", ex)
    }
  }

  // ---------- 알림 채널 ----------

  private fun createChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val list = listOf(
      NotificationChannel(CH_SERVICE, "백그라운드 연결", NotificationManager.IMPORTANCE_MIN).apply {
        description = "서버와 연결되어 있다는 표시예요. 길게 눌러 숨길 수 있어요."
        setShowBadge(false)
      },
      NotificationChannel(CH_QUIET, "방해 금지 중", NotificationManager.IMPORTANCE_LOW).apply {
        description = "방해 금지 시간에 받은 알림 (소리 없음)"
      },
      NotificationChannel("ntfy_p1", "우선순위 1 · 최소", NotificationManager.IMPORTANCE_MIN),
      NotificationChannel("ntfy_p2", "우선순위 2 · 낮음", NotificationManager.IMPORTANCE_LOW),
      NotificationChannel("ntfy_p3", "우선순위 3 · 보통", NotificationManager.IMPORTANCE_DEFAULT),
      NotificationChannel("ntfy_p4", "우선순위 4 · 높음", NotificationManager.IMPORTANCE_HIGH),
      NotificationChannel("ntfy_p5", "우선순위 5 · 긴급", NotificationManager.IMPORTANCE_HIGH).apply {
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 400)
      },
    )
    notifications.createNotificationChannels(list)
  }

  private fun startInForeground(cfg: ListenerConfig?) {
    val servers = cfg?.servers?.size ?: 0
    val topics = cfg?.servers?.sumOf { it.topics.size } ?: 0
    val open = packageManager.getLaunchIntentForPackage(packageName)
    val pending = open?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val notification: Notification = NotificationCompat.Builder(this, CH_SERVICE)
      .setSmallIcon(R.drawable.ntfy_listener_icon)
      .setColor(ACCENT)
      .setContentTitle("알림 받는 중")
      .setContentText("서버 ${servers}개 · 토픽 ${topics}개")
      .setOngoing(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setContentIntent(pending)
      .build()

    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(FOREGROUND_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(FOREGROUND_ID, notification)
    }
  }
}

// 서버별로 "어디까지 받았는지"를 저장해서, 다시 연결할 때 놓친 메시지만 받고 같은 알림을 두 번 띄우지 않는다.
private object SeenState {
  private const val MAX_SEEN = 100

  fun since(context: Context, server: String): String? {
    val time = ListenerConfig.prefs(context).getLong("time_$server", 0L)
    return if (time > 0) time.toString() else null
  }

  // 처음 보는 메시지면 기록하고 true, 이미 본 메시지면 false
  @Synchronized
  fun markSeen(context: Context, server: String, id: String, time: Long): Boolean {
    val prefs = ListenerConfig.prefs(context)
    val seen = prefs.getString("seen_$server", "")!!.split(',').filter { it.isNotEmpty() }
    if (id in seen) return false
    val next = (seen + id).takeLast(MAX_SEEN).joinToString(",")
    val lastTime = prefs.getLong("time_$server", 0L)
    prefs.edit()
      .putString("seen_$server", next)
      .putLong("time_$server", maxOf(lastTime, time))
      .apply()
    return true
  }
}
