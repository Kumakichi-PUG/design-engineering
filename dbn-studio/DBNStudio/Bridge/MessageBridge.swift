import Foundation
import WebKit

// Swift ↔ JS メッセージブリッジ
// JS 側は window.webkit.messageHandlers.dbnBridge.postMessage({type, payload}) で送信
// Swift 側は evaluateJavaScript で window.dbnBridge.receive(type, payload) を呼ぶ

/// メッセージハンドラ名（JS 側と共有）
let bridgeHandlerName = "dbnBridge"

/// JS → Swift メッセージを処理し、Swift → JS メッセージを送信するブリッジ
final class MessageBridge: NSObject, WKScriptMessageHandler {
    /// JS へメッセージを送るための WebView 参照（弱参照でリーク防止）
    weak var webView: WKWebView?

    /// Claude API サービス
    private let claudeService: ClaudeService

    override init() {
        self.claudeService = ClaudeService(keychainService: KeychainService())
        super.init()
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == bridgeHandlerName else { return }

        // メッセージボディを辞書として取得
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else {
            print("[MessageBridge] Invalid message format: \(message.body)")
            return
        }

        let payloadDict = body["payload"] as? [String: Any] ?? [:]

        switch type {
        case "runCode":
            handleRunCode(payloadDict)
        case "askClaude":
            handleAskClaude(payloadDict)
        case "error":
            handleError(payloadDict)
        default:
            print("[MessageBridge] Unknown message type: \(type)")
        }
    }

    // MARK: - JS → Swift ハンドラ

    /// DBN コード実行リクエストを処理
    private func handleRunCode(_ payload: [String: Any]) {
        guard let code = payload["code"] as? String else {
            print("[MessageBridge] runCode: missing 'code' field")
            return
        }
        print("[MessageBridge] runCode received, length=\(code.count)")

        // TODO: Wave 2 — DBN インタプリタ呼び出し後に描画コマンドを返す
        // 現時点ではスタブとして空の結果を返す
        let stubResult = DrawCommandsPayload(commands: [], errors: [])
        sendToJS(type: "drawCommands", payload: stubResult)
    }

    /// Claude API 呼び出しリクエストを処理
    private func handleAskClaude(_ payload: [String: Any]) {
        let prompt = payload["prompt"] as? String ?? ""
        print("[MessageBridge] askClaude received, prompt=\(prompt.prefix(50))...")

        Task {
            do {
                let code = try await claudeService.generateDBNCode(prompt: prompt)
                let response = ClaudeResponsePayload(
                    code: code,
                    explanation: nil,
                    error: nil)
                sendToJS(type: "claudeResponse", payload: response)
            } catch {
                print("[MessageBridge] Claude API error: \(error)")
                let response = ClaudeResponsePayload(
                    code: nil,
                    explanation: nil,
                    error: error.localizedDescription)
                sendToJS(type: "claudeResponse", payload: response)
            }
        }
    }

    /// JS 側エラー報告を処理
    private func handleError(_ payload: [String: Any]) {
        let message = payload["message"] as? String ?? "unknown"
        let line = payload["line"] as? Int
        if let line = line {
            print("[MessageBridge] JS error at line \(line): \(message)")
        } else {
            print("[MessageBridge] JS error: \(message)")
        }
    }

    // MARK: - Swift → JS 送信

    /// JS 側の window.dbnBridge.receive(type, payload) を呼び出す
    func sendToJS<T: Encodable>(type: String, payload: T) {
        guard let webView = webView else {
            print("[MessageBridge] webView is nil, cannot send message")
            return
        }

        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(payload)
            guard let jsonString = String(data: data, encoding: .utf8) else {
                print("[MessageBridge] Failed to encode payload to UTF-8")
                return
            }

            // JS 側呼び出し: window.dbnBridge.receive("type", {payload})
            let script = "window.dbnBridge.receive('\(type)', \(jsonString));"

            Task { @MainActor in
                do {
                    try await webView.evaluateJavaScript(script)
                } catch {
                    print("[MessageBridge] evaluateJavaScript failed: \(error)")
                }
            }
        } catch {
            print("[MessageBridge] JSON encode failed: \(error)")
        }
    }

    /// JSON ペイロード無しで JS にメッセージを送る
    func sendToJS(type: String) {
        guard let webView = webView else { return }

        let script = "window.dbnBridge.receive('\(type)', null);"
        Task { @MainActor in
            do {
                try await webView.evaluateJavaScript(script)
            } catch {
                print("[MessageBridge] evaluateJavaScript failed: \(error)")
            }
        }
    }
}
