import SwiftUI
import WebKit

// WKWebView を SwiftUI にラップするビュー
// macOS / iOS で NSViewRepresentable / UIViewRepresentable を切り替え

#if os(macOS)

struct WebView: NSViewRepresentable {
    let messageBridge: MessageBridge

    func makeNSView(context: Context) -> WKWebView {
        let webView = createWebView(bridge: messageBridge)
        messageBridge.webView = webView
        loadLocalHTML(in: webView)
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        // 状態変化による更新は不要
    }
}

#elseif os(iOS)

struct WebView: UIViewRepresentable {
    let messageBridge: MessageBridge

    func makeUIView(context: Context) -> WKWebView {
        let webView = createWebView(bridge: messageBridge)
        messageBridge.webView = webView
        loadLocalHTML(in: webView)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // 状態変化による更新は不要
    }
}

#endif

// MARK: - 共通ヘルパー

/// WKWebView の生成とメッセージハンドラの登録
private func createWebView(bridge: MessageBridge) -> WKWebView {
    let config = WKWebViewConfiguration()
    let userContent = config.userContentController

    // JS → Swift メッセージハンドラを登録
    userContent.add(bridge, name: bridgeHandlerName)

    // ローカルファイルアクセスを許可する設定
    config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

    let webView = WKWebView(frame: .zero, configuration: config)

    #if DEBUG
    // デバッグ時は Safari Web Inspector を有効化
    if #available(macOS 13.3, iOS 16.4, *) {
        webView.isInspectable = true
    }
    #endif

    return webView
}

/// Bundle 内の web/dist/index.html をロード
private func loadLocalHTML(in webView: WKWebView) {
    // Bundle リソースとしてコピーされた index.html を探す
    if let htmlURL = Bundle.main.url(
        forResource: "index",
        withExtension: "html",
        subdirectory: "WebContent/dbn"
    ) {
        let dirURL = htmlURL.deletingLastPathComponent()
        webView.loadFileURL(htmlURL, allowingReadAccessTo: dirURL)
        print("[WebView] Loading \(htmlURL.path)")
    } else {
        // Bundle にない場合は開発用フォールバック: web/dist を直接参照
        let projectRoot = findProjectRoot()
        let distURL = projectRoot.appendingPathComponent("web/dist/index.html")

        if FileManager.default.fileExists(atPath: distURL.path) {
            let dirURL = distURL.deletingLastPathComponent()
            webView.loadFileURL(distURL, allowingReadAccessTo: dirURL)
            print("[WebView] Loading dev fallback: \(distURL.path)")
        } else {
            // まだビルドされていない場合のプレースホルダ
            let placeholder = """
            <html>
            <head><meta charset="utf-8"><title>DBN Studio</title></head>
            <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;color:#333;">
            <div style="text-align:center;">
                <h1 style="font-weight:300;">DBN Studio</h1>
                <p>web/dist がまだビルドされていません。</p>
                <code>cd web && npm run build</code>
            </div>
            </body>
            </html>
            """
            webView.loadHTMLString(placeholder, baseURL: nil)
            print("[WebView] No dist found, showing placeholder")
        }
    }
}

/// プロジェクトルートを推定（開発用フォールバック）
private func findProjectRoot() -> URL {
    // Bundle の場所から推定
    let bundlePath = Bundle.main.bundleURL
    // .app/Contents/MacOS/ → 3つ上がプロジェクトルート付近
    // 開発時は DerivedData 内なので、プロジェクトルートをハードコードせず
    // 環境変数やビルド設定で渡す方が望ましい
    if let projectDir = ProcessInfo.processInfo.environment["DBN_PROJECT_ROOT"] {
        return URL(fileURLWithPath: projectDir)
    }
    // フォールバック: Bundle の親ディレクトリ
    return bundlePath.deletingLastPathComponent()
}
