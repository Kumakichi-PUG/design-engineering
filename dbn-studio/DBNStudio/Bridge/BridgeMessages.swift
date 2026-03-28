import Foundation

// ─── JS → Swift メッセージ ───

/// JS から受信するメッセージの外側エンベロープ
struct IncomingMessage: Codable {
    let type: String
    let payload: AnyCodable
}

/// JS → Swift メッセージ種別
enum BridgeMessageType: String, Codable {
    case runCode
    case askClaude
    case error
}

/// runCode ペイロード
struct RunCodePayload: Codable {
    let code: String
}

/// askClaude ペイロード
struct AskClaudePayload: Codable {
    let prompt: String
    let currentCode: String?
}

/// error ペイロード
struct ErrorPayload: Codable {
    let message: String
    let line: Int?
}

// ─── Swift → JS メッセージ ───

/// 描画コマンド（types.ts の DrawCommand と対応）
enum DrawCommand: Codable {
    case paper(PaperCommand)
    case pen(PenCommand)
    case line(LineDrawCommand)
    case setPixel(SetPixelCommand)

    struct PaperCommand: Codable {
        var type: String = "Paper"
        let color: Int
    }

    struct PenCommand: Codable {
        var type: String = "Pen"
        let color: Int
    }

    struct LineDrawCommand: Codable {
        var type: String = "Line"
        let x1: Int
        let y1: Int
        let x2: Int
        let y2: Int
        let color: Int
    }

    struct SetPixelCommand: Codable {
        var type: String = "SetPixel"
        let x: Int
        let y: Int
        let color: Int
    }

    // カスタムエンコード: enum ラッパーを外して内部構造体をそのまま出力
    func encode(to encoder: Encoder) throws {
        switch self {
        case .paper(let cmd): try cmd.encode(to: encoder)
        case .pen(let cmd): try cmd.encode(to: encoder)
        case .line(let cmd): try cmd.encode(to: encoder)
        case .setPixel(let cmd): try cmd.encode(to: encoder)
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: TypeKey.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "Paper": self = .paper(try PaperCommand(from: decoder))
        case "Pen": self = .pen(try PenCommand(from: decoder))
        case "Line": self = .line(try LineDrawCommand(from: decoder))
        case "SetPixel": self = .setPixel(try SetPixelCommand(from: decoder))
        default: throw DecodingError.dataCorruptedError(
            forKey: .type, in: container,
            debugDescription: "Unknown DrawCommand type: \(type)")
        }
    }

    private enum TypeKey: String, CodingKey { case type }
}

/// Swift → JS 描画コマンド群ペイロード
struct DrawCommandsPayload: Codable {
    let commands: [DrawCommand]
    let errors: [InterpreterErrorPayload]
}

/// インタプリタエラー（types.ts の InterpreterError と対応）
struct InterpreterErrorPayload: Codable {
    let message: String
    let line: Int?
}

/// Claude 応答ペイロード（Wave 2 スタブ）
struct ClaudeResponsePayload: Codable {
    let code: String?
    let explanation: String?
    let error: String?
}

// ─── 型消去ユーティリティ ───

/// JSON の任意値を Codable として扱う型消去ラッパー
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container, debugDescription: "Unsupported JSON value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case is NSNull:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: encoder.codingPath,
                    debugDescription: "Unsupported type"))
        }
    }
}
