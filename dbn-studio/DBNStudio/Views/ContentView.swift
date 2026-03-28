import SwiftUI

// メインビュー
// 「コードを書いて、結果を見ること」以外のすべてを排除する
struct ContentView: View {
    @StateObject private var viewModel = ContentViewModel()

    var body: some View {
        WebView(messageBridge: viewModel.bridge)
            .ignoresSafeArea()
            // 見えないUIが最良のUI — キーボードショートカットのみ
            .background {
                // ⌘R: コード実行
                Button("") { viewModel.runCode() }
                    .keyboardShortcut("r", modifiers: .command)
                    .hidden()
                // ⇧⌘E: Claude に質問
                Button("") { viewModel.askClaude() }
                    .keyboardShortcut("e", modifiers: [.command, .shift])
                    .hidden()
            }
    }
}

// MARK: - ViewModel

@MainActor
final class ContentViewModel: ObservableObject {
    let bridge = MessageBridge()

    func runCode() {
        bridge.sendToJS(type: "triggerRun")
    }

    func askClaude() {
        bridge.sendToJS(type: "triggerAskClaude")
    }
}

#Preview {
    ContentView()
}
