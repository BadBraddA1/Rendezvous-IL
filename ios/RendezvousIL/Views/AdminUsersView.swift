import Clerk
import SwiftUI

struct AdminUsersView: View {
    @Environment(AppSession.self) private var session

    @State private var users: [AdminUserRecord] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedUser: AdminUserRecord?
    @State private var showCreateUser = false
    @State private var searchText = ""

    private var filteredUsers: [AdminUserRecord] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return users }
        return users.filter { user in
            user.email.lowercased().contains(query)
                || user.displayName.lowercased().contains(query)
                || (user.role?.lowercased().contains(query) ?? false)
        }
    }

    var body: some View {
        Group {
            if !session.isSignedIn {
                signInRequired
            } else if !session.canManageUsers {
                accessDenied
            } else if isLoading && users.isEmpty {
                ProgressView("Loading users…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                userList
            }
        }
        .navigationTitle("Users")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $searchText, prompt: "Search email or name")
        .toolbar {
            if session.canManageUsers {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCreateUser = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add user")
                }
            }
        }
        .refreshable {
            await loadUsers(force: true)
        }
        .task {
            await session.refreshAuth()
            await loadUsers(force: false)
        }
        .sheet(item: $selectedUser) { user in
            AdminUserDetailSheet(user: user) { updated in
                replaceUser(updated)
            } onDelete: { deletedId in
                users.removeAll { $0.id == deletedId }
            }
            .environment(session)
        }
        .sheet(isPresented: $showCreateUser) {
            AdminUserCreateSheet { created in
                users.insert(created, at: 0)
            }
            .environment(session)
        }
    }

    private var signInRequired: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Admin sign-in")
                    .font(.title2.weight(.semibold))
                Text("Sign in with a full admin account to manage users.")
                    .foregroundStyle(.secondary)
                AuthView()
                    .frame(minHeight: 360)
            }
            .padding(20)
        }
    }

    private var accessDenied: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Full admin required")
                .font(.title3.weight(.semibold))
            Text("Only full admins can manage users. Ask another admin to assign the Admin role.")
                .foregroundStyle(.secondary)
        }
        .padding(20)
    }

    private var userList: some View {
        List {
            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            Section("All users (\(filteredUsers.count))") {
                ForEach(filteredUsers) { user in
                    Button {
                        selectedUser = user
                    } label: {
                        AdminUserRow(user: user)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private func loadUsers(force: Bool) async {
        if isLoading && !force { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        guard let client = session.apiClient else {
            errorMessage = "Sign in required."
            return
        }

        do {
            let response = try await client.getAdminUsers()
            users = response.users
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func replaceUser(_ updated: AdminUserRecord) {
        if let index = users.firstIndex(where: { $0.id == updated.id }) {
            users[index] = updated
        }
    }
}

private struct AdminUserRow: View {
    let user: AdminUserRecord

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "person.circle.fill")
                .font(.title2)
                .foregroundStyle(BrandColors.lake)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(user.displayName)
                        .font(.headline)
                    if user.banned {
                        Text("BANNED")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.red.opacity(0.15), in: Capsule())
                            .foregroundStyle(.red)
                    }
                }
                Text(user.email)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    Label(user.roleLabel, systemImage: "shield")
                    Label(UserPlatformLabel.text(for: user.lastPlatform), systemImage: UserPlatformLabel.icon(for: user.lastPlatform))
                }
                .font(.caption2)
                .foregroundStyle(.secondary)

                if let seen = user.bestLastSeenDate() {
                    Text("Last seen \(seen.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}

private struct AdminUserDetailSheet: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    let user: AdminUserRecord
    let onUpdate: (AdminUserRecord) -> Void
    let onDelete: (String) -> Void

    @State private var currentUser: AdminUserRecord
    @State private var role: AdminUserRole
    @State private var firstName: String
    @State private var lastName: String
    @State private var tempPassword = ""
    @State private var signInLink = ""
    @State private var isSaving = false
    @State private var message: String?
    @State private var errorMessage: String?
    @State private var showDeleteConfirm = false

    init(
        user: AdminUserRecord,
        onUpdate: @escaping (AdminUserRecord) -> Void,
        onDelete: @escaping (String) -> Void
    ) {
        self.user = user
        self.onUpdate = onUpdate
        self.onDelete = onDelete
        _currentUser = State(initialValue: user)
        _role = State(initialValue: AdminUserRole.from(user.role))
        _firstName = State(initialValue: user.firstName ?? "")
        _lastName = State(initialValue: user.lastName ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    LabeledContent("Email", value: currentUser.email)
                    TextField("First name", text: $firstName)
                    TextField("Last name", text: $lastName)
                    Picker("Role", selection: $role) {
                        ForEach(AdminUserRole.allCases) { option in
                            Text(option.label).tag(option)
                        }
                    }
                }

                Section("Activity") {
                    if let seen = currentUser.bestLastSeenDate() {
                        LabeledContent("Last seen", value: seen.formatted(date: .abbreviated, time: .shortened))
                    } else {
                        LabeledContent("Last seen", value: "Never")
                    }
                    LabeledContent("Platform", value: UserPlatformLabel.text(for: currentUser.lastPlatform))
                    LabeledContent("Visits", value: "\(currentUser.visitCount)")
                    if let version = currentUser.lastAppVersion, !version.isEmpty {
                        LabeledContent("App version", value: version)
                    }
                }

                Section("Password") {
                    SecureField("New temporary password", text: $tempPassword)
                    Button("Set password") {
                        Task { await setPassword() }
                    }
                    .disabled(tempPassword.count < 8 || isSaving)
                    Button("Copy sign-in link") {
                        Task { await copySignInLink() }
                    }
                    .disabled(isSaving)
                    Link("Forgot password on web", destination: AppConfig.url(for: "/sign-in/forgot-password"))
                }

                Section {
                    Button(currentUser.banned ? "Unban user" : "Ban user", role: currentUser.banned ? nil : .destructive) {
                        Task { await toggleBan() }
                    }
                    .disabled(isSaving)
                    Button("Delete user", role: .destructive) {
                        showDeleteConfirm = true
                    }
                    .disabled(isSaving)
                }

                if let message {
                    Section {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.green)
                    }
                }
                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                if !signInLink.isEmpty {
                    Section("Sign-in link") {
                        Text(signInLink)
                            .font(.caption2)
                            .textSelection(.enabled)
                    }
                }
            }
            .navigationTitle(currentUser.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await saveProfile() }
                    }
                    .disabled(isSaving)
                }
            }
            .confirmationDialog(
                "Delete \(currentUser.email)?",
                isPresented: $showDeleteConfirm,
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    Task { await deleteUser() }
                }
            } message: {
                Text("This permanently removes the Clerk account.")
            }
        }
    }

    private func saveProfile() async {
        guard let client = session.apiClient else { return }
        isSaving = true
        errorMessage = nil
        message = nil
        defer { isSaving = false }

        do {
            let response = try await client.updateAdminUserRole(
                AdminUserRolePatchBody(
                    userId: currentUser.id,
                    role: role.apiValue,
                    firstName: firstName.trimmingCharacters(in: .whitespacesAndNewlines),
                    lastName: lastName.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            )
            currentUser = response.user
            onUpdate(response.user)
            message = "User updated."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func toggleBan() async {
        guard let client = session.apiClient else { return }
        isSaving = true
        errorMessage = nil
        message = nil
        defer { isSaving = false }

        do {
            let response = try await client.updateAdminUserBan(
                AdminUserBanPatchBody(userId: currentUser.id, banned: !currentUser.banned)
            )
            currentUser = response.user
            onUpdate(response.user)
            message = currentUser.banned ? "User banned." : "User unbanned."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func setPassword() async {
        guard let client = session.apiClient else { return }
        isSaving = true
        errorMessage = nil
        message = nil
        defer { isSaving = false }

        do {
            _ = try await client.resetAdminUserPassword(userId: currentUser.id, mode: "set", password: tempPassword)
            tempPassword = ""
            message = "Password updated."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func copySignInLink() async {
        guard let client = session.apiClient else { return }
        isSaving = true
        errorMessage = nil
        message = nil
        defer { isSaving = false }

        do {
            let response = try await client.resetAdminUserPassword(userId: currentUser.id, mode: "link", password: nil)
            if let url = response.url {
                signInLink = url
                UIPasteboard.general.string = url
                message = "Sign-in link copied."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteUser() async {
        guard let client = session.apiClient else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            _ = try await client.deleteAdminUser(id: currentUser.id)
            onDelete(currentUser.id)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct AdminUserCreateSheet: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    let onCreate: (AdminUserRecord) -> Void

    @State private var email = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var role: AdminUserRole = .none
    @State private var password = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("New user") {
                    TextField("Email", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    TextField("First name", text: $firstName)
                    TextField("Last name", text: $lastName)
                    Picker("Role", selection: $role) {
                        ForEach(AdminUserRole.allCases) { option in
                            Text(option.label).tag(option)
                        }
                    }
                    SecureField("Temporary password (optional)", text: $password)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Add user")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task { await createUser() }
                    }
                    .disabled(isSaving || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func createUser() async {
        guard let client = session.apiClient else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let response = try await client.createAdminUser(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
                firstName: firstName.trimmingCharacters(in: .whitespacesAndNewlines),
                lastName: lastName.trimmingCharacters(in: .whitespacesAndNewlines),
                role: role.apiValue,
                password: password.isEmpty ? nil : password
            )
            onCreate(response.user)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        AdminUsersView()
            .environment(AppSession())
    }
}
