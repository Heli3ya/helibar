package ir.helibar.sipaad.network

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Network Module for SIPAAD Client
 */
object NetworkModule {

    private const val DEFAULT_BASE_URL = "https://utcms.ir/ws/v2/itmb/"

    val gson: Gson by lazy {
        GsonBuilder()
            // Crucial: serializeNulls ensures optional fields send explicit null as required by SIPAAD
            .serializeNulls()
            .setLenient()
            .create()
    }

    private val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    fun provideSipaadApiService(baseUrl: String = DEFAULT_BASE_URL): SipaadApiService {
        val cleanUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(cleanUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(SipaadApiService::class.java)
    }
}
