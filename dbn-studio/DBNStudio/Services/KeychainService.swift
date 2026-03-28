import Foundation
import Security

// Keychain 操作エラー型
enum KeychainError: Error, LocalizedError {
    case itemNotFound
    case duplicateItem
    case unexpectedError(status: OSStatus)

    var errorDescription: String? {
        switch self {
        case .itemNotFound:
            return "API キーが見つかりません"
        case .duplicateItem:
            return "API キーは既に保存されています"
        case .unexpectedError(let status):
            return "Keychain error: \(status)"
        }
    }
}

// Anthropic API キーを macOS Keychain で管理する actor
actor KeychainService {
    /// Keychain に保存するサービス名
    private let serviceName = "com.dbn-studio.anthropic-api-key"

    /// アカウント名（Keychain 内でアイテムを一意に識別）
    private let accountName = "anthropic-api-key"

    // MARK: - 保存

    /// API キーを Keychain に保存する。既存キーがあれば上書きする。
    func save(apiKey: String) throws {
        guard let data = apiKey.data(using: .utf8) else {
            throw KeychainError.unexpectedError(status: errSecParam)
        }

        // 既存アイテムの削除を試みる（上書き用）
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: accountName
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        // 新規追加
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: accountName,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked
        ]

        let status = SecItemAdd(addQuery as CFDictionary, nil)

        guard status == errSecSuccess else {
            if status == errSecDuplicateItem {
                throw KeychainError.duplicateItem
            }
            throw KeychainError.unexpectedError(status: status)
        }
    }

    // MARK: - 取得

    /// Keychain から API キーを取得する。未保存なら nil を返す。
    func retrieve() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: accountName,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let apiKey = String(data: data, encoding: .utf8) else {
            return nil
        }

        return apiKey
    }

    // MARK: - 削除

    /// Keychain から API キーを削除する。
    func delete() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: accountName
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedError(status: status)
        }

        if status == errSecItemNotFound {
            throw KeychainError.itemNotFound
        }
    }
}
