package com.rendezvousil.app

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.rendezvousil.app.di.RendezvousViewModelFactory
import com.rendezvousil.app.navigation.Routes
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.ui.admin.AdminDashboardScreen
import com.rendezvousil.app.ui.admin.AdminUsersScreen
import com.rendezvousil.app.ui.admin.AdminUsersViewModel
import com.rendezvousil.app.ui.about.AboutScreen
import com.rendezvousil.app.ui.account.AccountScreen
import com.rendezvousil.app.ui.checkin.CheckInScreen
import com.rendezvousil.app.ui.biblebowl.BibleBowlScreen
import com.rendezvousil.app.ui.calculator.CalculatorScreen
import com.rendezvousil.app.ui.chat.ChatListScreen
import com.rendezvousil.app.ui.chat.ChatListViewModel
import com.rendezvousil.app.ui.chat.ChatThreadScreen
import com.rendezvousil.app.ui.chat.ChatThreadViewModel
import com.rendezvousil.app.ui.directory.DirectoryManageScreen
import com.rendezvousil.app.ui.directory.DirectoryManageViewModel
import com.rendezvousil.app.ui.directory.DirectoryScreen
import com.rendezvousil.app.ui.directory.DirectoryViewModel
import com.rendezvousil.app.ui.faq.FAQScreen
import com.rendezvousil.app.ui.home.HomeScreen
import com.rendezvousil.app.ui.home.HomeViewModel
import com.rendezvousil.app.ui.home.VolunteeringScreen
import com.rendezvousil.app.ui.home.VolunteeringViewModel
import com.rendezvousil.app.ui.more.MoreScreen
import com.rendezvousil.app.ui.schedule.ScheduleScreen
import com.rendezvousil.app.ui.schedule.ScheduleViewModel
import com.rendezvousil.app.ui.songs.SongItemViewerScreen
import com.rendezvousil.app.ui.songs.SongPackDetailScreen
import com.rendezvousil.app.ui.songs.SongPacksScreen
import com.rendezvousil.app.ui.songs.SongPacksViewModel
import com.rendezvousil.app.ui.notifications.NotificationSettingsScreen
import com.rendezvousil.app.ui.updates.UpdatesScreen
import com.rendezvousil.app.ui.updates.UpdatesViewModel
import com.rendezvousil.app.notifications.FcmRegistrationService
import com.rendezvousil.app.notifications.NotificationPreferences
import com.rendezvousil.app.notifications.ReminderService
import com.rendezvousil.core.network.RendezvousRepository
import kotlinx.coroutines.launch

private data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
)

private val bottomNavItems = listOf(
    BottomNavItem(Routes.HOME, "Home", Icons.Default.Home),
    BottomNavItem(Routes.CHAT, "Chat", Icons.AutoMirrored.Filled.Chat),
    BottomNavItem(Routes.SCHEDULE, "Schedule", Icons.Default.CalendarMonth),
    BottomNavItem(Routes.DIRECTORY, "Directory", Icons.Default.Groups),
    BottomNavItem(Routes.MORE, "More", Icons.Default.MoreHoriz),
)

