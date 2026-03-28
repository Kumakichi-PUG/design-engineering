import SwiftUI

// API キー設定用 Sheet ビュー
struct APIKeySettingsView: View {
    @Environment(\.dismiss) private var dismiss

    /// API キー入力値
    @State private var apiKeyInput: String = ""

    /// キーが保存済みかどうか
    @State private var hasStoredKey: Bool = false

    /// 操作結果メッセージ
    @State private var statusMessage: String = ""

    /// エラー状態
    @State private var isError: Bool = false

    /// Keychain サービス
    private let keychainService = KeychainService()

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            // タイトル
            Text("API Key")
                .font(.system(size: 14, weight: .medium, design: .monospaced))
                .foregroundColor(.primary)

            // キー入力エリア
            if hasStoredKey {
                storedKeyView
            } else {
                inputView
            }

            // ステータスメッセージ
            if !statusMessage.isEmpty {
                Text(statusMessage)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(isError ? .red : .secondary)
            }

            Spacer()

            // 閉じるボタン
            HStack {
                Spacer()
                Button("閉じる") {
                    dismiss()
                }
                .font(.system(size: 12, design: .monospaced))
                .keyboardShortcut(.escape, modifiers: [])
            }
        }
        .padding(32)
        .frame(width: 400, height: 240)
        .task {
            await checkStoredKey()
        }
    }

    // MARK: - サブビュー

    /// キーが未保存の場合: 入力フィールド + 保存ボタン
    private var inputView: some View {
        VStack(alignment: .leading, spacing: 12) {
            SecureField("sk-ant-...", text: $apiKeyInput)
                .font(.system(size: 12, design: .monospaced))
                .textFieldStyle(.plain)
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(Color.primary.opacity(0.2), lineWidth: 1)
                )

            Button("保存") {
                Task { await saveKey() }
            }
            .font(.system(size: 12, design: .monospaced))
            .disabled(apiKeyInput.isEmpty)
        }
    }

    /// キーが保存済みの場合: マスク表示 + 削除ボタン
    private var storedKeyView: some View {
        HStack(spacing: 16) {
            Text("sk-ant-****...****")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.secondary)

            Spacer()

            Button("削除") {
                Task { await deleteKey() }
            }
            .font(.system(size: 12, design: .monospaced))
            .foregroundColor(.red)
        }
    }

    // MARK: - Keychain 操作

    /// 保存済みキーの有無を確認
    private func checkStoredKey() async {
        let key = await keychainService.retrieve()
        hasStoredKey = key != nil
    }

    /// API キーを Keychain に保存
    private func saveKey() async {
        do {
            try await keychainService.save(apiKey: apiKeyInput)
            apiKeyInput = ""
            hasStoredKey = true
            statusMessage = "保存しました"
            isError = false
        } catch {
            print("[APIKeySettingsView] Save failed: \(error)")
            statusMessage = "保存に失敗しました"
            isError = true
        }
    }

    /// API キーを Keychain から削除
    private func deleteKey() async {
        do {
            try await keychainService.delete()
            hasStoredKey = false
            statusMessage = "削除しました"
            isError = false
        } catch {
            print("[APIKeySettingsView] Delete failed: \(error)")
            statusMessage = "削除に失敗しました"
            isError = true
        }
    }
}

#Preview {
    APIKeySettingsView()
}
