package com.rendezvousil.app.ui.songs

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.focus.FocusRequester
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.ui.platform.LocalContext
import com.rendezvousil.app.songs.SongOcrDocument
import com.rendezvousil.app.songs.SongOcrStore
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.dto.SongPackSummary
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongPacksScreen(
    viewModel: SongPacksViewModel,
    onBack: () -> Unit,
    onOpenPack: (packId: String, packName: String) -> Unit,
    onOpenSong: ((packId: String, packName: String, itemId: String) -> Unit)? = null,
    onBuildPacks: (() -> Unit)? = null,
    onPickSong: ((com.rendezvousil.core.network.dto.SongPackItem) -> Unit)? = null,
    pickedItemIds: Set<String> = emptySet(),
    modifier: Modifier = Modifier,
) {
    val state by viewModel.listState.collectAsStateWithLifecycle()

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Songs") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (onBuildPacks != null) {
                        TextButton(onClick = onBuildPacks) {
                            Text("Build")
                        }
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (state.packs.isNotEmpty() || state.searchQuery.isNotBlank()) {
                val searchFocus = remember { FocusRequester() }
                LaunchedEffect(Unit) {
                    searchFocus.requestFocus()
                }
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = viewModel::setPackSearchQuery,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .focusRequester(searchFocus),
                    singleLine = true,
                    label = { Text("Search songs or packs") },
                )
            }
            when {
                state.isLoading && state.packs.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
                state.errorMessage != null && state.packs.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(Icons.Default.MusicNote, contentDescription = null, tint = BrandColors.Lake)
                        Text(
                            text = state.errorMessage ?: "Songs unavailable",
                            modifier = Modifier.padding(top = 12.dp),
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        TextButton(onClick = { viewModel.refreshPacks() }) {
                            Text("Try again")
                        }
                    }
                }
                state.packs.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(Icons.Default.MusicNote, contentDescription = null, tint = BrandColors.Lake)
                        Text(
                            text = "No song packs yet",
                            modifier = Modifier.padding(top = 12.dp),
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            text = "Full song books and event packs will show up here when published.",
                            modifier = Modifier.padding(top = 8.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                state.filteredPacks.isEmpty() && state.songHits.isEmpty() && state.searchQuery.isNotBlank() && !state.isSearchingSongs -> {
                    Text(
                        text = "No songs match “${state.searchQuery}”.",
                        modifier = Modifier.padding(24.dp),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                else -> {
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        if (state.songHits.isNotEmpty()) {
                            item {
                                Text(
                                    text = "Songs",
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = BrandColors.Lake,
                                )
                            }
                            itemsIndexed(state.songHits, key = { _, hit -> hit.item_id }) { _, hit ->
                                ListItem(
                                    headlineContent = { Text(hit.title) },
                                    supportingContent = { Text(hit.pack_name) },
                                    modifier = Modifier.clickable {
                                        if (onOpenSong != null) {
                                            onOpenSong(hit.pack_id, hit.pack_name, hit.item_id)
                                        } else {
                                            onOpenPack(hit.pack_id, hit.pack_name)
                                        }
                                    },
                                )
                            }
                        }
                        if (state.songBooks.isNotEmpty()) {
                            item {
                                Text(
                                    text = "Song books",
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = BrandColors.Lake,
                                )
                            }
                            itemsIndexed(state.songBooks, key = { _, pack -> pack.id }) { _, pack ->
                                PackListRow(pack, fallback = "Full song book") {
                                    onOpenPack(pack.id, pack.name)
                                }
                            }
                        }
                        if (state.eventPacks.isNotEmpty()) {
                            item {
                                Text(
                                    text = "Packs",
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = BrandColors.Lake,
                                )
                            }
                            itemsIndexed(state.eventPacks, key = { _, pack -> "e-${pack.id}" }) { _, pack ->
                                PackListRow(pack, fallback = null) {
                                    onOpenPack(pack.id, pack.name)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PackListRow(
    pack: SongPackSummary,
    fallback: String?,
    onClick: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(pack.name) },
        supportingContent = {
            val desc = pack.description?.takeIf { it.isNotBlank() } ?: fallback
            Text(
                buildString {
                    if (desc != null) append(desc).append("\n")
                    append("${pack.item_count ?: 0} songs")
                },
            )
        },
        modifier = Modifier.clickable(onClick = onClick),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongPackDetailScreen(
    packId: String,
    packName: String,
    viewModel: SongPacksViewModel,
    onBack: () -> Unit,
    onOpenSong: (index: Int) -> Unit,
    startItemId: String? = null,
    onPickSong: ((com.rendezvousil.core.network.dto.SongPackItem) -> Unit)? = null,
    pickedItemIds: Set<String> = emptySet(),
    modifier: Modifier = Modifier,
) {
    val state by viewModel.detailState.collectAsStateWithLifecycle()
    var didAutoOpen by androidx.compose.runtime.remember(packId, startItemId) {
        androidx.compose.runtime.mutableStateOf(false)
    }

    androidx.compose.runtime.LaunchedEffect(packId) {
        viewModel.loadPack(packId)
    }

    androidx.compose.runtime.LaunchedEffect(state.pack?.id, startItemId, didAutoOpen) {
        if (didAutoOpen) return@LaunchedEffect
        val id = startItemId ?: return@LaunchedEffect
        val pack = state.pack ?: return@LaunchedEffect
        val index = pack.items.indexOfFirst { it.id == id }
        if (index >= 0) {
            didAutoOpen = true
            onOpenSong(index)
        }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(packName) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        when {
            state.isLoading && state.pack == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator() }
            }
            state.errorMessage != null && state.pack == null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(state.errorMessage ?: "Couldn’t load pack")
                    TextButton(onClick = { viewModel.loadPack(packId) }) {
                        Text("Try again")
                    }
                }
            }
            else -> {
                val pack = state.pack ?: return@Scaffold
                val filtered = state.filteredItems
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
                    OutlinedTextField(
                        value = state.searchQuery,
                        onValueChange = viewModel::setSongSearchQuery,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        singleLine = true,
                        label = { Text("Search songs") },
                    )
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        item {
                            ListItem(
                                headlineContent = {
                                    Text(
                                        if (state.downloadedCount >= pack.items.size && pack.items.isNotEmpty()) {
                                            "Downloaded for offline use"
                                        } else {
                                            "${state.downloadedCount} of ${pack.items.size} downloaded"
                                        },
                                    )
                                },
                                supportingContent = {
                                    state.statusMessage?.let { Text(it) }
                                },
                                trailingContent = {
                                    if (state.isDownloading) {
                                        CircularProgressIndicator()
                                    } else {
                                        Button(onClick = { viewModel.downloadCurrentPack() }) {
                                            Icon(Icons.Default.Download, contentDescription = null)
                                            Text("Download", modifier = Modifier.padding(start = 8.dp))
                                        }
                                    }
                                },
                            )
                        }
                        if (!pack.description.isNullOrBlank()) {
                            item {
                                Text(
                                    text = pack.description.orEmpty(),
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                        if (filtered.isEmpty() && state.searchQuery.isNotBlank()) {
                            item {
                                Text(
                                    text = "No songs match “${state.searchQuery}”.",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        } else {
                            itemsIndexed(filtered, key = { _, item -> item.id }) { _, item ->
                                val fullIndex = pack.items.indexOfFirst { it.id == item.id }
                                val downloaded = viewModel.store().isDownloaded(pack.id, item)
                                val already = item.id in pickedItemIds
                                ListItem(
                                    headlineContent = { Text(item.title) },
                                    supportingContent = {
                                        val verses = item.verse_count
                                        if (verses != null && verses > 0) {
                                            Text(
                                                if (verses == 1) "1 verse" else "$verses verses",
                                            )
                                        }
                                    },
                                    trailingContent = {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            when {
                                                already -> Text(
                                                    "Added",
                                                    color = BrandColors.Lake,
                                                    style = MaterialTheme.typography.labelMedium,
                                                )
                                                onPickSong != null -> TextButton(
                                                    onClick = { onPickSong(item) },
                                                ) { Text("Add") }
                                            }
                                            if (downloaded) {
                                                Icon(
                                                    Icons.Default.CheckCircle,
                                                    contentDescription = "Downloaded",
                                                    tint = BrandColors.Lake,
                                                )
                                            }
                                        }
                                    },
                                    modifier = Modifier.clickable {
                                        if (fullIndex >= 0) onOpenSong(fullIndex)
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongItemViewerScreen(
    packId: String,
    startIndex: Int,
    viewModel: SongPacksViewModel,
    onBack: () -> Unit,
    onPickSong: ((com.rendezvousil.core.network.dto.SongPackItem) -> Unit)? = null,
    pickedItemIds: Set<String> = emptySet(),
    modifier: Modifier = Modifier,
) {
    val state by viewModel.detailState.collectAsStateWithLifecycle()
    val items = state.pack?.items.orEmpty()
    var index by remember(startIndex, items.size) {
        mutableIntStateOf(startIndex.coerceIn(0, (items.size - 1).coerceAtLeast(0)))
    }
    var displayMode by remember { mutableStateOf("slides") } // slides | text
    var ocrDoc by remember { mutableStateOf<SongOcrDocument?>(null) }
    var ocrLoading by remember { mutableStateOf(false) }
    var downloadTick by remember { mutableIntStateOf(0) }

    LaunchedEffect(packId) {
        if (state.pack?.id != packId) {
            viewModel.loadPack(packId)
        }
    }

    if (items.isEmpty()) {
        Scaffold(
            modifier = modifier,
            topBar = {
                TopAppBar(
                    title = { Text("Song") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                )
            },
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text("Loading songs…")
            }
        }
        return
    }

    val item = items[index]
    val context = LocalContext.current
    val ocr = remember(context) { SongOcrStore(context) }

    LaunchedEffect(item.id, displayMode) {
        if (displayMode == "text" && !item.ocr_url.isNullOrBlank()) {
            ocrLoading = true
            ocrDoc = ocr.load(item.id, item.ocr_url)
            ocrLoading = false
        }
        if (displayMode == "slides" && !viewModel.store().isDownloaded(packId, item)) {
            viewModel.ensureItemDownloaded(packId, item.id)
            downloadTick++
        }
    }

    val local = viewModel.store().localFile(packId, item).takeIf { it.isFile }
    // downloadTick forces recomposition after on-demand download
    @Suppress("UNUSED_EXPRESSION")
    downloadTick
    val textPages = ocrDoc?.let { ocr.displayPages(it) }.orEmpty()

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(item.title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (onPickSong != null) {
                        if (item.id in pickedItemIds) {
                            Text(
                                "Added",
                                modifier = Modifier.padding(horizontal = 16.dp),
                                color = BrandColors.Lake,
                                style = MaterialTheme.typography.labelLarge,
                            )
                        } else {
                            TextButton(onClick = { onPickSong(item) }) {
                                Text("Add to set")
                            }
                        }
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (!item.ocr_url.isNullOrBlank()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = displayMode == "slides",
                        onClick = { displayMode = "slides" },
                        label = { Text("Slides") },
                    )
                    FilterChip(
                        selected = displayMode == "text",
                        onClick = { displayMode = "text" },
                        label = { Text("Text") },
                    )
                }
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .background(if (displayMode == "text") MaterialTheme.colorScheme.background else Color.Black),
                contentAlignment = Alignment.Center,
            ) {
                when {
                    displayMode == "text" -> {
                        when {
                            ocrLoading -> CircularProgressIndicator()
                            textPages.isEmpty() -> Text("No text yet for this song.")
                            else -> LazyColumn(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(20.dp),
                            ) {
                                items(textPages.size) { i ->
                                    val (pageIndex, text, label) = textPages[i]
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(
                                            text = label,
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Text(text, style = MaterialTheme.typography.bodyLarge)
                                    }
                                }
                            }
                        }
                    }
                    local == null -> {
                        CircularProgressIndicator(color = Color.White)
                    }
                    item.file_type == "pdf" -> PdfPagesViewer(
                        file = local,
                        versePages = item.verse_pages,
                        verseCount = item.verse_count,
                        pageCountHint = item.page_count,
                    )
                    else -> ZoomableImageFile(file = local)
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(
                    onClick = {
                        index = (index - 1).coerceAtLeast(0)
                        ocrDoc = null
                    },
                    enabled = index > 0,
                ) { Text("Previous") }
                Text("${index + 1} / ${items.size}")
                TextButton(
                    onClick = {
                        index = (index + 1).coerceAtMost(items.lastIndex)
                        ocrDoc = null
                    },
                    enabled = index < items.lastIndex,
                ) { Text("Next") }
            }
        }
    }
}

@Composable
private fun ZoomableImageFile(file: File) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }

    AsyncImage(
        model = file,
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(1f, 5f)
                    offsetX += pan.x
                    offsetY += pan.y
                }
            }
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                translationX = offsetX
                translationY = offsetY
            },
    )
}

@Composable
private fun PdfPagesViewer(
    file: File,
    versePages: List<Int>? = null,
    verseCount: Int? = null,
    pageCountHint: Int? = null,
) {
    var pageCount by remember { mutableIntStateOf(0) }
    var pageIndex by remember(file.path) { mutableIntStateOf(0) }
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }

    val jumpTargets = remember(versePages, verseCount, pageCountHint, pageCount) {
        when {
            !versePages.isNullOrEmpty() -> versePages
            (verseCount ?: 0) > 1 && (pageCountHint ?: pageCount) > (verseCount ?: 0) -> {
                val verses = verseCount!!
                val total = pageCountHint ?: pageCount
                val musicStart = 1
                val musicPages = (total - musicStart).coerceAtLeast(1)
                (0 until verses).map { v -> musicStart + (v * musicPages) / verses }
            }
            else -> emptyList()
        }
    }

    DisposableEffect(file, pageIndex) {
        val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val renderer = PdfRenderer(descriptor)
        pageCount = renderer.pageCount
        if (pageIndex in 0 until renderer.pageCount) {
            renderer.openPage(pageIndex).use { page ->
                val bmp = Bitmap.createBitmap(
                    page.width * 2,
                    page.height * 2,
                    Bitmap.Config.ARGB_8888,
                )
                page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                bitmap = bmp
            }
        }
        onDispose {
            renderer.close()
            descriptor.close()
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            bitmap?.let {
                Image(
                    bitmap = it.asImageBitmap(),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit,
                )
            }
        }
        if (jumpTargets.size > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Verse", color = Color.White)
                jumpTargets.forEachIndexed { offset, page ->
                    val verse = offset + 1
                    TextButton(onClick = {
                        pageIndex = page.coerceIn(0, (pageCount - 1).coerceAtLeast(0))
                    }) {
                        Text("$verse")
                    }
                }
            }
        }
        if (pageCount > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(
                    onClick = { pageIndex = (pageIndex - 1).coerceAtLeast(0) },
                    enabled = pageIndex > 0,
                ) { Text("Prev page") }
                Text("Page ${pageIndex + 1} / $pageCount", color = Color.White)
                TextButton(
                    onClick = { pageIndex = (pageIndex + 1).coerceAtMost(pageCount - 1) },
                    enabled = pageIndex < pageCount - 1,
                ) { Text("Next page") }
            }
        }
    }
}
