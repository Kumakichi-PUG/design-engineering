import SwiftUI

// DBN Studio — アプリケーションエントリポイント
@main
struct DBNStudioApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        #if os(macOS)
        // ウィンドウサイズ: コードとキャンバスに十分な余白を確保
        .defaultSize(width: 960, height: 640)
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        #endif

        #if os(macOS)
        // 設定画面は macOS 標準のメニュー (⌘,) からアクセス
        Settings {
            APIKeySettingsView()
        }
        #endif
    }
}
