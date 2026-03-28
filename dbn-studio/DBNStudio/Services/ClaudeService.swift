import Foundation

// Claude API 呼び出しエラー型
enum ClaudeServiceError: Error, LocalizedError {
    case apiKeyNotFound
    case invalidRequest
    case networkError(underlying: Error)
    case invalidResponse
    case apiError(statusCode: Int, message: String)
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .apiKeyNotFound:
            return "API キーが設定されていません。設定画面から登録してください。"
        case .invalidRequest:
            return "リクエストの構築に失敗しました"
        case .networkError(let error):
            return "ネットワークエラー: \(error.localizedDescription)"
        case .invalidResponse:
            return "API レスポンスの解析に失敗しました"
        case .apiError(let code, let message):
            return "API エラー (\(code)): \(message)"
        case .emptyResponse:
            return "API から空のレスポンスが返されました"
        }
    }
}

// Anthropic Messages API クライアント
actor ClaudeService {
    /// API エンドポイント
    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!

    /// 使用モデル
    private let model = "claude-sonnet-4-20250514"

    /// API バージョン
    private let apiVersion = "2023-06-01"

    /// Keychain サービス（API キー取得用）
    private let keychainService: KeychainService

    /// 最大トークン数
    private let maxTokens = 1024

    /// DBN コード生成用システムプロンプト
    private let systemPrompt = """
        あなたは DBN (Design by Numbers) のコード生成アシスタントです。
        ユーザーの自然言語の指示を DBN コードに変換してください。

        DBN 言語仕様:
        - キャンバス: 100\u{00D7}100 ピクセル、グレースケール (0=白, 100=黒)
        - 座標系: 左下が (0,0)、右上が (99,99)
        - コマンド:
          - Paper <色> — キャンバス全体を塗りつぶし
          - Pen <色> — 描画色を設定
          - Line <x1> <y1> <x2> <y2> — 直線を描画
          - Set <変数名> <値> — 変数に値を代入
          - Set [<x> <y>] <色> — ピクセルを設定
          - Repeat <変数> <開始> <終了> { ... } — ループ
          - Command <名前> <引数...> { ... } — コマンド定義
          - Same? <a> <b> { ... } — 等値判定
          - NotSame? <a> <b> { ... } — 非等値判定
          - Smaller? <a> <b> { ... } — 小なり判定
          - NotSmaller? <a> <b> { ... } — 大なり等しい判定
        - 算術式は括弧で囲む: (a + b), (a * b)
        - コメントは // で始まる

        DBN コードのみを出力してください。説明は不要です。
        """

    init(keychainService: KeychainService) {
        self.keychainService = keychainService
    }

    // MARK: - メイン API

    /// 自然言語プロンプトから DBN コードを生成する
    func generateDBNCode(prompt: String) async throws -> String {
        // Keychain から API キーを取得
        guard let apiKey = await keychainService.retrieve() else {
            throw ClaudeServiceError.apiKeyNotFound
        }

        // リクエスト構築
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue(apiVersion, forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "content-type")

        let requestBody = MessagesRequest(
            model: model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
                Message(role: "user", content: prompt)
            ]
        )

        do {
            let encoder = JSONEncoder()
            request.httpBody = try encoder.encode(requestBody)
        } catch {
            print("[ClaudeService] Failed to encode request body: \(error)")
            throw ClaudeServiceError.invalidRequest
        }

        // API 呼び出し
        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            print("[ClaudeService] Network error: \(error)")
            throw ClaudeServiceError.networkError(underlying: error)
        }

        // ステータスコード確認
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ClaudeServiceError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            // エラーレスポンスの解析を試みる
            let errorMessage = parseErrorMessage(from: data)
                ?? "HTTP \(httpResponse.statusCode)"
            print("[ClaudeService] API error \(httpResponse.statusCode): \(errorMessage)")
            throw ClaudeServiceError.apiError(
                statusCode: httpResponse.statusCode,
                message: errorMessage
            )
        }

        // レスポンス解析
        let messagesResponse: MessagesResponse
        do {
            let decoder = JSONDecoder()
            messagesResponse = try decoder.decode(MessagesResponse.self, from: data)
        } catch {
            print("[ClaudeService] Failed to decode response: \(error)")
            throw ClaudeServiceError.invalidResponse
        }

        // content[0].text を取得
        guard let firstContent = messagesResponse.content.first,
              case .text(let text) = firstContent else {
            throw ClaudeServiceError.emptyResponse
        }

        return text
    }

    // MARK: - ヘルパー

    /// エラーレスポンスからメッセージを抽出
    private func parseErrorMessage(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let error = json["error"] as? [String: Any],
              let message = error["message"] as? String else {
            return nil
        }
        return message
    }
}

// MARK: - API リクエスト/レスポンス型

/// Messages API リクエストボディ
private struct MessagesRequest: Encodable {
    let model: String
    let max_tokens: Int
    let system: String
    let messages: [Message]
}

/// メッセージ
private struct Message: Encodable {
    let role: String
    let content: String
}

/// Messages API レスポンス
private struct MessagesResponse: Decodable {
    let id: String
    let content: [ContentBlock]
    let model: String
    let role: String
    let stop_reason: String?
}

/// コンテンツブロック
private enum ContentBlock: Decodable {
    case text(String)
    case unknown

    private enum CodingKeys: String, CodingKey {
        case type
        case text
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "text":
            let text = try container.decode(String.self, forKey: .text)
            self = .text(text)
        default:
            self = .unknown
        }
    }
}
