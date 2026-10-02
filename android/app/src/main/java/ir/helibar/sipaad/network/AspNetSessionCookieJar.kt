package ir.helibar.sipaad.network

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

/**
 * Thread-safe In-Memory CookieJar to automatically persist and send ASP.NET session cookies:
 * - __AntiXsrfToken
 * - cookiesession1
 * - UTCMS
 * - ASP.NET_SessionId
 */
class AspNetSessionCookieJar : CookieJar {

    private val cookieStore: MutableMap<String, MutableList<Cookie>> = ConcurrentHashMap()

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val host = url.host
        val currentCookies = cookieStore.getOrPut(host) { mutableListOf() }
        synchronized(currentCookies) {
            for (newCookie in cookies) {
                // Remove expired or existing cookie with same name
                currentCookies.removeAll { it.name == newCookie.name }
                currentCookies.add(newCookie)
            }
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val host = url.host
        val cookies = cookieStore[host] ?: return emptyList()
        val now = System.currentTimeMillis()

        synchronized(cookies) {
            // Filter out expired cookies
            cookies.removeAll { it.expiresAt < now }
            return cookies.toList()
        }
    }

    fun clear() {
        cookieStore.clear()
    }
}
