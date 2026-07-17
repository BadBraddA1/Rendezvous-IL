package com.rendezvousil.core.network

import com.rendezvousil.core.network.dto.AblyTokenResponse
import com.rendezvousil.core.network.dto.AdminDashboardResponse
import com.rendezvousil.core.network.dto.AdminMeResponse
import com.rendezvousil.core.network.dto.AdminResetPasswordBody
import com.rendezvousil.core.network.dto.AdminResetPasswordResponse
import com.rendezvousil.core.network.dto.AdminUserBanPatchBody
import com.rendezvousil.core.network.dto.AdminUserCreateBody
import com.rendezvousil.core.network.dto.AdminUserMutationResponse
import com.rendezvousil.core.network.dto.AdminUserRolePatchBody
import com.rendezvousil.core.network.dto.AdminUsersListResponse
import com.rendezvousil.core.network.dto.SimpleSuccessResponse
import com.rendezvousil.core.network.dto.AnnouncementsResponse
import com.rendezvousil.core.network.dto.ChatChannelsResponse
import com.rendezvousil.core.network.dto.ChatCreatePollBody
import com.rendezvousil.core.network.dto.ChatMessageResponse
import com.rendezvousil.core.network.dto.ChatMessagesResponse
import com.rendezvousil.core.network.dto.ChatPhotoUploadResponse
import com.rendezvousil.core.network.dto.ChatReactionBody
import com.rendezvousil.core.network.dto.ChatReactionResponse
import com.rendezvousil.core.network.dto.ChatSendMessageBody
import com.rendezvousil.core.network.dto.ChatVoteBody
import com.rendezvousil.core.network.dto.ChatVoteResponse
import com.rendezvousil.core.network.dto.CheckInFullResponse
import com.rendezvousil.core.network.dto.CheckInLookupResponse
import com.rendezvousil.core.network.dto.CheckInMutationResponse
import com.rendezvousil.core.network.dto.CheckInRegistrationSummary
import com.rendezvousil.core.network.dto.CheckInSubmitBody
import com.rendezvousil.core.network.dto.CheckInUndoResponse
import com.rendezvousil.core.network.dto.DirectoryResponse
import com.rendezvousil.core.network.dto.FamilyVolunteeringResponse
import com.rendezvousil.core.network.dto.FamilyCheckInResponse
import com.rendezvousil.core.network.dto.DirectoryYearsResponse
import com.rendezvousil.core.network.dto.FamilyDirectorySettings
import com.rendezvousil.core.network.dto.FamilyDirectorySettingsBody
import com.rendezvousil.core.network.dto.FamilyDirectorySettingsEnvelope
import com.rendezvousil.core.network.dto.FamilyDirectorySettingsResponse
import com.rendezvousil.core.network.dto.HomeBoardConfig
import com.rendezvousil.core.network.dto.MealsResponse
import com.rendezvousil.core.network.dto.RatesPayload
import com.rendezvousil.core.network.dto.ScheduleAnnouncementsResponse
import com.rendezvousil.core.network.dto.UserActivityBody
import com.rendezvousil.core.network.dto.UserActivityResponse
import com.rendezvousil.core.network.dto.VolunteerWeekResponse
import com.rendezvousil.core.network.dto.WeatherPayload
import com.rendezvousil.core.schedule.model.SchedulePayload
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface RendezvousApi {
    @GET("api/schedule")
    suspend fun getSchedule(): SchedulePayload

    @GET("api/meals")
    suspend fun getMeals(): MealsResponse

    @GET("api/volunteer-schedule")
    suspend fun getVolunteerSchedule(
        @Query("from") from: String,
        @Query("to") to: String,
    ): VolunteerWeekResponse

    @GET("api/announcements")
    suspend fun getAnnouncements(): AnnouncementsResponse

    @GET("api/announcements/schedule")
    suspend fun getScheduleAnnouncements(): ScheduleAnnouncementsResponse

    @GET("api/weather")
    suspend fun getWeather(): WeatherPayload

    @GET("api/rates")
    suspend fun getRates(@Query("year") year: Int): RatesPayload

    @GET("api/admin/me")
    suspend fun getAdminMe(): AdminMeResponse

    @POST("api/auth/activity")
    suspend fun recordUserActivity(@Body body: UserActivityBody): UserActivityResponse

    @GET("api/directory/years")
    suspend fun getDirectoryYears(): DirectoryYearsResponse

    @GET("api/directory")
    suspend fun getDirectory(@Query("year") year: Int): DirectoryResponse

    @GET("api/family/directory")
    suspend fun getFamilyDirectorySettings(): FamilyDirectorySettingsEnvelope

    @GET("api/family/volunteering")
    suspend fun getFamilyVolunteering(@Query("year") year: Int): FamilyVolunteeringResponse

    @GET("api/home-board")
    suspend fun getHomeBoard(@Query("year") year: Int): HomeBoardConfig

    @GET("api/family/check-in")
    suspend fun getFamilyCheckIn(@Query("year") year: Int): FamilyCheckInResponse
}

