package com.rendezvousil.app.ui.chat

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.ByteArrayOutputStream
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.SentimentSatisfied
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.rendezvousil.app.chat.ChatFormatting
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.dto.ChatMessage
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ChatThreadScreen(
    viewModel: ChatThreadViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(ChatThreadViewModel.MAX_PHOTOS),
    ) { uris ->
        if (uris.isEmpty()) return@rememberLauncherForActivityResult
        scope.launch {
            val photos = withContext(Dispatchers.IO) {
                uris.mapNotNull { uri ->
                    readPhoto(context.contentResolver, uri)
                }
            }
            viewModel.addPhotos(photos)
        }
    }

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.lastIndex)
        }
    }

    if (state.showPollSheet) {
        PollDialog(
            question = state.pollQuestion,
            options = state.pollOptions,
            onQuestionChange = viewModel::onPollQuestionChange,
            onOptionChange = viewModel::onPollOptionChange,
            onAddOption = viewModel::addPollOption,
            onRemoveOption = viewModel::removePollOption,
            onDismiss = { viewModel.setShowPollSheet(false) },
            onPost = { viewModel.createPoll() },
            isSending = state.isSending,
        )
    }

    state.enlargedPhotoUrl?.let { url ->
        Dialog(
            onDismissRequest = { viewModel.enlargePhoto(null) },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
                    .clickable { viewModel.enlargePhoto(null) },
            ) {
                AsyncImage(
                    model = url,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                )
                IconButton(
                    onClick = { viewModel.enlargePhoto(null) },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp),
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            }
        }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(state.title, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
        bottomBar = {
            ComposerBar(
                draft = state.draft,
                pendingPhotos = state.pendingPhotos,
                canModerate = state.canModerate,
                isSending = state.isSending,
                onDraftChange = viewModel::onDraftChange,
                onPickPhotos = {
                    val remaining = ChatThreadViewModel.MAX_PHOTOS - state.pendingPhotos.size
                    if (remaining > 0) {
                        photoPicker.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    }
                },
                onRemovePhoto = viewModel::removePhoto,
                onSend = { viewModel.sendMessage(isAnnouncement = false) },
                onAnnounce = { viewModel.sendMessage(isAnnouncement = true) },
                onPoll = { viewModel.setShowPollSheet(true) },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (state.realtimeStatus == ChatRealtimeStatus.Unavailable) {
                StatusBanner("Live updates unavailable — pull to refresh or send a message.")
            }
            if (state.canModerate) {
                Text(
                    text = "You can moderate this chat",
                    style = MaterialTheme.typography.labelMedium,
                    color = BrandColors.Lake,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                )
            }
            state.errorMessage?.let { error ->
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }

            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = {
                    scope.launch {
                        isRefreshing = true
                        viewModel.refresh()
                        isRefreshing = false
                    }
                },
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    state.isLoading && state.messages.isEmpty() -> {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            CircularProgressIndicator(color = BrandColors.Lake)
                        }
                    }
                    state.messages.isEmpty() -> {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text = "Start the conversation in ${state.title}.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(24.dp),
                            )
                        }
                    }
                    else -> {
                        LazyColumn(
                            state = listState,
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            items(state.messages, key = { it.id }) { message ->
                                MessageBubble(
                                    message = message,
                                    isMine = state.currentUserId.isNotEmpty() &&
                                        message.sender_clerk_id == state.currentUserId,
                                    canDelete = (state.currentUserId.isNotEmpty() &&
                                        message.sender_clerk_id == state.currentUserId) ||
                                        state.canModerate,
                                    reactionEmojis = viewModel.reactionEmojis,
                                    onVote = viewModel::vote,
                                    onToggleReaction = viewModel::toggleReaction,
                                    onDelete = viewModel::deleteMessage,
                                    onPhotoClick = viewModel::enlargePhoto,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusBanner(text: String) {
    Surface(color = BrandColors.WarmSurface, modifier = Modifier.fillMaxWidth()) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MessageBubble(
    message: ChatMessage,
    isMine: Boolean,
    canDelete: Boolean,
    reactionEmojis: List<String>,
    onVote: (String, Int) -> Unit,
    onToggleReaction: (String, String) -> Unit,
    onDelete: (String) -> Unit,
    onPhotoClick: (String) -> Unit,
) {
    val background = when {
        message.is_announcement -> Color(0xFFFFE0B2).copy(alpha = 0.7f)
        message.isPoll -> BrandColors.Lake.copy(alpha = 0.12f)
        isMine -> BrandColors.Lake.copy(alpha = 0.18f)
        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
    }

    Row(modifier = Modifier.fillMaxWidth()) {
        if (isMine) Spacer(modifier = Modifier.weight(1f))
        Column(
            modifier = Modifier
                .widthIn(max = 320.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(background)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalAlignment = if (isMine) Alignment.End else Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (message.is_announcement) {
                    Icon(Icons.Default.Campaign, null, tint = Color(0xFFE65100), modifier = Modifier.size(14.dp))
                }
                if (message.isPoll) {
                    Icon(Icons.Default.BarChart, null, tint = BrandColors.Lake, modifier = Modifier.size(14.dp))
                }
                Text(
                    text = message.sender_display_name,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = ChatFormatting.relativeTime(message.created_at),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (canDelete) {
                    IconButton(
                        onClick = { onDelete(message.id) },
                        modifier = Modifier.size(28.dp),
                    ) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Delete",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            val urls = message.photoUrls
            if (urls.isNotEmpty()) {
                val columns = if (urls.size == 1) 1 else 2
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    maxItemsInEachRow = columns,
                ) {
                    urls.forEach { url ->
                        AsyncImage(
                            model = url,
                            contentDescription = "Enlarge photo",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(if (urls.size == 1) 220.dp else 140.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { onPhotoClick(url) },
                        )
                    }
                }
            }

            if (message.isPoll && !message.poll_options.isNullOrEmpty()) {
                PollCard(message = message, onVote = onVote)
            } else if (message.body.isNotBlank()) {
                Text(
                    text = message.body,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }

            ReactionBar(
                message = message,
                reactionEmojis = reactionEmojis,
                onToggleReaction = onToggleReaction,
            )
        }
        if (!isMine) Spacer(modifier = Modifier.weight(1f))
    }
}

@Composable
private fun PollCard(
    message: ChatMessage,
    onVote: (String, Int) -> Unit,
) {
    val options = message.poll_options.orEmpty()
    val counts = message.poll_counts ?: List(options.size) { 0 }
    val total = counts.sum()

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = message.poll_question ?: message.body,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
        )
        options.forEachIndexed { index, option ->
            val count = counts.getOrElse(index) { 0 }
            val pct = if (total > 0) ((count.toDouble() / total) * 100).roundToInt() else 0
            val selected = message.my_vote == index
            Surface(
                onClick = { onVote(message.id, index) },
                shape = RoundedCornerShape(10.dp),
                color = if (selected) BrandColors.Lake.copy(alpha = 0.22f)
                else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.06f),
                border = if (selected) {
                    androidx.compose.foundation.BorderStroke(1.dp, BrandColors.Lake)
                } else {
                    null
                },
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(option, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        text = if (total > 0) "$count · $pct%" else "$count",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Text(
            text = "$total vote${if (total == 1) "" else "s"}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ReactionBar(
    message: ChatMessage,
    reactionEmojis: List<String>,
    onToggleReaction: (String, String) -> Unit,
) {
    var menuExpanded by remember { mutableStateOf(false) }
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        message.reactionList.forEach { reaction ->
            Surface(
                onClick = { onToggleReaction(message.id, reaction.emoji) },
                shape = RoundedCornerShape(50),
                color = if (reaction.reacted_by_me) {
                    BrandColors.Lake.copy(alpha = 0.25f)
                } else {
                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                },
            ) {
                Text(
                    text = "${reaction.emoji} ${reaction.count}",
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
        }
        Box {
            IconButton(
                onClick = { menuExpanded = true },
                modifier = Modifier.size(28.dp),
            ) {
                Icon(
                    Icons.Default.SentimentSatisfied,
                    contentDescription = "Add reaction",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp),
                )
            }
            DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                reactionEmojis.forEach { emoji ->
                    DropdownMenuItem(
                        text = { Text(emoji) },
                        onClick = {
                            menuExpanded = false
                            onToggleReaction(message.id, emoji)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun ComposerBar(
    draft: String,
    pendingPhotos: List<PendingChatPhoto>,
    canModerate: Boolean,
    isSending: Boolean,
    onDraftChange: (String) -> Unit,
    onPickPhotos: () -> Unit,
    onRemovePhoto: (String) -> Unit,
    onSend: () -> Unit,
    onAnnounce: () -> Unit,
    onPoll: () -> Unit,
) {
    val canSend = draft.isNotBlank() || pendingPhotos.isNotEmpty()
    Surface(tonalElevation = 2.dp) {
        Column(modifier = Modifier.padding(top = 8.dp, bottom = 8.dp)) {
            if (pendingPhotos.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(pendingPhotos, key = { it.id }) { photo ->
                        Box {
                            AsyncImage(
                                model = photo.bytes,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(10.dp)),
                            )
                            IconButton(
                                onClick = { onRemovePhoto(photo.id) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(24.dp)
                                    .background(Color.Black.copy(alpha = 0.55f), CircleShape),
                            ) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Remove",
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp),
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                IconButton(
                    onClick = onPickPhotos,
                    enabled = pendingPhotos.size < ChatThreadViewModel.MAX_PHOTOS && !isSending,
                ) {
                    Icon(Icons.Default.Image, contentDescription = "Add photos")
                }
                OutlinedTextField(
                    value = draft,
                    onValueChange = onDraftChange,
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Message") },
                    maxLines = 4,
                )
                if (canModerate) {
                    IconButton(onClick = onPoll, enabled = !isSending) {
                        Icon(Icons.Default.BarChart, contentDescription = "Create poll")
                    }
                    IconButton(onClick = onAnnounce, enabled = canSend && !isSending) {
                        Icon(Icons.Default.Campaign, contentDescription = "Announce")
                    }
                }
                IconButton(onClick = onSend, enabled = canSend && !isSending) {
                    if (isSending) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
                    }
                }
            }
        }
    }
}

@Composable
private fun PollDialog(
    question: String,
    options: List<String>,
    onQuestionChange: (String) -> Unit,
    onOptionChange: (Int, String) -> Unit,
    onAddOption: () -> Unit,
    onRemoveOption: (Int) -> Unit,
    onDismiss: () -> Unit,
    onPost: () -> Unit,
    isSending: Boolean,
) {
    val canPost = question.isNotBlank() &&
        options.map { it.trim() }.count { it.isNotEmpty() } >= 2 &&
        !isSending

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create poll") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = question,
                    onValueChange = onQuestionChange,
                    label = { Text("Question") },
                    modifier = Modifier.fillMaxWidth(),
                )
                options.forEachIndexed { index, option ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = option,
                            onValueChange = { onOptionChange(index, it) },
                            label = { Text("Option ${index + 1}") },
                            modifier = Modifier.weight(1f),
                        )
                        if (options.size > 2) {
                            IconButton(onClick = { onRemoveOption(index) }) {
                                Icon(Icons.Default.Close, contentDescription = "Remove option")
                            }
                        }
                    }
                }
                if (options.size < 6) {
                    TextButton(onClick = onAddOption) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add option")
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onPost, enabled = canPost) { Text("Post") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}

private fun readPhoto(resolver: ContentResolver, uri: Uri): PendingChatPhoto? {
    return runCatching {
        val raw = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
        if (raw.isEmpty()) return null
        val compressed = compressChatPhoto(raw)
        PendingChatPhoto(
            id = UUID.randomUUID().toString(),
            bytes = compressed,
            mimeType = "image/jpeg",
        )
    }.getOrNull()
}

/** Downscale + JPEG compress before upload (matches iOS ~1600px / 0.82 quality). */
private fun compressChatPhoto(bytes: ByteArray, maxDimension: Int = 1600, quality: Int = 82): ByteArray {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    val longest = maxOf(bounds.outWidth, bounds.outHeight).coerceAtLeast(1)
    var sample = 1
    while (longest / sample > maxDimension * 2) sample *= 2

    val options = BitmapFactory.Options().apply { inSampleSize = sample }
    val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options) ?: return bytes
    val scale = minOf(1f, maxDimension.toFloat() / maxOf(decoded.width, decoded.height))
    val width = (decoded.width * scale).toInt().coerceAtLeast(1)
    val height = (decoded.height * scale).toInt().coerceAtLeast(1)
    val resized = if (width == decoded.width && height == decoded.height) {
        decoded
    } else {
        Bitmap.createScaledBitmap(decoded, width, height, true).also {
            if (it !== decoded) decoded.recycle()
        }
    }
    return try {
        val out = ByteArrayOutputStream()
        if (!resized.compress(Bitmap.CompressFormat.JPEG, quality, out)) bytes
        else out.toByteArray().takeIf { it.isNotEmpty() } ?: bytes
    } finally {
        resized.recycle()
    }
}
