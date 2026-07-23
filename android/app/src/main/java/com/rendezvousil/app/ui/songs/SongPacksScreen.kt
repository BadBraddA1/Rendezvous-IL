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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.rendezvousil.app.theme.BrandColors
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongPacksScreen(
    viewModel: SongPacksViewModel,
    onBack: () -> Unit,
    onOpenPack: (packId: String, packName: String) -> Unit,
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
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        when {
            state.isLoading && state.packs.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            state.errorMessage != null && state.packs.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
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
                        .padding(padding)
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
                        text = "When Campfire or Racket Ball packs are published, they’ll show up here for offline download.",
                        modifier = Modifier.padding(top = 8.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
                    itemsIndexed(state.packs, key = { _, pack -> pack.id }) { _, pack ->
                        ListItem(
                            headlineContent = { Text(pack.name) },
                            supportingContent = {
                                val desc = pack.description?.takeIf { it.isNotBlank() }
                                Text(
                                    buildString {
                                        if (desc != null) append(desc).append("\n")
                                        append("${pack.item_count ?: 0} songs")
                                    },
                                )
                            },
                            modifier = Modifier.clickable {
                                onOpenPack(pack.id, pack.name)
                            },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SongPackDetailScreen(
    packId: String,
    packName: String,
    viewModel: SongPacksViewModel,
    onBack: () -> Unit,
    onOpenSong: (index: Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.detailState.collectAsStateWithLifecycle()

    androidx.compose.runtime.LaunchedEffect(packId) {
        viewModel.loadPack(packId)
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
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
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
                    itemsIndexed(pack.items, key = { _, item -> item.id }) { index, item ->
                        val downloaded = viewModel.store().isDownloaded(pack.id, item)
                        ListItem(
                            headlineContent = { Text("${index + 1}. ${item.title}") },
                            trailingContent = {
                                if (downloaded) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = "Downloaded",
                                        tint = BrandColors.Lake,
                                    )
                                }
                            },
                            modifier = Modifier.clickable { onOpenSong(index) },
                        )
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
    modifier: Modifier = Modifier,
) {
    val state by viewModel.detailState.collectAsStateWithLifecycle()
    val items = state.pack?.items.orEmpty()
    var index by remember(startIndex, items.size) {
        mutableIntStateOf(startIndex.coerceIn(0, (items.size - 1).coerceAtLeast(0)))
    }

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
                Text("Needs download — go back and tap Download.")
            }
        }
    } else {
        val item = items[index]
        val local = viewModel.store().localFile(packId, item).takeIf { it.isFile }

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
                )
            },
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .background(Color.Black),
                    contentAlignment = Alignment.Center,
                ) {
                    when {
                        local == null -> {
                            Text(
                                text = "File not downloaded yet.\nGo back and tap Download.",
                                color = Color.White,
                            )
                        }
                        item.file_type == "pdf" -> PdfPagesViewer(file = local)
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
                        onClick = { index = (index - 1).coerceAtLeast(0) },
                        enabled = index > 0,
                    ) { Text("Previous") }
                    Text("${index + 1} / ${items.size}")
                    TextButton(
                        onClick = { index = (index + 1).coerceAtMost(items.lastIndex) },
                        enabled = index < items.lastIndex,
                    ) { Text("Next") }
                }
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
private fun PdfPagesViewer(file: File) {
    var pageCount by remember { mutableIntStateOf(0) }
    var pageIndex by remember { mutableIntStateOf(0) }
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }

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