class ApiClient private constructor(
    val api: RendezvousApi,
    val okHttpClient: OkHttpClient,
    private val baseUrl: String,
) {
    companion object {
        val json: Json = Json {
            ignoreUnknownKeys = true
            isLenient = true
            coerceInputValues = true
        }

        fun decodeSchedulePayload(jsonText: String): SchedulePayload =
            json.decodeFromString(jsonText)

        fun create(
            baseUrl: String = AppConfig.BASE_URL,
            userAgent: String = AppConfig.USER_AGENT,
            bearerTokenProvider: (suspend () -> String?)? = null,
            enableLogging: Boolean = false,
        ): ApiClient {
            val normalizedBaseUrl = baseUrl.trimEnd('/') + "/"
            val userAgentInterceptor = Interceptor { chain ->
                val request = chain.request()
                val builder = request.newBuilder()
                    .header("User-Agent", userAgent)

                bearerTokenProvider?.let { provider ->
                    runBlocking {
                        provider()?.let { token ->
                            builder.header("Authorization", "Bearer $token")
                        }
                    }
                }

                val body = request.body
                if (body != null) {
                    val contentType = body.contentType()
                    if (contentType != null && contentType.subtype.equals("json", ignoreCase = true)) {
                        builder.header("Content-Type", contentType.toString())
                    }
                }

                chain.proceed(builder.build())
            }

            val okHttpBuilder = OkHttpClient.Builder()
                .addInterceptor(userAgentInterceptor)

            if (enableLogging) {
                okHttpBuilder.addInterceptor(
                    HttpLoggingInterceptor().apply {
                        level = HttpLoggingInterceptor.Level.BASIC
                    },
                )
            }

            val okHttpClient = okHttpBuilder.build()
            val contentType = "application/json".toMediaType()
            val retrofit = Retrofit.Builder()
                .baseUrl(normalizedBaseUrl)
                .client(okHttpClient)
                .addConverterFactory(json.asConverterFactory(contentType))
                .build()

            return ApiClient(
                api = retrofit.create(RendezvousApi::class.java),
                okHttpClient = okHttpClient,
                baseUrl = normalizedBaseUrl,
            )
        }
    }

    fun urlFor(path: String): String {
        val trimmed = path.trimStart('/')
        return baseUrl + trimmed
    }

    suspend fun getSchedule(): SchedulePayload = apiCall { api.getSchedule() }

    suspend fun getMeals(): MealsResponse = apiCall { api.getMeals() }

    suspend fun getVolunteerSchedule(
        from: String = AppConfig.VOLUNTEER_WEEK_FROM,
        to: String = AppConfig.VOLUNTEER_WEEK_TO,
    ): VolunteerWeekResponse = apiCall { api.getVolunteerSchedule(from, to) }

    suspend fun getAnnouncements(): AnnouncementsResponse = apiCall { api.getAnnouncements() }

    suspend fun getScheduleAnnouncements(): ScheduleAnnouncementsResponse =
        apiCall { api.getScheduleAnnouncements() }

    suspend fun getWeather(): WeatherPayload = apiCall { api.getWeather() }

    suspend fun getRates(year: Int = AppConfig.EVENT_YEAR): RatesPayload =
        apiCall { api.getRates(year) }

    suspend fun getAdminMe(): AdminMeResponse = apiCall { api.getAdminMe() }

    suspend fun recordUserActivity(
        platform: String = "android",
        appVersion: String,
    ): UserActivityResponse = apiCall {
        api.recordUserActivity(
            UserActivityBody(
                platform = platform,
                appVersion = appVersion,
            ),
        )
    }

    suspend fun getDirectoryYears(): DirectoryYearsResponse =
        apiCall { api.getDirectoryYears() }

    suspend fun getDirectory(year: Int): DirectoryResponse =
        apiCall { api.getDirectory(year) }

    suspend fun getFamilyVolunteering(year: Int = AppConfig.EVENT_YEAR): FamilyVolunteeringResponse =
        apiCall { api.getFamilyVolunteering(year) }

    suspend fun getHomeBoard(year: Int = AppConfig.EVENT_YEAR): HomeBoardConfig =
        apiCall { api.getHomeBoard(year) }

    suspend fun getFamilyCheckIn(year: Int = AppConfig.EVENT_YEAR): FamilyCheckInResponse =
        apiCall { api.getFamilyCheckIn(year) }

    suspend fun getFamilyDirectorySettings(): FamilyDirectorySettings {
        val envelope = apiCall { api.getFamilyDirectorySettings() }
        return envelope.settings
    }

    suspend fun updateFamilyDirectorySettings(
        directoryOptIn: Boolean,
        directoryBlurb: String?,
    ): FamilyDirectorySettingsResponse {
        val body = FamilyDirectorySettingsBody(
            directory_opt_in = directoryOptIn,
            directory_blurb = directoryBlurb,
        )
        val request = Request.Builder()
            .url(urlFor("api/family/directory"))
            .patch(json.encodeToString(body).toRequestBody("application/json".toMediaType()))
            .build()
        return executeJsonRequest(request)
    }

    suspend fun uploadFamilyDirectoryPhoto(
        bytes: ByteArray,
        filename: String,
        mimeType: String,
    ): FamilyDirectorySettingsResponse {
        val multipartBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "photo",
                filename,
                bytes.toRequestBody(mimeType.toMediaType()),
            )
            .build()

        val request = Request.Builder()
            .url(urlFor("api/family/directory"))
            .post(multipartBody)
            .build()
        return executeJsonRequest(request)
    }

    suspend fun deleteFamilyDirectoryPhoto(): FamilyDirectorySettingsResponse {
        val request = Request.Builder()
            .url(urlFor("api/family/directory"))
            .delete()
            .build()
        return executeJsonRequest(request)
    }

    suspend fun getAdminDashboard(): AdminDashboardResponse =
        getJson("api/admin/mobile/dashboard")

    suspend fun lookupCheckIn(code: String): CheckInLookupResponse {
        val url = baseUrl.toHttpUrlOrNull()!!
            .newBuilder()
            .addPathSegments("api/admin/registrations/qr")
            .addPathSegment(code.trim())
            .build()
        val request = Request.Builder()
            .url(url)
            .get()
            .build()
        return executeJsonRequest(request)
    }

    suspend fun searchCheckIn(query: String): List<CheckInRegistrationSummary> =
        getJson<CheckInSearchEnvelope>(
            path = "api/admin/registrations",
            queryParameters = mapOf("search" to query.trim()),
        ).registrations

    suspend fun loadCheckInDetails(id: Int): CheckInLookupResponse {
        val payload: CheckInFullResponse = getJson("api/admin/registrations/$id/full")
        return CheckInLookupResponse(
            registration = payload.registration,
            family_members = payload.family_members,
            tshirt_orders = payload.tshirt_orders,
        )
    }

    suspend fun submitCheckIn(
        id: Int,
        roomKeys: List<String>,
        tshirtsDistributed: Boolean,
    ): CheckInMutationResponse = postJson(
        path = "api/admin/registrations/$id/checkin",
        body = CheckInSubmitBody(
            room_keys = roomKeys,
            tshirts_distributed = tshirtsDistributed,
        ),
    )

    suspend fun undoCheckIn(id: Int): CheckInUndoResponse =
        deleteJson("api/admin/registrations/$id/checkin")

    suspend fun getAdminUsers(): AdminUsersListResponse =
        getJson("api/admin/users")

    suspend fun createAdminUser(
        email: String,
        firstName: String,
        lastName: String,
        role: String?,
        password: String?,
    ): AdminUserMutationResponse = postJson(
        path = "api/admin/users",
        body = AdminUserCreateBody(
            email = email,
            firstName = firstName.takeIf { it.isNotEmpty() },
            lastName = lastName.takeIf { it.isNotEmpty() },
            role = role,
            password = password,
        ),
    )

    suspend fun updateAdminUserRole(body: AdminUserRolePatchBody): AdminUserMutationResponse =
        patchJson("api/admin/users", body)

    suspend fun updateAdminUserBan(body: AdminUserBanPatchBody): AdminUserMutationResponse =
        patchJson("api/admin/users", body)

    suspend fun deleteAdminUser(id: String): SimpleSuccessResponse =
        deleteJson("api/admin/users/$id")

    suspend fun resetAdminUserPassword(
        userId: String,
        mode: String,
        password: String?,
    ): AdminResetPasswordResponse = postJson(
        path = "api/admin/users/$userId/reset-password",
        body = AdminResetPasswordBody(mode = mode, password = password),
    )

    suspend fun getChatChannels(): ChatChannelsResponse =
        getJson("api/chat/channels")

    suspend fun getChatMessages(channelId: String, limit: Int = 80): ChatMessagesResponse =
        getJson(
            path = "api/chat/channels/$channelId/messages",
            queryParameters = mapOf("limit" to limit.toString()),
        )

    suspend fun sendChatMessage(
        channelId: String,
        body: String,
        isAnnouncement: Boolean = false,
    ): ChatMessageResponse = postJson(
        path = "api/chat/channels/$channelId/messages",
        body = ChatSendMessageBody(body = body, is_announcement = isAnnouncement),
    )

    suspend fun uploadChatPhoto(
        channelId: String,
        bytes: ByteArray,
        mimeType: String,
        filename: String = "chat-photo.jpg",
    ): ChatPhotoUploadResponse {
        val multipart = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "photo",
                filename,
                bytes.toRequestBody(mimeType.toMediaType()),
            )
            .build()
        val request = Request.Builder()
            .url(urlFor("api/chat/channels/$channelId/photos"))
            .post(multipart)
            .build()
        return executeJsonRequest(request)
    }

    /**
     * Upload each photo separately, then send the message as JSON with image_urls.
     * Avoids Vercel 413 when multiple photos exceed the ~4.5 MB body limit.
     */
    suspend fun sendChatMessageWithPhotos(
        channelId: String,
        body: String,
        isAnnouncement: Boolean,
        photos: List<Pair<ByteArray, String>>,
    ): ChatMessageResponse {
        val imageUrls = photos.mapIndexed { index, (bytes, mime) ->
            val ext = when {
                mime.contains("png") -> "png"
                mime.contains("webp") -> "webp"
                else -> "jpg"
            }
            uploadChatPhoto(
                channelId = channelId,
                bytes = bytes,
                mimeType = mime,
                filename = "chat-photo-$index.$ext",
            ).url
        }
        return postJson(
            path = "api/chat/channels/$channelId/messages",
            body = ChatSendMessageBody(
                body = body,
                is_announcement = isAnnouncement,
                image_urls = imageUrls,
            ),
        )
    }

    suspend fun createChatPoll(
        channelId: String,
        question: String,
        options: List<String>,
    ): ChatMessageResponse = postJson(
        path = "api/chat/channels/$channelId/messages",
        body = ChatCreatePollBody(
            body = question,
            poll_question = question,
            poll_options = options,
        ),
    )

    suspend fun voteOnChatPoll(messageId: String, optionIndex: Int): ChatVoteResponse =
        postJson(
            path = "api/chat/messages/$messageId/vote",
            body = ChatVoteBody(option_index = optionIndex),
        )

    suspend fun toggleChatReaction(messageId: String, emoji: String): ChatReactionResponse =
        postJson(
            path = "api/chat/messages/$messageId/reactions",
            body = ChatReactionBody(emoji = emoji),
        )

    suspend fun deleteChatMessage(messageId: String): SimpleSuccessResponse =
        deleteJson("api/chat/messages/$messageId")

    suspend fun getAblyToken(): AblyTokenResponse =
        postJson(path = "api/ably/token", body = EmptyJsonBody())

    @kotlinx.serialization.Serializable
    private data class EmptyJsonBody(val _unused: String? = null)

    private suspend inline fun <reified T> getJson(
        path: String,
        queryParameters: Map<String, String> = emptyMap(),
    ): T {
        val urlBuilder = urlFor(path).toHttpUrlOrNull()!!.newBuilder()
        queryParameters.forEach { (key, value) ->
            urlBuilder.addQueryParameter(key, value)
        }
        val request = Request.Builder()
            .url(urlBuilder.build())
            .get()
            .build()
        return executeJsonRequest(request)
    }

    private suspend inline fun <reified T, reified Body> postJson(path: String, body: Body): T {
        val request = Request.Builder()
            .url(urlFor(path))
            .post(json.encodeToString(body).toRequestBody("application/json".toMediaType()))
            .build()
        return executeJsonRequest(request)
    }

    private suspend inline fun <reified T, reified Body> patchJson(path: String, body: Body): T {
        val request = Request.Builder()
            .url(urlFor(path))
            .patch(json.encodeToString(body).toRequestBody("application/json".toMediaType()))
            .build()
        return executeJsonRequest(request)
    }

    private suspend inline fun <reified T> deleteJson(path: String): T {
        val request = Request.Builder()
            .url(urlFor(path))
            .delete()
            .build()
        return executeJsonRequest(request)
    }

    @kotlinx.serialization.Serializable
    private data class CheckInSearchEnvelope(
        val year: Int? = null,
        val registrations: List<CheckInRegistrationSummary> = emptyList(),
    )

    private suspend inline fun <reified T> executeJsonRequest(request: Request): T =
        withContext(Dispatchers.IO) {
            okHttpClient.newCall(request).execute().use { response ->
                val bodyString = response.body?.string().orEmpty()
                if (response.code == 401) {
                    throw ApiException.Unauthorized()
                }
                if (!response.isSuccessful) {
                    throw ApiException.BadStatus(response.code)
                }
                try {
                    json.decodeFromString<T>(bodyString)
                } catch (error: SerializationException) {
                    throw ApiException.Decoding(error)
                }
            }
        }

    private suspend inline fun <T> apiCall(crossinline block: suspend () -> T): T {
        return try {
            block()
        } catch (error: HttpException) {
            when (error.code()) {
                401 -> throw ApiException.Unauthorized()
                else -> throw ApiException.BadStatus(error.code())
            }
        } catch (error: SerializationException) {
            throw ApiException.Decoding(error)
        }
    }
}