@Composable
fun RendezvousApp(
    repository: RendezvousRepository,
    appSession: AppSession,
    reminderService: ReminderService,
    notificationPreferences: NotificationPreferences,
    fcmRegistrationService: FcmRegistrationService,
    deepLinkRoute: String? = null,
    onDeepLinkConsumed: () -> Unit = {},
) {
    val navController = rememberNavController()
    val viewModelFactory = RendezvousViewModelFactory(
        repository = repository,
        appSession = appSession,
        application = androidx.compose.ui.platform.LocalContext.current.applicationContext as android.app.Application,
        reminderService = reminderService,
    )
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    LaunchedEffect(Unit) {
        launch { repository.loadScheduleBundle() }
        launch { repository.loadScheduleExtras() }
    }

    LaunchedEffect(deepLinkRoute) {
        when (deepLinkRoute) {
            Routes.SCHEDULE -> {
                navigateToTab(navController, Routes.SCHEDULE)
                onDeepLinkConsumed()
            }
            Routes.CHAT -> {
                navigateToTab(navController, Routes.CHAT)
                onDeepLinkConsumed()
            }
        }
    }

    val showBottomBar = currentRoute == null ||
        Routes.isTopLevelRoute(currentRoute) ||
        Routes.isMoreRoute(currentRoute) ||
        currentRoute == Routes.UPDATES

    Scaffold(
        bottomBar = {
            if (showBottomBar && !Routes.isChatThreadRoute(currentRoute)) {
                RendezvousBottomBar(
                    navController = navController,
                    currentRoute = currentRoute,
                )
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Routes.HOME) {
                val homeViewModel: HomeViewModel = viewModel(factory = viewModelFactory)
                HomeScreen(
                    viewModel = homeViewModel,
                    onNavigateToSchedule = { navigateToTab(navController, Routes.SCHEDULE) },
                    onNavigateToChat = { navigateToTab(navController, Routes.CHAT) },
                    onNavigateToVolunteering = { navController.navigate(Routes.MORE_VOLUNTEERING) },
                )
            }
            composable(Routes.CHAT) { entry ->
                val viewModel: ChatListViewModel = viewModel(factory = viewModelFactory)
                val refreshList by entry.savedStateHandle
                    .getStateFlow("refreshChatList", false)
                    .collectAsState()
                LaunchedEffect(refreshList) {
                    if (refreshList) {
                        viewModel.refresh()
                        entry.savedStateHandle["refreshChatList"] = false
                    }
                }
                ChatListScreen(
                    viewModel = viewModel,
                    onOpenChannel = { channel ->
                        navController.navigate(
                            Routes.chatThread(
                                channelId = channel.id,
                                title = channel.displayTitle,
                                canModerate = channel.can_moderate == true,
                            ),
                        )
                    },
                    onNavigateToAccount = { navController.navigate(Routes.MORE_ACCOUNT) },
                )
            }
            composable(
                route = Routes.CHAT_THREAD,
                arguments = listOf(
                    navArgument("channelId") { type = NavType.StringType },
                    navArgument("title") {
                        type = NavType.StringType
                        defaultValue = "Chat"
                    },
                    navArgument("canModerate") {
                        type = NavType.StringType
                        defaultValue = "false"
                    },
                ),
            ) {
                val viewModel: ChatThreadViewModel = viewModel(factory = viewModelFactory)
                ChatThreadScreen(
                    viewModel = viewModel,
                    onBack = {
                        navController.previousBackStackEntry
                            ?.savedStateHandle
                            ?.set("refreshChatList", true)
                        navController.popBackStack()
                    },
                )
            }
            composable(Routes.SCHEDULE) {
                val viewModel: ScheduleViewModel = viewModel(factory = viewModelFactory)
                ScheduleScreen(
                    viewModel = viewModel,
                    reminderService = reminderService,
                )
            }
            composable(Routes.DIRECTORY) {
                val viewModel: DirectoryViewModel = viewModel(factory = viewModelFactory)
                DirectoryScreen(
                    viewModel = viewModel,
                    onBack = null,
                    onNavigateToAccount = { navController.navigate(Routes.MORE_ACCOUNT) },
                    onNavigateToManage = { navController.navigate(Routes.MORE_DIRECTORY_MANAGE) },
                )
            }
            composable(Routes.UPDATES) {
                val viewModel: UpdatesViewModel = viewModel(factory = viewModelFactory)
                UpdatesScreen(viewModel = viewModel)
            }
            composable(Routes.MORE) {
                MoreScreen(
                    appSession = appSession,
                    onNavigateToCalculator = { navController.navigate(Routes.MORE_CALCULATOR) },
                    onNavigateToBibleBowl = { navController.navigate(Routes.MORE_BIBLE_BOWL) },
                    onNavigateToSongs = { navController.navigate(Routes.MORE_SONGS) },
                    onNavigateToFaq = { navController.navigate(Routes.MORE_FAQ) },
                    onNavigateToAbout = { navController.navigate(Routes.MORE_ABOUT) },
                    onNavigateToAdminDashboard = { navController.navigate(Routes.MORE_ADMIN_DASHBOARD) },
                    onNavigateToAdminUsers = { navController.navigate(Routes.MORE_ADMIN_USERS) },
                    onNavigateToCheckIn = { navController.navigate(Routes.MORE_CHECK_IN) },
                    onNavigateToDirectory = { navigateToTab(navController, Routes.DIRECTORY) },
                    onNavigateToDirectoryManage = { navController.navigate(Routes.MORE_DIRECTORY_MANAGE) },
                    onNavigateToVolunteering = { navController.navigate(Routes.MORE_VOLUNTEERING) },
                    onNavigateToAccount = { navController.navigate(Routes.MORE_ACCOUNT) },
                    onNavigateToNotifications = { navController.navigate(Routes.MORE_NOTIFICATIONS) },
                    onNavigateToUpdates = { navController.navigate(Routes.UPDATES) },
                )
            }
            composable(Routes.MORE_VOLUNTEERING) {
                val volunteeringViewModel: VolunteeringViewModel = viewModel(factory = viewModelFactory)
                VolunteeringScreen(
                    viewModel = volunteeringViewModel,
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Routes.MORE_CALCULATOR) {
                CalculatorScreen(
                    viewModelFactory = viewModelFactory,
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Routes.MORE_BIBLE_BOWL) {
                BibleBowlScreen(onBack = { navController.popBackStack() })
            }
            composable(Routes.MORE_SONGS) {
                val songsViewModel: SongPacksViewModel = viewModel(factory = viewModelFactory)
                SongPacksScreen(
                    viewModel = songsViewModel,
                    onBack = { navController.popBackStack() },
                    onOpenPack = { packId, packName ->
                        navController.navigate(Routes.songPack(packId, packName))
                    },
                )
            }
            composable(
                route = Routes.MORE_SONG_PACK,
                arguments = listOf(
                    navArgument("packId") { type = NavType.StringType },
                    navArgument("name") {
                        type = NavType.StringType
                        defaultValue = "Songs"
                    },
                ),
            ) { entry ->
                val packId = entry.arguments?.getString("packId").orEmpty()
                val packName = entry.arguments?.getString("name") ?: "Songs"
                val parentEntry = remember(entry) {
                    runCatching { navController.getBackStackEntry(Routes.MORE_SONGS) }.getOrNull()
                }
                val songsViewModel: SongPacksViewModel = if (parentEntry != null) {
                    viewModel(parentEntry, factory = viewModelFactory)
                } else {
                    viewModel(factory = viewModelFactory)
                }
                SongPackDetailScreen(
                    packId = packId,
                    packName = packName,
                    viewModel = songsViewModel,
                    onBack = { navController.popBackStack() },
                    onOpenSong = { index ->
                        navController.navigate(Routes.songViewer(packId, index, packName))
                    },
                )
            }
            composable(
                route = Routes.MORE_SONG_VIEWER,
                arguments = listOf(
                    navArgument("packId") { type = NavType.StringType },
                    navArgument("index") { type = NavType.IntType },
                    navArgument("name") {
                        type = NavType.StringType
                        defaultValue = "Song"
                    },
                ),
            ) { entry ->
                val packId = entry.arguments?.getString("packId").orEmpty()
                val index = entry.arguments?.getInt("index") ?: 0
                val parentEntry = remember(entry) {
                    runCatching { navController.getBackStackEntry(Routes.MORE_SONGS) }.getOrNull()
                }
                val songsViewModel: SongPacksViewModel = if (parentEntry != null) {
                    viewModel(parentEntry, factory = viewModelFactory)
                } else {
                    viewModel(factory = viewModelFactory)
                }
                SongItemViewerScreen(
                    packId = packId,
                    startIndex = index,
                    viewModel = songsViewModel,
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Routes.MORE_FAQ) {
                FAQScreen(onBack = { navController.popBackStack() })
            }
            composable(Routes.MORE_ABOUT) {
                AboutScreen(onBack = { navController.popBackStack() })
            }
            composable(Routes.MORE_DIRECTORY) {
                LaunchedEffect(Unit) {
                    navigateToTab(navController, Routes.DIRECTORY)
                }
            }
            composable(Routes.MORE_DIRECTORY_MANAGE) {
                val viewModel: DirectoryManageViewModel = viewModel(factory = viewModelFactory)
                DirectoryManageScreen(
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                    onNavigateToAccount = { navController.navigate(Routes.MORE_ACCOUNT) },
                )
            }
            composable(Routes.MORE_ACCOUNT) {
                AccountScreen(
                    appSession = appSession,
                    onBack = { navController.popBackStack() },
                    onNavigateToDirectory = { navigateToTab(navController, Routes.DIRECTORY) },
                    onNavigateToDirectoryManage = { navController.navigate(Routes.MORE_DIRECTORY_MANAGE) },
                )
            }
            composable(Routes.MORE_NOTIFICATIONS) {
                NotificationSettingsScreen(
                    reminderService = reminderService,
                    notificationPreferences = notificationPreferences,
                    fcmRegistrationService = fcmRegistrationService,
                    repository = repository,
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Routes.MORE_ADMIN_DASHBOARD) {
                AdminDashboardScreen(
                    appSession = appSession,
                    viewModelFactory = viewModelFactory,
                    onBack = { navController.popBackStack() },
                    onNavigateToUsers = { navController.navigate(Routes.MORE_ADMIN_USERS) },
                )
            }
            composable(Routes.MORE_ADMIN_USERS) {
                val viewModel: AdminUsersViewModel = viewModel(factory = viewModelFactory)
                AdminUsersScreen(
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Routes.MORE_CHECKIN) {
                CheckInScreen(
                    appSession = appSession,
                    viewModelFactory = viewModelFactory,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}

@Composable
private fun RendezvousBottomBar(
    navController: NavHostController,
    currentRoute: String?,
) {
    NavigationBar {
        bottomNavItems.forEach { item ->
            val selected = when (item.route) {
                Routes.MORE -> Routes.isMoreRoute(currentRoute)
                Routes.CHAT -> currentRoute == Routes.CHAT || Routes.isChatThreadRoute(currentRoute)
                Routes.DIRECTORY -> currentRoute == Routes.DIRECTORY ||
                    currentRoute == Routes.MORE_DIRECTORY ||
                    currentRoute == Routes.MORE_DIRECTORY_MANAGE
                else -> currentRoute == item.route
            }
            NavigationBarItem(
                selected = selected,
                onClick = {
                    if (item.route == Routes.MORE) {
                        navigateToTab(navController, Routes.MORE)
                    } else {
                        navigateToTab(navController, item.route)
                    }
                },
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
            )
        }
    }
}

private fun navigateToTab(navController: NavHostController, route: String) {
    navController.navigate(route) {
        popUpTo(navController.graph.findStartDestination().id) {
            saveState = true
        }
        launchSingleTop = true
        restoreState = true
    }
}

private fun navigateToMore(navController: NavHostController, moreRoute: String) {
    navController.navigate(moreRoute) {
        popUpTo(navController.graph.findStartDestination().id) {
            saveState = true
        }
        launchSingleTop = true
        restoreState = true
    }
}
