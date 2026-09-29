import SwiftUI

/// Native family account — roster, app access, contact edits (mirrors web /account/profile).
struct FamilyProfileView: View {
    @Environment(AppSession.self) private var session

    @State private var family: FamilyProfile?
    @State private var pending: [FamilyPendingChange] = []
    @State private var invites: [FamilyLoginInvite] = []
    @State private var accountRole: String?
    @State private var loading = true
    @State private var saving = false
    @State private var message: String?
    @State private var error: String?
    @State private var editingMember: FamilyProfileMember?
    @State private var showAddMember = false

    var body: some View {
        List {
            if loading && family == nil {
                Section {
                    ProgressView("Loading family…")
                }
            }

            if let error {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.subheadline)
                }
            }

            if let message {
                Section {
                    Text(message)
                        .foregroundStyle(BrandColors.lake)
                        .font(.subheadline)
                }
            }

            if let role = accountRole {
                Section {
                    Label(
                        role == "primary" ? "Primary account" : "Family member access",
                        systemImage: role == "primary" ? "star.fill" : "person.2"
                    )
                    .foregroundStyle(BrandColors.lake)
                }
            }

            if !invites.isEmpty {
                Section {
                    ForEach(invites) { invite in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(invite.label ?? invite.email)
                                    .font(.subheadline.weight(.semibold))
                                Text(invite.email)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(invite.linked ? "Linked" : "Not signed up")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(invite.linked ? BrandColors.lake : .secondary)
                        }
                    }
                } header: {
                    Text("Family app access")
                } footer: {
                    Text("Add a login email on an adult or teen below. When they create an account with that email, they join this family automatically.")
                }
            }

            if !pending.isEmpty {
                Section("Pending approval") {
                    ForEach(pending) { change in
                        Text(change.summary)
                            .font(.subheadline)
                    }
                }
            }

            if family != nil {
                Section {
                    TextField("Family last name", text: stringBinding(\.family_last_name))
                    TextField("Account email", text: stringBinding(\.email))
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    TextField("Husband phone", text: stringBinding(\.husband_phone))
                        .keyboardType(.phonePad)
                    TextField("Wife phone", text: stringBinding(\.wife_phone))
                        .keyboardType(.phonePad)
                    TextField("Address", text: stringBinding(\.address))
                    TextField("City", text: stringBinding(\.city))
                    TextField("State", text: stringBinding(\.state))
                    TextField("ZIP", text: stringBinding(\.zip))
                        .keyboardType(.numberPad)
                    TextField("Home congregation", text: stringBinding(\.home_congregation))
                    Button {
                        Task { await saveProfile() }
                    } label: {
                        if saving {
                            ProgressView()
                        } else {
                            Text("Save family info")
                        }
                    }
                    .disabled(saving)
                } header: {
                    Text("Family contact")
                } footer: {
                    Text("Email and phones save immediately. Name, address, and congregation go to staff for approval.")
                }

                Section("Family members") {
                    ForEach(family?.members ?? []) { member in
                        Button {
                            editingMember = member
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(member.displayName)
                                        .foregroundStyle(.primary)
                                    Text(member.member_type.capitalized)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    if let email = member.email, !email.isEmpty {
                                        Text(email)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                    Button {
                        showAddMember = true
                    } label: {
                        Label("Add member", systemImage: "plus.circle")
                    }
                }

                Section {
                    NavigationLink {
                        FamilyDirectoryManageView()
                    } label: {
                        Label("Directory photo & listing", systemImage: "camera.fill")
                    }
                }
            } else if !loading {
                Section {
                    Text("No family profile yet. Register on the website first, then pull to refresh.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button {
                        Task { await WebHandoff.open(path: "/register", session: session) }
                    } label: {
                        Label("Register on website", systemImage: "safari")
                    }
                }
            }
        }
        .navigationTitle("Family account")
        .refreshable { await load() }
        .task { await load() }
        .sheet(item: $editingMember) { member in
            FamilyMemberEditorSheet(member: member, isNew: false) { updated in
                Task { await saveMember(updated) }
            } onDelete: { id in
                Task { await deleteMember(id) }
            }
        }
        .sheet(isPresented: $showAddMember) {
            FamilyMemberEditorSheet(
                member: FamilyProfileMember(
                    id: nil,
                    first_name: "",
                    last_name: family?.family_last_name ?? "",
                    member_type: "adult",
                    age_group: "adult",
                    date_of_birth: nil,
                    grade: nil,
                    gender: "",
                    phone: nil,
                    email: nil,
                    special_needs: false,
                    notes: nil
                ),
                isNew: true
            ) { updated in
                Task { await saveMember(updated) }
            } onDelete: { _ in }
        }
    }

    private func stringBinding(_ keyPath: WritableKeyPath<FamilyProfile, String?>) -> Binding<String> {
        Binding(
            get: { family?[keyPath: keyPath] ?? "" },
            set: { family?[keyPath: keyPath] = $0 }
        )
    }

    private func load() async {
        guard let client = session.apiClient else {
            error = "Sign in required"
            loading = false
            return
        }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let response = try await client.getFamilyProfile()
            family = response.family
            pending = response.pendingChanges
            invites = response.loginInvites ?? []
            accountRole = response.accountRole
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func saveProfile() async {
        guard let client = session.apiClient, let family else { return }
        saving = true
        message = nil
        error = nil
        defer { saving = false }
        do {
            let body = FamilyProfileUpdateBody(
                email: family.email,
                husband_phone: family.husband_phone,
                wife_phone: family.wife_phone,
                family_last_name: family.family_last_name,
                address: family.address,
                city: family.city,
                state: family.state,
                zip: family.zip,
                home_congregation: family.home_congregation
            )
            let response = try await client.updateFamilyProfile(body)
            message = response.message ?? "Saved"
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func saveMember(_ member: FamilyProfileMember) async {
        guard let client = session.apiClient else { return }
        message = nil
        error = nil
        do {
            let response = try await client.saveFamilyMember(member)
            message = response.message ?? "Saved"
            editingMember = nil
            showAddMember = false
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func deleteMember(_ id: Int) async {
        guard let client = session.apiClient else { return }
        message = nil
        error = nil
        do {
            let response = try await client.removeFamilyMember(memberId: id)
            message = response.message ?? "Removal submitted"
            editingMember = nil
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct FamilyMemberEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State var member: FamilyProfileMember
    let isNew: Bool
    let onSave: (FamilyProfileMember) -> Void
    let onDelete: (Int) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("First name", text: $member.first_name)
                    TextField("Last name", text: $member.last_name)
                }
                Section("Type") {
                    Picker("Member type", selection: $member.member_type) {
                        Text("Adult").tag("adult")
                        Text("Teen").tag("teen")
                        Text("Child").tag("child")
                        Text("Infant").tag("infant")
                    }
                    TextField("Gender", text: Binding(
                        get: { member.gender ?? "" },
                        set: { member.gender = $0 }
                    ))
                    TextField("Birthday (YYYY-MM-DD)", text: Binding(
                        get: { member.date_of_birth ?? "" },
                        set: { member.date_of_birth = $0.isEmpty ? nil : $0 }
                    ))
                }
                Section {
                    TextField("Login email", text: Binding(
                        get: { member.email ?? "" },
                        set: { member.email = $0.isEmpty ? nil : $0 }
                    ))
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    TextField("Phone", text: Binding(
                        get: { member.phone ?? "" },
                        set: { member.phone = $0.isEmpty ? nil : $0 }
                    ))
                    .keyboardType(.phonePad)
                } header: {
                    Text("Contact / app access")
                } footer: {
                    Text("Adults and teens with an email can sign in and join this family account. Email and phone save immediately; other edits need approval.")
                }
            }
            .navigationTitle(isNew ? "Add member" : "Edit member")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(member)
                        dismiss()
                    }
                    .disabled(member.first_name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                if !isNew, let id = member.id {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Request removal", role: .destructive) {
                            onDelete(id)
                            dismiss()
                        }
                    }
                }
            }
        }
    }
}
