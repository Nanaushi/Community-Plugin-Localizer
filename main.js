const { Plugin, PluginSettingTab, Setting, Notice, Modal } = require("obsidian");

module.exports = class CommunityPluginLocalizerPlugin extends Plugin {
  // ===== 変更1: クラスにデバウンスタイマーを追加 =====
  constructor(app, manifest) {
    super(app, manifest);
    // 絵文字検出用の正規表現を追加
    this.emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{1F0A0}-\u{1F0FF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu;
    this.languageCodes = {
      'en': '',
      'ja': '_ja',
      'ko': '_ko'
    };
    this.settings = {
      translationEnabled: true,  // デフォルトで翻訳有効
      menuLayoutHorizontal: true, // デフォルトで横向き配置
      translationPreviewSize: { width: 600, height: 500 }
    };
    this.tabSwitchDebounceTimer = null;
    this.isButtonDragging = false;
    this.dragStartTimeout = null;
    this.buttonStartPos = { x: 0, y: 0 };
    this.buttonCurrentPos = { x: 0, y: 0 };
    this.isDrawerOpen = false; // ドロワー開閉状態を管理
    this.searchTerm = '';
    this.searchTarget = 'both'; // 'original', 'translation', 'both'
    this.searchResults = [];
    this.currentSearchIndex = -1;
    this.isDrawerOpen = false; // ドロワー開閉状態を管理
    this.chunkData = null; // チャンク分割データを保存
    this.chunkTranslations = new Map(); // チャンクID別の翻訳データ
    
    // Notice専用翻訳システム
    this.noticeMessages = {
      en: {
        EXTRACTION_SUCCESS: "✅ Extracted {count} strings: {pluginName}",
        EXTRACTION_NO_STRINGS: "⚠️ No translatable English strings found: {pluginName}",
        SAVE_SUCCESS: "✅ Translation saved: {pluginName}",
        DELETE_SUCCESS: "✅ Translation file moved to trash: {pluginName}",
        DELETE_COMPLETE: "⚠️ Translation file completely deleted: {pluginName} (trash failed)",
        ERROR_NO_PLUGIN: "❌ Could not identify current plugin",
        ERROR_EXTRACTION: "❌ String extraction failed",
        ERROR_PASTE: "❌ Paste translation failed: {error}",
        ERROR_CLIPBOARD_EMPTY: "❌ Clipboard is empty",
        ERROR_NO_EXTRACTION: "❌ Please run 'Extract' first",
        ERROR_INCOMPLETE_TRANSLATION: "❌ {count} lines are empty. Please translate all lines",
        CHUNK_COPY_SUCCESS: "📋 Chunk {chunkId} copied to clipboard ({count} strings)",
        CHUNK_PASTE_SUCCESS: "✅ Chunk {chunkId} translation pasted ({count} lines)",
        CHUNK_PASTE_MISMATCH: "⚠️ Chunk {chunkId} pasted: {applied} lines applied ({diff})",
        CHUNK_MANAGEMENT_TOO_LARGE: "📊 Large content detected ({chars} chars) - opening chunk management",
        TRANSLATION_APPLIED: "✅ Translation applied: {pluginName}",
        TRANSLATION_REVERTED: "✅ Reverted to English: {pluginName}",
        BUTTON_MOVE_SUCCESS: "✅ Line {from} moved to line {to}",
        BUTTON_SHIFT_SUCCESS: "✅ Line {line} cleared and content shifted down",
        WARNING_ALL_COMPLETED: "⚠️ All lines completed, cannot move lines",
        WARNING_EMPTY_LINE: "⚠️ Cannot move empty line",
        WARNING_NO_TARGET: "⚠️ No target empty line found",
        WARNING_LAST_LINE: "⚠️ Cannot move from last line",
        COPY_SUCCESS: "📋 Copied: {text}...",
        ERROR_EDIT_FAILED: "❌ Translation editing failed: {error}",
        ERROR_DELETE_FAILED: "❌ Translation deletion failed: {error}",
        ERROR_SAVE_FAILED: "❌ Save failed: {error}",
        ERROR_PASTE_FAILED: "❌ Paste failed",
        ERROR_COPY_FAILED: "❌ Copy failed",
        BULK_TRANSLATION_APPLIED: "✅ Translation applied to {count} plugins",
        BULK_TRANSLATION_REVERTED: "✅ {count} plugins reverted to English", 
        ERROR_CHUNK_MISMATCH: "❌ Some chunks have line count mismatches. Please fix them before merging",
        ERROR_CHUNK_INCOMPLETE: "❌ Not all chunks are translated",
        CHUNK_EDIT_SUCCESS: "✅ Chunk {chunkId} editing saved",
        ERROR_TRANSLATION_LOAD_FAILED: "❌ Failed to load translation data",
        ERROR_NO_TRANSLATION_FILE: "❌ No translation file exists",
        ERROR_FILE_NOT_FOUND: "❌ Translation file not found",
        FOLDER_OPENED: "📁 Translation folder opened",
        ERROR_FOLDER_OPEN_FAILED: "❌ Failed to open folder",
        VERSION_UPDATE_SUCCESS: "✅ Version information updated for {pluginName} (v{version})",
        ERROR_VERSION_UPDATE_FAILED: "❌ Version update failed: {error}",
        MENU_LAYOUT_CHANGED: "✅ Menu layout changed to {direction}",
        NOTICE_LANGUAGE_CHANGED: "✅ Notice language changed to {language}",
        LINES_EXCESS: "{difference} lines excess",
        LINES_SHORTAGE: "{difference} lines shortage"
      },
      ja: {
        EXTRACTION_SUCCESS: "✅ {count}個の文字列を抽出しました: {pluginName}",
        EXTRACTION_NO_STRINGS: "⚠️ 翻訳対象の英語文字列が見つかりませんでした: {pluginName}",
        SAVE_SUCCESS: "✅ 翻訳の保存が完了しました: {pluginName}",
        DELETE_SUCCESS: "✅ {pluginName}の翻訳ファイルをゴミ箱に移動しました",
        DELETE_COMPLETE: "⚠️ {pluginName}の翻訳ファイルを完全削除しました（ゴミ箱移動失敗のため）",
        ERROR_NO_PLUGIN: "❌ 現在表示中のプラグインを特定できませんでした",
        ERROR_EXTRACTION: "❌ 文字列の抽出に失敗しました",
        ERROR_PASTE: "❌ 翻訳の貼付に失敗しました: {error}",
        ERROR_CLIPBOARD_EMPTY: "❌ クリップボードが空です",
        ERROR_NO_EXTRACTION: "❌ 先に「抽出」ボタンを実行してください",
        ERROR_INCOMPLETE_TRANSLATION: "❌ {count}行が空白です。全ての行を翻訳してください",
        CHUNK_COPY_SUCCESS: "📋 チャンク{chunkId}をクリップボードにコピーしました ({count}個の文字列)",
        CHUNK_PASTE_SUCCESS: "✅ チャンク{chunkId}の翻訳を貼付しました ({count}行)",
        CHUNK_PASTE_MISMATCH: "⚠️ チャンク{chunkId}を貼付しました: {applied}行貼付 ({diff})",
        CHUNK_MANAGEMENT_TOO_LARGE: "📊 大量のコンテンツを検出しました（{chars}文字）- チャンク管理画面を表示します",
        TRANSLATION_APPLIED: "✅ {pluginName}に翻訳を適用しました",
        TRANSLATION_REVERTED: "✅ {pluginName}を英語に戻しました",
        BUTTON_MOVE_SUCCESS: "✅ {from}行目を{to}行目に移動しました",
        BUTTON_SHIFT_SUCCESS: "✅ {line}行目を空白にして以降を下にずらしました",
        WARNING_ALL_COMPLETED: "⚠️ すべて入力済みのため、行移動は無効です",
        WARNING_EMPTY_LINE: "⚠️ 空行のため移動できません",
        WARNING_NO_TARGET: "⚠️ 移動先の空行がありません",
        WARNING_LAST_LINE: "⚠️ 最下行のため移動できません",
        COPY_SUCCESS: "📋 コピーしました: {text}...",
        ERROR_EDIT_FAILED: "❌ 翻訳の編集に失敗しました: {error}",
        ERROR_DELETE_FAILED: "❌ 翻訳の削除に失敗しました: {error}",
        ERROR_SAVE_FAILED: "❌ 翻訳の保存に失敗しました: {error}",
        ERROR_PASTE_FAILED: "❌ 貼付に失敗しました",
        ERROR_COPY_FAILED: "❌ コピーに失敗しました",
        BULK_TRANSLATION_APPLIED: "✅ {count}個のプラグインに翻訳を適用しました",
        BULK_TRANSLATION_REVERTED: "✅ {count}個のプラグインを英語に戻しました",
        ERROR_CHUNK_MISMATCH: "❌ 行数不一致のチャンクがあります。編集で修正してから統合してください", 
        ERROR_CHUNK_INCOMPLETE: "❌ 全てのチャンクの翻訳が完了していません",
        CHUNK_EDIT_SUCCESS: "✅ チャンク{chunkId}の編集を保存しました",
        ERROR_TRANSLATION_LOAD_FAILED: "❌ 翻訳データの読み込みに失敗しました",
        ERROR_NO_TRANSLATION_FILE: "❌ 翻訳ファイルが存在しません",
        ERROR_FILE_NOT_FOUND: "❌ 翻訳ファイルが見つかりませんでした",
        FOLDER_OPENED: "📁 翻訳フォルダを開きました",
        ERROR_FOLDER_OPEN_FAILED: "❌ フォルダを開くのに失敗しました",
        VERSION_UPDATE_SUCCESS: "✅ {pluginName}のバージョン情報を更新しました（v{version}）",
        ERROR_VERSION_UPDATE_FAILED: "❌ 更新確認に失敗しました: {error}",
        MENU_LAYOUT_CHANGED: "✅ メニュー配置を{direction}に変更しました",
        NOTICE_LANGUAGE_CHANGED: "✅ 通知言語を{language}に変更しました",
        LINES_EXCESS: "{difference}行余剰",
        LINES_SHORTAGE: "{difference}行不足"
      },
      ko: {
        EXTRACTION_SUCCESS: "✅ {count}개의 문자열을 추출했습니다: {pluginName}",
        EXTRACTION_NO_STRINGS: "⚠️ 번역 대상 영어 문자열을 찾을 수 없습니다: {pluginName}",
        SAVE_SUCCESS: "✅ 번역을 저장했습니다: {pluginName}",
        DELETE_SUCCESS: "✅ {pluginName}의 번역 파일을 휴지통으로 이동했습니다",
        DELETE_COMPLETE: "⚠️ {pluginName}의 번역 파일을 완전 삭제했습니다 (휴지통 이동 실패)",
        ERROR_NO_PLUGIN: "❌ 현재 표시 중인 플러그인을 식별할 수 없습니다",
        ERROR_EXTRACTION: "❌ 문자열 추출에 실패했습니다",
        ERROR_PASTE: "❌ 번역 붙여넣기에 실패했습니다: {error}",
        ERROR_CLIPBOARD_EMPTY: "❌ 클립보드가 비어있습니다",
        ERROR_NO_EXTRACTION: "❌ 먼저 '추출' 버튼을 실행해주세요",
        ERROR_INCOMPLETE_TRANSLATION: "❌ {count}행이 비어있습니다. 모든 행을 번역해주세요",
        CHUNK_COPY_SUCCESS: "📋 청크{chunkId}를 클립보드에 복사했습니다 ({count}개 문자열)",
        CHUNK_PASTE_SUCCESS: "✅ 청크{chunkId} 번역을 붙여넣었습니다 ({count}행)",
        CHUNK_PASTE_MISMATCH: "⚠️ 청크{chunkId}를 붙여넣었습니다: {applied}행 적용 ({diff})",
        CHUNK_MANAGEMENT_TOO_LARGE: "📊 대량 콘텐츠 감지 ({chars}자) - 청크 관리 표시",
        TRANSLATION_APPLIED: "✅ {pluginName}에 번역을 적용했습니다",
        TRANSLATION_REVERTED: "✅ {pluginName}을 영어로 되돌렸습니다",
        BUTTON_MOVE_SUCCESS: "✅ {from}행을 {to}행으로 이동했습니다",
        BUTTON_SHIFT_SUCCESS: "✅ {line}행을 비우고 이후를 아래로 이동했습니다",
        WARNING_ALL_COMPLETED: "⚠️ 모든 입력이 완료되어 행 이동이 무효입니다",
        WARNING_EMPTY_LINE: "⚠️ 빈 행이므로 이동할 수 없습니다",
        WARNING_NO_TARGET: "⚠️ 이동할 빈 행이 없습니다",
        WARNING_LAST_LINE: "⚠️ 마지막 행이므로 이동할 수 없습니다",
        COPY_SUCCESS: "📋 복사했습니다: {text}...",
        ERROR_EDIT_FAILED: "❌ 번역 편집에 실패했습니다: {error}",
        ERROR_DELETE_FAILED: "❌ 번역 삭제에 실패했습니다: {error}",
        ERROR_SAVE_FAILED: "❌ 저장에 실패했습니다: {error}",
        ERROR_PASTE_FAILED: "❌ 붙여넣기에 실패했습니다",
        ERROR_COPY_FAILED: "❌ 복사에 실패했습니다",
        BULK_TRANSLATION_APPLIED: "✅ {count}개 플러그인에 번역을 적용했습니다",
        BULK_TRANSLATION_REVERTED: "✅ {count}개 플러그인을 영어로 되돌렸습니다",
        ERROR_CHUNK_MISMATCH: "❌ 행 수가 일치하지 않는 청크가 있습니다. 편집으로 수정한 후 통합해주세요",
        ERROR_CHUNK_INCOMPLETE: "❌ 모든 청크의 번역이 완료되지 않았습니다",
        CHUNK_EDIT_SUCCESS: "✅ 청크{chunkId} 편집을 저장했습니다",
        ERROR_TRANSLATION_LOAD_FAILED: "❌ 번역 데이터 로드에 실패했습니다",
        ERROR_NO_TRANSLATION_FILE: "❌ 번역 파일이 존재하지 않습니다",
        ERROR_FILE_NOT_FOUND: "❌ 번역 파일을 찾을 수 없습니다",
        FOLDER_OPENED: "📁 번역 폴더를 열었습니다",
        ERROR_FOLDER_OPEN_FAILED: "❌ 폴더 열기에 실패했습니다",
        VERSION_UPDATE_SUCCESS: "✅ {pluginName}의 버전 정보를 업데이트했습니다 (v{version})",
        ERROR_VERSION_UPDATE_FAILED: "❌ 업데이트 확인에 실패했습니다: {error}",
        MENU_LAYOUT_CHANGED: "✅ 메뉴 배치를 {direction}로 변경했습니다",
        NOTICE_LANGUAGE_CHANGED: "✅ 알림 언어를 {language}로 변경했습니다",
        LINES_EXCESS: "{difference}행 초과",
        LINES_SHORTAGE: "{difference}행 부족"
      }
    };

    this.settingsMessages = {
      en: {
        TITLE: "Community Plugin Localizer - Plugin Translation Management",
        LANGUAGE_SECTION: "Language",
        DISPLAY_LANGUAGE_TITLE: "Display Language", 
        DISPLAY_LANGUAGE_DESC: "Select the display language for this settings screen, floating button, notification messages, and modal windows",
        FLOATING_BUTTON_SECTION: "Floating Button",
        STORAGE_SECTION: "Storage",
        PLUGIN_LIST_SECTION: "Translation Target Plugins (Enabled)",
        EXTRACTION_TEST_SECTION: "Test",
        FLOATING_BUTTON_TITLE: "Show Floating Button",
        FLOATING_BUTTON_DESC: "Show/hide the floating button in plugin settings screen. (Default: shown)",
        FLOATING_BUTTON_DESC2: "Can also be used to recover when the button moves off-screen.",
        MENU_LAYOUT_TITLE: "Floating Button Menu Expansion Direction",
        MENU_LAYOUT_DESC: "Set the expansion direction",
        MENU_LAYOUT_STATUS: "Current: {direction} direction layout",
        STORAGE_LOCATION_TITLE2: "Translation Data Storage Location",
        STORAGE_LOCATION_DESC: "Translation files are saved in the following location",
        STORAGE_LOCATION_NOTE: "💡 Files are moved to trash when deleted, so recovery is possible in case of accidental deletion",
        OPEN_FOLDER: "📁 Open",
        OPEN_FOLDER_TOOLTIP: "Open translation folder in explorer",
        STRING_EXTRACTION_TEST_NAME: "Extraction Detection Test",
        STRING_EXTRACTION_TEST_DESC1: "You can test whether any string will be an extraction target",
        STRING_EXTRACTION_TEST_DESC2: "This test only detects at the string level.",
        STRING_EXTRACTION_TEST_DESC3: "In actual extraction, DOM element context is also considered, so results may differ.",
        TEST_PLACEHOLDER: "Enter a string you want to test for translation target...",
        TEST_BUTTON: "🔍 Run Extraction Test",
        CLEAR_BUTTON: "🗑️ Clear",
        TEST_ERROR_EMPTY: "❌ Please enter a string",
        TEST_RESULT_SUCCESS: "✅ Extraction Target",
        TEST_RESULT_FAILED: "❌ Not Extraction Target",
        TEST_RESULT_ERROR: "❌ An error occurred",
        TEST_INPUT_LABEL: "📝 Input:",
        TEST_NORMALIZED_LABEL: "📝 After normalization:",
        TEST_NORMALIZED_NO_CHANGE: "(no change)",
        TEST_EXCLUDE_REASON: "❌ Exclusion reason:",
        TEST_DETAIL_LABEL: "💡 Details:",
        TEST_STEPS_TITLE: "📊 Detection Steps:",
        STEP_BASIC_CHECK: "Basic Check",
        STEP_IMPORTANT_UI_PROTECTION: "Important UI Word Protection", 
        STEP_LENGTH_CHECK: "Length Check",
        STEP_NORMALIZATION: "Normalization Process",
        STEP_POST_NORMALIZATION_CHECK: "Post-normalization Check",
        STEP_EMOJI_REMOVAL: "Emoji Removal",
        STEP_POST_EMOJI_CHECK: "Post-emoji Removal Check",
        STEP_CHARACTER_TYPE_CHECK: "Character Type Check",
        STEP_ALPHABET_SCRIPT_CHECK: "Alphabet Script Check",
        STEP_ALPHABET_EXISTENCE: "Alphabet Existence",
        STEP_TECHNICAL_PATTERN_CHECK: "Technical Pattern Check",
        STEP_SHORT_WORD_EXCLUSION: "Short Word Exclusion Check",
        STEP_THREE_CHAR_WORD_CHECK: "3-character Word Check",
        STEP_PERIOD_START_SENTENCE_CHECK: "Period-start Sentence Check",

        REASON_EMPTY_STRING: "String is empty or null",
        REASON_CHAR_COUNT_INSUFFICIENT: "Character count insufficient ({count} chars < 3 chars)",
        REASON_POST_NORMALIZATION_INSUFFICIENT: "Character count insufficient after normalization",
        REASON_POST_EMOJI_INSUFFICIENT: "Character count insufficient after emoji removal",
        REASON_INVALID_CHARACTERS: "Contains control characters or invalid characters",
        REASON_NON_ENGLISH_SCRIPT: "Contains non-English script",
        REASON_NO_ALPHABET: "No English alphabet characters found",
        REASON_DOT_TECHNICAL_PATTERN: "Dot technical pattern",
        REASON_HASH_PATTERN: "Hash value pattern",
        REASON_URL_FORMAT: "URL format",
        REASON_PATH_FORMAT: "Path format", 
        REASON_VERSION_FORMAT: "Version number format",
        REASON_CONSTANT_FORMAT: "Constant name format (all uppercase)",
        REASON_SYMBOLS_ONLY: "Symbols only",
        REASON_PROGRAM_KEYWORDS: "Program reserved words",
        REASON_NUMBERS_SYMBOLS_ONLY: "Numbers and symbols only",
        REASON_UNNECESSARY_SHORT_WORD: "Unnecessary short word for translation",
        REASON_TWO_CHAR_WORD: "2 character or less word",
        REASON_THREE_CHAR_NO_UPPERCASE: "3-character word without uppercase, not important word",
        REASON_DOT_SENTENCE_PROTECTION: "Protected as dot-starting sentence",
        REASON_NON_TECHNICAL_THREE_CHAR: "Protected as non-technical 3-character word",

        DETAIL_EMPTY_STRING: "String is empty or null",
        DETAIL_CHAR_COUNT_INSUFFICIENT: "Strings with less than 3 characters are excluded",
        DETAIL_POST_NORMALIZATION_INSUFFICIENT: "Less than 3 characters after normalization",
        DETAIL_POST_EMOJI_INSUFFICIENT: "Less than 2 characters after emoji removal",
        DETAIL_INVALID_CHARACTERS: "Contains control characters or invalid characters",
        DETAIL_NON_ENGLISH_SCRIPT: "{scripts} detected",
        DETAIL_NO_ALPHABET: "No English alphabet characters found",
        DETAIL_TECHNICAL_PATTERN: "Detected as {pattern}",
        DETAIL_UNNECESSARY_SHORT_WORD: "Excluded as unnecessary short word for translation",
        DETAIL_SHORT_WORD: "Excluded as {type} word",
        DETAIL_DOT_SENTENCE: "Detected as English text",
        DETAIL_PLUGIN_NAME_EXCLUSION: "Excluded because it matches active plugin name",
        DETAIL_ENGLISH_PASSED: "Detected as English text",

        REASON_EMPTY_STRING_SHORT: "Empty string",
        REASON_IMPORTANT_UI_PROTECTION: "Protected as important UI word",
        REASON_NOT_IMPORTANT_UI: "Not an important UI word",
        REASON_IMPORTANT_UI_PROTECTION_SHORT: "Important UI word protection",
        STEP_PLUGIN_NAME_EXCLUSION: "Plugin Name Exclusion",
        REASON_PLUGIN_NAME_EXACT_MATCH: "Matches active plugin name",
        DETAIL_PLUGIN_NAME_EXACT_MATCH: "Excluded because it matches active plugin name",
        REASON_CHAR_COUNT_INSUFFICIENT_SHORT: "Character count insufficient", 
        REASON_POST_NORMALIZATION_INSUFFICIENT_SHORT: "Post-normalization character count insufficient",
        REASON_STRING_NORMALIZED: "String was normalized",
        REASON_NO_CHANGE: "No change",
        REASON_CHAR_COUNT: "{count} characters",
        REASON_EMOJI_REMOVED: "Emojis were removed",
        REASON_NO_EMOJI: "No emojis",
        REASON_VALID_CHARS_ONLY: "Valid characters only",
        REASON_ALPHABET_SCRIPT_ONLY: "Alphabet script characters only",
        REASON_ENGLISH_ALPHABET_EXISTS: "English alphabet exists",
        REASON_NOT_TECHNICAL_PATTERN: "Not a technical pattern",
        DETAIL_IMPORTANT_UI_PROTECTION: "Protected as an important UI word",
        DETAIL_POST_NORMALIZATION_INSUFFICIENT: "Less than 3 characters after normalization processing",
        REASON_POST_EMOJI_INSUFFICIENT_SHORT: "Post-emoji removal character count insufficient",
        REASON_CHARACTER_TYPE_FAILED: "Character type check failed",
        REASON_NON_ENGLISH_SCRIPT_SHORT: "Non-English script detected",
        REASON_NO_ALPHABET_SHORT: "No alphabet",
        REASON_TECHNICAL_PATTERN_SHORT: "Technical pattern exclusion",
        REASON_DOT_SENTENCE_PROTECTION_SHORT: "Dot sentence protection",
        REASON_NON_TECHNICAL_THREE_CHAR_SHORT: "Non-technical 3-char protection",
        REASON_ENGLISH_PASSED_SHORT: "English judgment passed",
        // SCRIPT_名前の追加
        SCRIPT_HIRAGANA: "Hiragana",
        SCRIPT_KATAKANA: "Katakana", 
        SCRIPT_HAN: "Han (Chinese characters)",
        SCRIPT_HANGUL: "Hangul",
        SCRIPT_ARABIC: "Arabic",
        SCRIPT_THAI: "Thai",
        SCRIPT_CYRILLIC: "Cyrillic",
        SCRIPT_HEBREW: "Hebrew",
        // メッセージテンプレートの追加
        SCRIPT_SINGLE_DETECTED: "{script} characters detected",
        SCRIPT_MULTIPLE_DETECTED: "Multiple scripts detected ({scripts})",
        DETAIL_DOT_TECHNICAL_PATTERN: "Detected as dot technical pattern",
        DETAIL_HASH_PATTERN: "Detected as hash value pattern", 
        DETAIL_URL_PATTERN: "Detected as URL format",
        DETAIL_PATH_PATTERN: "Detected as path format",
        DETAIL_VERSION_PATTERN: "Detected as version number format",
        DETAIL_CONSTANT_PATTERN: "Detected as constant name format (all uppercase)",
        DETAIL_SYMBOLS_PATTERN: "Detected as symbols only",
        DETAIL_PROGRAM_KEYWORDS_PATTERN: "Detected as program reserved words",
        DETAIL_NUMBERS_SYMBOLS_PATTERN: "Detected as numbers and symbols only",
        REASON_COMMON_SHORT_WORD: "Unnecessary short word for translation",
        REASON_NOT_COMMON_SHORT_WORD: "Not a common short word",
        REASON_TWO_CHAR_OR_LESS: "2 character or less word",
        REASON_THREE_CHAR_NO_UPPERCASE_IMPORTANT: "3-character word without uppercase, not important word",
        REASON_NON_TECHNICAL_THREE_CHAR_PROTECTION: "Protected as non-technical 3-character word",
        REASON_COMMON_SHORT_WORD_SHORT: "Common short word",
        REASON_SHORT_WORD_SHORT: "Short word exclusion",
        REASON_THREE_CHAR_WORD_SHORT: "3-character word exclusion",
        DETAIL_COMMON_SHORT_WORD: "Excluded as unnecessary short word for translation",
        DETAIL_TWO_CHAR_WORD: "Excluded as 2 character or less word",
        DETAIL_THREE_CHAR_WORD: "Excluded as 3-character word without uppercase, not important word",
        DETAIL_NON_TECHNICAL_THREE_CHAR_PROTECTION: "Protected as non-technical 3-character word",
        REASON_PLUGIN_NAME_MATCH_STEP: "Matches active plugin name",
        REASON_EXTRACTION_TARGET_SHORT: "Extraction target",
        DETAIL_EXTRACTION_TARGET: "This string will be extracted as a translation target",

        UPDATE_CHECK_BUTTON: "🔄 Update Check",
        UPDATE_CHECK_TOOLTIP: "Update metadata with current version",
        DELETE_BUTTON: "🗑️ Delete",
        DELETE_TOOLTIP: "Delete translation file",
        STATUS_TRANSLATED: "✅ Translated (v{version})",
        STATUS_UPDATE_REQUIRED: "🔄 Update confirmation required (Translation:v{savedVersion} → Current:v{currentVersion})",
        STATUS_UNTRANSLATED: "⚪ Untranslated",
        STATUS_UNKNOWN: "❓ Unknown",
        UPDATE_NOTICE: "Plugin has been updated. New features or strings may have been added. Update translation as needed. If no changes, press 'Update Check' button.",
        HORIZONTAL: "horizontal",
        VERTICAL: "vertical"
      },
      ja: {
        TITLE: "Community Plugin Localizer - プラグイン翻訳管理",
        LANGUAGE_SECTION: "言語",
        DISPLAY_LANGUAGE_TITLE: "表示言語",
        DISPLAY_LANGUAGE_DESC: "この設定画面、フローティングボタン、通知メッセージ、各モーダルウィンドウの表示言語を選択します",
        FLOATING_BUTTON_SECTION: "フローティングボタン",
        STORAGE_SECTION: "保存", 
        PLUGIN_LIST_SECTION: "翻訳対象プラグイン一覧（有効化中）",
        EXTRACTION_TEST_SECTION: "テスト",
        FLOATING_BUTTON_TITLE: "フローティングボタンの表示",
        FLOATING_BUTTON_DESC: "プラグイン設定画面のフローティングボタンを表示/非表示できます。（デフォルト: 表示）",
        FLOATING_BUTTON_DESC2: "ボタンが画面外に移動して見えない時の復旧にも使えます。",
        MENU_LAYOUT_TITLE: "フローティングボタンのメニュー展開方向",
        MENU_LAYOUT_DESC: "展開方向を設定します",
        MENU_LAYOUT_STATUS: "現在: 「{direction}」配置",
        STORAGE_LOCATION_TITLE2: "翻訳データの保存場所",
        STORAGE_LOCATION_DESC: "翻訳ファイルは以下の場所に保存されます",
        STORAGE_LOCATION_NOTE: "💡 削除時はゴミ箱に移動するため、誤って削除した場合も復元できます",
        OPEN_FOLDER: "📁 開く",
        OPEN_FOLDER_TOOLTIP: "翻訳フォルダをエクスプローラーで開く",
        STRING_EXTRACTION_TEST_NAME: "抽出検出テスト",
        STRING_EXTRACTION_TEST_DESC1: "任意の文字列が抽出対象になるかテストできます",
        STRING_EXTRACTION_TEST_DESC2: "このテストは文字列レベルでの判定のみを行います。",
        STRING_EXTRACTION_TEST_DESC3: "実際の抽出時は、DOM要素の文脈も考慮されるため、結果が異なる場合があります。",
        TEST_PLACEHOLDER: "翻訳対象になるかテストしたい文字列を入力してください...",
        TEST_BUTTON: "🔍 抽出判定を実行",
        CLEAR_BUTTON: "🗑️ クリア",
        TEST_ERROR_EMPTY: "❌ 文字列を入力してください",
        TEST_RESULT_SUCCESS: "✅ 抽出対象",
        TEST_RESULT_FAILED: "❌ 抽出対象外", 
        TEST_RESULT_ERROR: "❌ エラーが発生しました",
        TEST_INPUT_LABEL: "📝 入力:",
        TEST_NORMALIZED_LABEL: "📝 正規化後:",
        TEST_NORMALIZED_NO_CHANGE: "(変更なし)",
        TEST_EXCLUDE_REASON: "❌ 除外理由:",
        TEST_DETAIL_LABEL: "💡 詳細:",
        TEST_STEPS_TITLE: "📊 検出ステップ:",
        STEP_BASIC_CHECK: "基本チェック",
        STEP_IMPORTANT_UI_PROTECTION: "重要UI語保護",
        STEP_LENGTH_CHECK: "長さチェック", 
        STEP_NORMALIZATION: "正規化処理",
        STEP_POST_NORMALIZATION_CHECK: "正規化後チェック",
        STEP_EMOJI_REMOVAL: "絵文字除去",
        STEP_POST_EMOJI_CHECK: "絵文字除去後チェック",
        STEP_CHARACTER_TYPE_CHECK: "文字種チェック",
        STEP_ALPHABET_SCRIPT_CHECK: "アルファベット文字判定",
        STEP_ALPHABET_EXISTENCE: "アルファベット存在",
        STEP_TECHNICAL_PATTERN_CHECK: "技術パターンチェック",
        STEP_SHORT_WORD_EXCLUSION: "短い単語の除外チェック",
        STEP_THREE_CHAR_WORD_CHECK: "3文字単語判定",
        STEP_PERIOD_START_SENTENCE_CHECK: "ピリオド始まり文章判定",
        
        REASON_EMPTY_STRING: "文字列が空またはnull",
        REASON_CHAR_COUNT_INSUFFICIENT: "文字数不足 ({count}文字 < 3文字)",
        REASON_POST_NORMALIZATION_INSUFFICIENT: "正規化後に文字数不足",
        REASON_POST_EMOJI_INSUFFICIENT: "絵文字除去後に文字数不足",
        REASON_INVALID_CHARACTERS: "制御文字や無効な文字が含まれています",
        REASON_NON_ENGLISH_SCRIPT: "アルファベット以外の文字が含まれています",
        REASON_NO_ALPHABET: "英語のアルファベットが含まれていません",
        REASON_DOT_TECHNICAL_PATTERN: "ピリオド技術パターン",
        REASON_HASH_PATTERN: "ハッシュ値パターン",
        REASON_URL_FORMAT: "URL形式",
        REASON_PATH_FORMAT: "パス形式",
        REASON_VERSION_FORMAT: "バージョン番号形式",
        REASON_CONSTANT_FORMAT: "定数名形式 (全て大文字)",
        REASON_SYMBOLS_ONLY: "記号のみ",
        REASON_PROGRAM_KEYWORDS: "プログラム予約語",
        REASON_NUMBERS_SYMBOLS_ONLY: "数字と記号のみ",
        REASON_UNNECESSARY_SHORT_WORD: "翻訳不要な短い単語です",
        REASON_TWO_CHAR_WORD: "2文字以下の単語",
        REASON_THREE_CHAR_NO_UPPERCASE: "大文字なし・重要語でない3文字単語",
        REASON_DOT_SENTENCE_PROTECTION: "ピリオド始まり文章として保護",
        REASON_NON_TECHNICAL_THREE_CHAR: "技術用語以外の3文字単語として保護",

        DETAIL_EMPTY_STRING: "文字列が空またはnullです",
        DETAIL_CHAR_COUNT_INSUFFICIENT: "3文字未満の文字列は除外されます",
        DETAIL_POST_NORMALIZATION_INSUFFICIENT: "正規化処理後に3文字未満になりました",
        DETAIL_POST_EMOJI_INSUFFICIENT: "絵文字を除去すると2文字未満になります",
        DETAIL_INVALID_CHARACTERS: "制御文字や無効な文字が含まれています",
        DETAIL_NON_ENGLISH_SCRIPT: "{scripts}が検出されました",
        DETAIL_NO_ALPHABET: "英語のアルファベットが含まれていません",
        DETAIL_TECHNICAL_PATTERN: "{pattern}として検出されました",
        DETAIL_UNNECESSARY_SHORT_WORD: "翻訳不要な短い単語として除外されました",
        DETAIL_SHORT_WORD: "{type}単語として除外されました",
        DETAIL_DOT_SENTENCE: "英語テキストとして検出されました", 
        DETAIL_ENGLISH_PASSED: "英語テキストとして検出されました", 

        REASON_EMPTY_STRING_SHORT: "空文字列",
        REASON_IMPORTANT_UI_PROTECTION: "重要なUI語として保護されました",
        REASON_NOT_IMPORTANT_UI: "重要UI語ではない",
        REASON_IMPORTANT_UI_PROTECTION_SHORT: "重要UI語保護",
        STEP_PLUGIN_NAME_EXCLUSION: "プラグイン名除外",
        REASON_PLUGIN_NAME_EXACT_MATCH: "アクティブなプラグイン名と一致",
        DETAIL_PLUGIN_NAME_EXACT_MATCH: "アクティブなプラグイン名と一致するため除外",
        REASON_CHAR_COUNT_INSUFFICIENT_SHORT: "文字数不足",
        REASON_POST_NORMALIZATION_INSUFFICIENT_SHORT: "正規化後文字数不足",
        REASON_STRING_NORMALIZED: "文字列が正規化されました",
        REASON_NO_CHANGE: "変更なし",
        REASON_CHAR_COUNT: "{count}文字",
        REASON_EMOJI_REMOVED: "絵文字が除去されました",
        REASON_NO_EMOJI: "絵文字なし",
        REASON_VALID_CHARS_ONLY: "有効な文字のみ",
        REASON_ALPHABET_SCRIPT_ONLY: "アルファベット系文字のみ",
        REASON_ENGLISH_ALPHABET_EXISTS: "英語アルファベットあり",
        REASON_NOT_TECHNICAL_PATTERN: "技術パターンではない",
        DETAIL_IMPORTANT_UI_PROTECTION: "重要なUI語として保護されました",
        DETAIL_POST_NORMALIZATION_INSUFFICIENT: "正規化処理後に3文字未満になりました",
        REASON_POST_EMOJI_INSUFFICIENT_SHORT: "絵文字除去後文字数不足",
        REASON_CHARACTER_TYPE_FAILED: "文字種チェック失敗",
        REASON_NON_ENGLISH_SCRIPT_SHORT: "アルファベット以外の文字検出",
        REASON_NO_ALPHABET_SHORT: "アルファベット不存在",
        REASON_TECHNICAL_PATTERN_SHORT: "技術パターン除外",
        REASON_DOT_SENTENCE_PROTECTION_SHORT: "ピリオド文章保護",
        REASON_NON_TECHNICAL_THREE_CHAR_SHORT: "非技術3文字保護",
        REASON_ENGLISH_PASSED_SHORT: "英語判定通過",
        // SCRIPT_名前の追加
        SCRIPT_HIRAGANA: "ひらがな文字",
        SCRIPT_KATAKANA: "カタカナ文字",
        SCRIPT_HAN: "漢字",
        SCRIPT_HANGUL: "ハングル文字", 
        SCRIPT_ARABIC: "アラビア文字",
        SCRIPT_THAI: "タイ文字",
        SCRIPT_CYRILLIC: "キリル文字",
        SCRIPT_HEBREW: "ヘブライ文字",

        // メッセージテンプレートの追加
        SCRIPT_SINGLE_DETECTED: "{script}が含まれています",
        SCRIPT_MULTIPLE_DETECTED: "複数の文字体系（{scripts}）が含まれています",
        DETAIL_DOT_TECHNICAL_PATTERN: "ピリオド技術パターンとして検出されました",
        DETAIL_HASH_PATTERN: "ハッシュ値パターンとして検出されました",
        DETAIL_URL_PATTERN: "URL形式として検出されました", 
        DETAIL_PATH_PATTERN: "パス形式として検出されました",
        DETAIL_VERSION_PATTERN: "バージョン番号形式として検出されました",
        DETAIL_CONSTANT_PATTERN: "定数名形式 (全て大文字)として検出されました",
        DETAIL_SYMBOLS_PATTERN: "記号のみとして検出されました",
        DETAIL_PROGRAM_KEYWORDS_PATTERN: "プログラム予約語として検出されました",
        DETAIL_NUMBERS_SYMBOLS_PATTERN: "数字と記号のみとして検出されました",
        REASON_COMMON_SHORT_WORD: "翻訳不要な短い単語です",
        REASON_NOT_COMMON_SHORT_WORD: "一般的短語ではない",
        REASON_TWO_CHAR_OR_LESS: "2文字以下の単語",
        REASON_THREE_CHAR_NO_UPPERCASE_IMPORTANT: "大文字なし・重要語でない3文字単語",
        REASON_NON_TECHNICAL_THREE_CHAR_PROTECTION: "技術用語以外の3文字単語として保護",
        REASON_COMMON_SHORT_WORD_SHORT: "一般的な短い単語",
        REASON_SHORT_WORD_SHORT: "短い単語の除外",
        REASON_THREE_CHAR_WORD_SHORT: "3文字単語除外",
        DETAIL_COMMON_SHORT_WORD: "翻訳不要な短い単語として除外されました",
        DETAIL_TWO_CHAR_WORD: "2文字以下の単語として除外されました",
        DETAIL_THREE_CHAR_WORD: "大文字なし・重要語でない3文字単語として除外されました",
        DETAIL_NON_TECHNICAL_THREE_CHAR_PROTECTION: "技術用語以外の3文字単語として保護されました",
        REASON_PLUGIN_NAME_MATCH_STEP: "有効なプラグイン名と一致",
        REASON_EXTRACTION_TARGET_SHORT: "抽出対象",
        DETAIL_PLUGIN_NAME_EXCLUSION: "有効なプラグイン名と一致するため除外されました",
        DETAIL_EXTRACTION_TARGET: "この文字列は翻訳対象として抽出されます",

        UPDATE_CHECK_BUTTON: "🔄 更新確認",
        UPDATE_CHECK_TOOLTIP: "現在のバージョンでメタデータを更新",
        DELETE_BUTTON: "🗑️ 削除",
        DELETE_TOOLTIP: "翻訳ファイルを削除",
        STATUS_TRANSLATED: "✅ 翻訳済み（v{version}）",
        STATUS_UPDATE_REQUIRED: "🔄 更新確認が必要（翻訳:v{savedVersion} → 現在:v{currentVersion}）",
        STATUS_UNTRANSLATED: "⚪ 未翻訳",
        STATUS_UNKNOWN: "❓ 不明",
        UPDATE_NOTICE: "プラグインが更新されています。新しい機能や文字列が追加されている可能性があります。必要に応じて翻訳を更新してください。変更がない場合は「更新確認」ボタンを押してください。",
        HORIZONTAL: "横方向",
        VERTICAL: "縦方向",
      },
      ko: {
        TITLE: "Community Plugin Localizer - 플러그인 번역 관리",
        LANGUAGE_SECTION: "언어",
        DISPLAY_LANGUAGE_TITLE: "표시 언어",
        DISPLAY_LANGUAGE_DESC: "설정 화면, 플로팅 버튼, 알림 메시지, 모달 창의 표시 언어를 선택합니다",
        FLOATING_BUTTON_SECTION: "플로팅 버튼",
        STORAGE_SECTION: "저장",
        PLUGIN_LIST_SECTION: "번역 대상 플러그인 목록 (활성화됨)",
        EXTRACTION_TEST_SECTION: "테스트",
        FLOATING_BUTTON_TITLE: "플로팅 버튼 표시",
        FLOATING_BUTTON_DESC: "플러그인 설정 화면의 플로팅 버튼을 표시/숨김할 수 있습니다. (기본값: 표시)",
        FLOATING_BUTTON_DESC2: "버튼이 화면 밖으로 이동하여 보이지 않을 때 복구에도 사용할 수 있습니다.",
        MENU_LAYOUT_TITLE: "플로팅 버튼 메뉴 전개 방향",
        MENU_LAYOUT_DESC: "전개 방향을 설정합니다",
        MENU_LAYOUT_STATUS: "현재: 「{direction}」 배치",
        STORAGE_LOCATION_TITLE2: "번역 데이터 저장 위치",
        STORAGE_LOCATION_DESC: "번역 파일은 다음 위치에 저장됩니다",
        STORAGE_LOCATION_NOTE: "💡 삭제 시 휴지통으로 이동되므로 실수로 삭제해도 복원 가능합니다",
        OPEN_FOLDER: "📁 열기",
        OPEN_FOLDER_TOOLTIP: "번역 폴더를 탐색기에서 열기",
        STRING_EXTRACTION_TEST_NAME: "추출 감지 테스트",
        STRING_EXTRACTION_TEST_DESC1: "임의의 문자열이 추출 대상이 되는지 테스트할 수 있습니다",
        STRING_EXTRACTION_TEST_DESC2: "이 테스트는 문자열 수준의 감지만 수행합니다.",
        STRING_EXTRACTION_TEST_DESC3: "실제 추출 시에는 DOM 요소의 맥락도 고려하므로 결과가 다를 수 있습니다.",
        TEST_PLACEHOLDER: "번역 대상이 되는지 테스트하고 싶은 문자열을 입력하세요...",
        TEST_BUTTON: "🔍 추출 판정 실행",
        CLEAR_BUTTON: "🗑️ 클리어",
        TEST_ERROR_EMPTY: "❌ 문자열을 입력해주세요",
        TEST_RESULT_SUCCESS: "✅ 추출 대상",
        TEST_RESULT_FAILED: "❌ 추출 대상 외",
        TEST_RESULT_ERROR: "❌ 오류가 발생했습니다",
        TEST_INPUT_LABEL: "📝 입력:",
        TEST_NORMALIZED_LABEL: "📝 정규화 후:",
        TEST_NORMALIZED_NO_CHANGE: "(변경 없음)",
        TEST_EXCLUDE_REASON: "❌ 제외 이유:",
        TEST_DETAIL_LABEL: "💡 세부사항:",
        TEST_STEPS_TITLE: "📊 감지 단계:",
        STEP_BASIC_CHECK: "기본 검사",
        STEP_IMPORTANT_UI_PROTECTION: "중요 UI 단어 보호",
        STEP_LENGTH_CHECK: "길이 검사",
        STEP_NORMALIZATION: "정규화 처리",
        STEP_POST_NORMALIZATION_CHECK: "정규화 후 검사",
        STEP_EMOJI_REMOVAL: "이모지 제거",
        STEP_POST_EMOJI_CHECK: "이모지 제거 후 검사",
        STEP_CHARACTER_TYPE_CHECK: "문자 유형 검사",
        STEP_ALPHABET_SCRIPT_CHECK: "알파벳 문자 판정",
        STEP_ALPHABET_EXISTENCE: "알파벳 존재",
        STEP_TECHNICAL_PATTERN_CHECK: "기술 패턴 검사",
        STEP_SHORT_WORD_EXCLUSION: "짧은 단어 제외 검사",
        STEP_THREE_CHAR_WORD_CHECK: "3글자 단어 판정",
        STEP_PERIOD_START_SENTENCE_CHECK: "마침표 시작 문장 판정",
        STEP_PLUGIN_NAME_EXCLUSION: "플러그인 이름 제외",
        REASON_EMPTY_STRING: "문자열이 비어있거나 null입니다",
        REASON_CHAR_COUNT_INSUFFICIENT: "문자 수 부족 ({count}자 < 3자)",
        REASON_POST_NORMALIZATION_INSUFFICIENT: "정규화 후 문자 수 부족",
        REASON_POST_EMOJI_INSUFFICIENT: "이모지 제거 후 문자 수 부족",
        REASON_INVALID_CHARACTERS: "제어 문자나 유효하지 않은 문자가 포함되어 있습니다",
        REASON_NON_ENGLISH_SCRIPT: "알파벳 이외의 문자가 포함되어 있습니다",
        REASON_NO_ALPHABET: "영어 알파벳이 포함되어 있지 않습니다",
        REASON_DOT_TECHNICAL_PATTERN: "마침표 기술 패턴",
        REASON_HASH_PATTERN: "해시값 패턴",
        REASON_URL_FORMAT: "URL 형식",
        REASON_PATH_FORMAT: "경로 형식",
        REASON_VERSION_FORMAT: "버전 번호 형식",
        REASON_CONSTANT_FORMAT: "상수명 형식 (모두 대문자)",
        REASON_SYMBOLS_ONLY: "기호만",
        REASON_PROGRAM_KEYWORDS: "프로그램 예약어",
        REASON_NUMBERS_SYMBOLS_ONLY: "숫자와 기호만",
        REASON_UNNECESSARY_SHORT_WORD: "번역이 불필요한 짧은 단어입니다",
        REASON_TWO_CHAR_WORD: "2글자 이하 단어",
        REASON_THREE_CHAR_NO_UPPERCASE: "대문자 없음・중요어가 아닌 3글자 단어",
        REASON_DOT_SENTENCE_PROTECTION: "마침표 시작 문장으로 보호",
        REASON_NON_TECHNICAL_THREE_CHAR: "기술용어가 아닌 3글자 단어로 보호",
        REASON_IMPORTANT_UI_PROTECTION: "중요한 UI 단어로 보호되었습니다",
        REASON_NOT_IMPORTANT_UI: "중요 UI 단어가 아님",
        REASON_PLUGIN_NAME_EXACT_MATCH: "활성화된 플러그인 이름과 일치",
        REASON_EMPTY_STRING_SHORT: "빈 문자열",
        REASON_IMPORTANT_UI_PROTECTION_SHORT: "중요 UI 단어 보호",
        REASON_CHAR_COUNT_INSUFFICIENT_SHORT: "문자 수 부족",
        REASON_POST_NORMALIZATION_INSUFFICIENT_SHORT: "정규화 후 문자 수 부족",
        REASON_STRING_NORMALIZED: "문자열이 정규화되었습니다",
        REASON_NO_CHANGE: "변경 없음",
        REASON_CHAR_COUNT: "{count}자",
        REASON_EMOJI_REMOVED: "이모지가 제거되었습니다",
        REASON_NO_EMOJI: "이모지 없음",
        REASON_VALID_CHARS_ONLY: "유효한 문자만",
        REASON_ALPHABET_SCRIPT_ONLY: "알파벳계 문자만",
        REASON_ENGLISH_ALPHABET_EXISTS: "영어 알파벳 존재",
        REASON_NOT_TECHNICAL_PATTERN: "기술 패턴이 아님",
        REASON_POST_EMOJI_INSUFFICIENT_SHORT: "이모지 제거 후 문자 수 부족",
        REASON_CHARACTER_TYPE_FAILED: "문자 유형 검사 실패",
        REASON_NON_ENGLISH_SCRIPT_SHORT: "알파벳 이외 문자 감지",
        REASON_NO_ALPHABET_SHORT: "알파벳 부존재",
        REASON_TECHNICAL_PATTERN_SHORT: "기술 패턴 제외",
        REASON_DOT_SENTENCE_PROTECTION_SHORT: "마침표 문장 보호",
        REASON_NON_TECHNICAL_THREE_CHAR_SHORT: "비기술 3글자 보호",
        REASON_ENGLISH_PASSED_SHORT: "영어 판정 통과",
        REASON_COMMON_SHORT_WORD: "번역이 불필요한 짧은 단어입니다",
        REASON_NOT_COMMON_SHORT_WORD: "일반적인 짧은 단어가 아님",
        REASON_TWO_CHAR_OR_LESS: "2글자 이하 단어",
        REASON_THREE_CHAR_NO_UPPERCASE_IMPORTANT: "대문자 없음・중요어가 아닌 3글자 단어",
        REASON_NON_TECHNICAL_THREE_CHAR_PROTECTION: "기술용어가 아닌 3글자 단어로 보호",
        REASON_COMMON_SHORT_WORD_SHORT: "일반적인 짧은 단어",
        REASON_SHORT_WORD_SHORT: "짧은 단어 제외",
        REASON_THREE_CHAR_WORD_SHORT: "3글자 단어 제외",
        REASON_PLUGIN_NAME_MATCH_STEP: "활성화된 플러그인 이름과 일치",
        REASON_EXTRACTION_TARGET_SHORT: "추출 대상",
        SCRIPT_HIRAGANA: "히라가나 문자",
        SCRIPT_KATAKANA: "가타카나 문자",
        SCRIPT_HAN: "한자",
        SCRIPT_HANGUL: "한글 문자",
        SCRIPT_ARABIC: "아랍 문자",
        SCRIPT_THAI: "태국 문자",
        SCRIPT_CYRILLIC: "키릴 문자",
        SCRIPT_HEBREW: "히브리 문자",
        SCRIPT_SINGLE_DETECTED: "{script}가 포함되어 있습니다",
        SCRIPT_MULTIPLE_DETECTED: "여러 문자 체계({scripts})가 포함되어 있습니다",
        DETAIL_EMPTY_STRING: "문자열이 비어있거나 null입니다",
        DETAIL_CHAR_COUNT_INSUFFICIENT: "3글자 미만의 문자열은 제외됩니다",
        DETAIL_POST_NORMALIZATION_INSUFFICIENT: "정규화 처리 후 3글자 미만이 되었습니다",
        DETAIL_POST_EMOJI_INSUFFICIENT: "이모지를 제거하면 2글자 미만이 됩니다",
        DETAIL_INVALID_CHARACTERS: "제어 문자나 유효하지 않은 문자가 포함되어 있습니다",
        DETAIL_NON_ENGLISH_SCRIPT: "{scripts}가 감지되었습니다",
        DETAIL_NO_ALPHABET: "영어 알파벳이 포함되어 있지 않습니다",
        DETAIL_TECHNICAL_PATTERN: "{pattern}으로 감지되었습니다",
        DETAIL_UNNECESSARY_SHORT_WORD: "번역이 불필요한 짧은 단어로 제외되었습니다",
        DETAIL_SHORT_WORD: "{type} 단어로 제외되었습니다",
        DETAIL_DOT_SENTENCE: "영어 텍스트로 감지되었습니다",
        DETAIL_ENGLISH_PASSED: "영어 텍스트로 감지되었습니다",
        DETAIL_IMPORTANT_UI_PROTECTION: "중요한 UI 단어로 보호되었습니다",
        DETAIL_PLUGIN_NAME_EXACT_MATCH: "활성화된 플러그인 이름과 일치하므로 제외",
        DETAIL_DOT_TECHNICAL_PATTERN: "마침표 기술 패턴으로 감지되었습니다",
        DETAIL_HASH_PATTERN: "해시값 패턴으로 감지되었습니다",
        DETAIL_URL_PATTERN: "URL 형식으로 감지되었습니다",
        DETAIL_PATH_PATTERN: "경로 형식으로 감지되었습니다",
        DETAIL_VERSION_PATTERN: "버전 번호 형식으로 감지되었습니다",
        DETAIL_CONSTANT_PATTERN: "상수명 형식(모두 대문자)으로 감지되었습니다",
        DETAIL_SYMBOLS_PATTERN: "기호만으로 감지되었습니다",
        DETAIL_PROGRAM_KEYWORDS_PATTERN: "프로그램 예약어로 감지되었습니다",
        DETAIL_NUMBERS_SYMBOLS_PATTERN: "숫자와 기호만으로 감지되었습니다",
        DETAIL_COMMON_SHORT_WORD: "번역이 불필요한 짧은 단어로 제외되었습니다",
        DETAIL_TWO_CHAR_WORD: "2글자 이하 단어로 제외되었습니다",
        DETAIL_THREE_CHAR_WORD: "대문자 없음・중요어가 아닌 3글자 단어로 제외되었습니다",
        DETAIL_NON_TECHNICAL_THREE_CHAR_PROTECTION: "기술용어가 아닌 3글자 단어로 보호되었습니다",
        DETAIL_PLUGIN_NAME_EXCLUSION: "활성화된 플러그인 이름과 일치하므로 제외되었습니다",
        DETAIL_EXTRACTION_TARGET: "이 문자열은 번역 대상으로 추출됩니다",
        UPDATE_CHECK_BUTTON: "🔄 업데이트 확인",
        UPDATE_CHECK_TOOLTIP: "현재 버전으로 메타데이터 업데이트",
        DELETE_BUTTON: "🗑️ 삭제",
        DELETE_TOOLTIP: "번역 파일 삭제",
        STATUS_TRANSLATED: "✅ 번역 완료 (v{version})",
        STATUS_UPDATE_REQUIRED: "🔄 업데이트 확인 필요 (번역:v{savedVersion} → 현재:v{currentVersion})",
        STATUS_UNTRANSLATED: "⚪ 번역되지 않음",
        STATUS_UNKNOWN: "❓ 알 수 없음",
        UPDATE_NOTICE: "플러그인이 업데이트되었습니다. 새로운 기능이나 문자열이 추가되었을 가능성이 있습니다. 필요에 따라 번역을 업데이트하세요. 변경사항이 없다면 '업데이트 확인' 버튼을 눌러주세요.",
        HORIZONTAL: "가로 방향",
        VERTICAL: "세로 방향"
      }
    };

    this.uiMessages = {
      en: {
        EXTRACT: "📋 Extract",
        PASTE: "📝 Paste Translation", 
        EDIT: "✏️ Edit",
        DELETE: "🗑️ Delete",
        TRANSLATION_ON: "🌐 Translation ON",
        TRANSLATION_OFF: "🌐 Translation OFF",
        EDIT_AVAILABLE: "Edit existing translation",
        EDIT_UNAVAILABLE: "No translation file exists. Run 'Extract' → 'Paste' first",
        DELETE_AVAILABLE: "Delete translation file", 
        DELETE_UNAVAILABLE: "No translation file exists"
      },
      ja: {
        EXTRACT: "📋 抽出",
        PASTE: "📝 翻訳を貼付", 
        EDIT: "✏️ 編集",
        DELETE: "🗑️ 削除",
        TRANSLATION_ON: "🌐 翻訳ON",
        TRANSLATION_OFF: "🌐 翻訳OFF",
        EDIT_AVAILABLE: "既存の翻訳を編集",
        EDIT_UNAVAILABLE: "翻訳ファイルがありません。先に「抽出」→「貼付」を実行してください",
        DELETE_AVAILABLE: "翻訳ファイルを削除", 
        DELETE_UNAVAILABLE: "翻訳ファイルがありません"
      },
      ko: {
        EXTRACT: "📋 추출",
        PASTE: "📝 번역 붙여넣기",
        EDIT: "✏️ 편집",
        DELETE: "🗑️ 삭제",
        TRANSLATION_ON: "🌐 번역 ON",
        TRANSLATION_OFF: "🌐 번역 OFF",
        EDIT_AVAILABLE: "기존 번역 편집",
        EDIT_UNAVAILABLE: "번역 파일이 없습니다. 먼저 '추출' → '붙여넣기'를 실행해주세요",
        DELETE_AVAILABLE: "번역 파일 삭제",
        DELETE_UNAVAILABLE: "번역 파일이 없습니다"
      }
    };

    this.modalMessages = {
      en: {
        // Translation Preview Modal
        TRANSLATION_PREVIEW_TITLE: "Translation Preview - {pluginName}",
        SEARCH_PLACEHOLDER: "Search... (Enter: next, Shift+Enter: previous)",
        BOTH: "Both",
        ORIGINAL: "Original", 
        TRANSLATION: "Translation",
        PREVIOUS_RESULT: "Previous result",
        NEXT_RESULT: "Next result",
        CANCEL: "Cancel",
        SAVE: "Save",
        COPY_ORIGINAL_TOOLTIP: "Copy this original text to clipboard",
        MOVE_UP_TOOLTIP: "Move this line content to empty line above",
        MOVE_DOWN_TOOLTIP: "Clear this line and shift content below down",
        TRANSLATION_STATUS: "✅ Translation completed: {completed}/{total} lines",
        TRANSLATION_STATUS_INCOMPLETE: "📝 Translation completed: {completed}/{total} lines",
        BUTTON_MOVE_UP_DISABLED_ALL_COMPLETED: "All lines completed, cannot move lines",
        BUTTON_MOVE_UP_DISABLED_EMPTY_LINE: "Cannot move empty line",
        BUTTON_MOVE_UP_DISABLED_NO_TARGET: "No target empty line found above",
        BUTTON_MOVE_DOWN_DISABLED_ALL_COMPLETED: "All lines completed, cannot move lines", 
        BUTTON_MOVE_DOWN_DISABLED_EMPTY_LINE: "Cannot move empty line",
        BUTTON_MOVE_DOWN_DISABLED_LAST_LINE: "Cannot move from last line",
        BUTTON_MOVE_DOWN_DISABLED_NO_TARGET: "No target empty line found below",
        SEARCH_RESULTS_NONE: "0 results",
        SEARCH_RESULTS_COUNT: "{current}/{total} results",
        
        // Chunk Management Modal
        CHUNK_MANAGEMENT_TITLE: "Chunk Management - {pluginName}",
        TRANSLATION_COMPLETED: "Completed",
        LINE_MISMATCH: "Line Mismatch", 
        UNTRANSLATED: "Untranslated",
        COPY_CHUNK: "📋 Copy",
        PASTE_CHUNK: "📝 Paste",
        EDIT_CHUNK: "✏️ Edit",
        MOVE_TO_PREVIEW: "Move to Translation Preview",
        CLOSE: "Close",
        STATS_TOTAL_CHARS: "📊 Total characters: {totalCharacters} chars → split into {totalChunks} chunks",
        STATS_TRANSLATION_STATUS: "🔄 Translation status: {progressIndicator} {completedChunks}/{totalChunks} completed",
        STATUS_MISMATCH_ERROR: "❌ {mismatchChunks} chunks have line count mismatches.",
        STATUS_MISMATCH_INSTRUCTION: "Please adjust translations using the Edit button.",
        STATUS_NO_TRANSLATION: "📝 Please translate each chunk.",
        STATUS_IN_PROGRESS: "⏳ Translation in progress... ({completedChunks}/{totalChunks})",
        STATUS_IN_PROGRESS_REMAINING: "Remaining {remainingChunks} chunks need translation.",
        STATUS_ALL_COMPLETED: "✅ All chunks translation completed.",
        STATUS_ALL_COMPLETED_INSTRUCTION1: "You can move to translation preview screen",
        STATUS_ALL_COMPLETED_INSTRUCTION2: "(Chunks will be automatically merged)",
        EDIT_CHUNK_MISMATCH: "Fix line count mismatch",
        EDIT_CHUNK_NORMAL: "Edit translation content", 
        EDIT_CHUNK_PENDING: "Translation must be pasted before editing",
        PREVIEW_DISABLED_MISMATCH: "Cannot merge due to chunks with line count mismatches",
        PREVIEW_DISABLED_INCOMPLETE: "Can merge after all chunks translation completed",
        PREVIEW_ENABLED: "Merge all chunks and open translation preview",

        // Chunk Edit Modal
        CHUNK_EDIT_TITLE: "Chunk Edit - Chunk{chunkId}",
        CHUNK_HEADER: "Chunk{chunkId} ({characterCount} chars)",
        
        // Delete Confirmation Modal
        DELETE_CONFIRM_TITLE: "Confirm Translation File Deletion - {pluginName}",
        DELETE_WARNING_TITLE: "⚠️ Important Warning",
        DELETE_WARNING_TEXT: "The following translation file will be deleted:",
        DELETE_RESULT_TITLE: "📋 Result after deletion:",
        DELETE_RESULT_TRASH: "• Translation file will be moved to trash",
        DELETE_RESULT_RECOVERABLE: "• Can be recovered from trash",
        DELETE_EXECUTE: "Delete"
      },
      ja: {
        // Translation Preview Modal
        TRANSLATION_PREVIEW_TITLE: "翻訳プレビュー - {pluginName}",
        SEARCH_PLACEHOLDER: "検索... (Enter: 次へ, Shift+Enter: 前へ)",
        BOTH: "両方",
        ORIGINAL: "原文",
        TRANSLATION: "翻訳",
        PREVIOUS_RESULT: "前の結果",
        NEXT_RESULT: "次の結果",
        CANCEL: "キャンセル",
        SAVE: "保存",
        COPY_ORIGINAL_TOOLTIP: "このオリジナルテキストをクリップボードにコピー",
        MOVE_UP_TOOLTIP: "この行の内容を上の空行に移動",
        MOVE_DOWN_TOOLTIP: "この行を空白にして以降を下にずらす",
        TRANSLATION_STATUS: "✅ 翻訳完了: {completed}/{total}行",
        TRANSLATION_STATUS_INCOMPLETE: "📝 翻訳完了: {completed}/{total}行",
        BUTTON_MOVE_UP_DISABLED_ALL_COMPLETED: "すべて入力済みのため行移動は無効です",
        BUTTON_MOVE_UP_DISABLED_EMPTY_LINE: "空行のため移動できません", 
        BUTTON_MOVE_UP_DISABLED_NO_TARGET: "上に移動先の空行がありません",
        BUTTON_MOVE_DOWN_DISABLED_ALL_COMPLETED: "すべて入力済みのため行移動は無効です",
        BUTTON_MOVE_DOWN_DISABLED_EMPTY_LINE: "空行のため移動できません",
        BUTTON_MOVE_DOWN_DISABLED_LAST_LINE: "最下行のため移動できません",
        BUTTON_MOVE_DOWN_DISABLED_NO_TARGET: "下に移動先の空行がありません",
        SEARCH_RESULTS_NONE: "0件",
        SEARCH_RESULTS_COUNT: "{current}/{total}件",
        
        // Chunk Management Modal
        CHUNK_MANAGEMENT_TITLE: "チャンク管理 - {pluginName}",
        TRANSLATION_COMPLETED: "翻訳完了",
        LINE_MISMATCH: "行数不一致", 
        UNTRANSLATED: "未翻訳",
        COPY_CHUNK: "📋 コピー",
        PASTE_CHUNK: "📝 貼付",
        EDIT_CHUNK: "✏️ 編集",
        MOVE_TO_PREVIEW: "翻訳プレビューへ移動",
        CLOSE: "閉じる",
        STATS_TOTAL_CHARS: "📊 総文字数: {totalCharacters}文字 → {totalChunks}チャンクに分割",
        STATS_TRANSLATION_STATUS: "🔄 翻訳状況: {progressIndicator} {completedChunks}/{totalChunks} 完了",
        STATUS_MISMATCH_ERROR: "❌ {mismatchChunks}個のチャンクで行数が不一致です。",
        STATUS_MISMATCH_INSTRUCTION: "編集ボタンで翻訳を調整してください。",
        STATUS_NO_TRANSLATION: "📝 各チャンクを翻訳してください。",
        STATUS_IN_PROGRESS: "⏳ 翻訳進行中... ({completedChunks}/{totalChunks})",
        STATUS_IN_PROGRESS_REMAINING: "残り{remainingChunks}チャンクの翻訳が必要です。",
        STATUS_ALL_COMPLETED: "✅ 全チャンクの翻訳が完了しました。",
        STATUS_ALL_COMPLETED_INSTRUCTION1: "翻訳プレビュー画面に移動できます",
        STATUS_ALL_COMPLETED_INSTRUCTION2: "(チャンクは自動統合されます)",
        EDIT_CHUNK_MISMATCH: "行数不一致を修正",
        EDIT_CHUNK_NORMAL: "翻訳内容を編集", 
        EDIT_CHUNK_PENDING: "翻訳を貼付してから編集できます",
        PREVIEW_DISABLED_MISMATCH: "行数不一致のチャンクがあるため統合できません",
        PREVIEW_DISABLED_INCOMPLETE: "全てのチャンクの翻訳完了後に統合できます",
        PREVIEW_ENABLED: "全チャンクを統合して翻訳プレビューを開きます",
        
        // Chunk Edit Modal
        CHUNK_EDIT_TITLE: "チャンク編集 - チャンク{chunkId}",
        CHUNK_HEADER: "チャンク{chunkId} ({characterCount}文字)",
        
        // Delete Confirmation Modal
        DELETE_CONFIRM_TITLE: "翻訳ファイル削除の確認 - {pluginName}",
        DELETE_WARNING_TITLE: "⚠️ 重要な警告",
        DELETE_WARNING_TEXT: "以下の翻訳ファイルを削除します：",
        DELETE_RESULT_TITLE: "📋 削除実行後の結果:",
        DELETE_RESULT_TRASH: "• 翻訳ファイルがゴミ箱に移動されます",
        DELETE_RESULT_RECOVERABLE: "• ゴミ箱から復元可能です",
        DELETE_EXECUTE: "削除"
      },
      ko: {
        TRANSLATION_PREVIEW_TITLE: "번역 미리보기 - {pluginName}",
        SEARCH_PLACEHOLDER: "검색... (Enter: 다음, Shift+Enter: 이전)",
        BOTH: "모두",
        ORIGINAL: "원문",
        TRANSLATION: "번역",
        PREVIOUS_RESULT: "이전 결과",
        NEXT_RESULT: "다음 결과",
        CANCEL: "취소",
        SAVE: "저장",
        COPY_ORIGINAL_TOOLTIP: "이 원본 텍스트를 클립보드에 복사",
        MOVE_UP_TOOLTIP: "이 행의 내용을 위의 빈 행으로 이동",
        MOVE_DOWN_TOOLTIP: "이 행을 비우고 이후를 아래로 이동",
        TRANSLATION_STATUS: "✅ 번역 완료: {completed}/{total}행",
        TRANSLATION_STATUS_INCOMPLETE: "📝 번역 완료: {completed}/{total}행",
        BUTTON_MOVE_UP_DISABLED_ALL_COMPLETED: "모든 입력이 완료되어 행 이동이 무효입니다",
        BUTTON_MOVE_UP_DISABLED_EMPTY_LINE: "빈 행이므로 이동할 수 없습니다",
        BUTTON_MOVE_UP_DISABLED_NO_TARGET: "위에 이동할 빈 행이 없습니다",
        BUTTON_MOVE_DOWN_DISABLED_ALL_COMPLETED: "모든 입력이 완료되어 행 이동이 무효입니다",
        BUTTON_MOVE_DOWN_DISABLED_EMPTY_LINE: "빈 행이므로 이동할 수 없습니다",
        BUTTON_MOVE_DOWN_DISABLED_LAST_LINE: "마지막 행이므로 이동할 수 없습니다",
        BUTTON_MOVE_DOWN_DISABLED_NO_TARGET: "아래에 이동할 빈 행이 없습니다",
        SEARCH_RESULTS_NONE: "0건",
        SEARCH_RESULTS_COUNT: "{current}/{total}건",
        CHUNK_MANAGEMENT_TITLE: "청크 관리 - {pluginName}",
        TRANSLATION_COMPLETED: "번역 완료",
        LINE_MISMATCH: "행 수 불일치",
        UNTRANSLATED: "번역되지 않음",
        COPY_CHUNK: "📋 복사",
        PASTE_CHUNK: "📝 붙여넣기",
        EDIT_CHUNK: "✏️ 편집",
        MOVE_TO_PREVIEW: "번역 미리보기로 이동",
        CLOSE: "닫기",
        STATS_TOTAL_CHARS: "📊 총 문자 수: {totalCharacters}자 → {totalChunks}개 청크로 분할",
        STATS_TRANSLATION_STATUS: "🔄 번역 상황: {progressIndicator} {completedChunks}/{totalChunks} 완료",
        STATUS_MISMATCH_ERROR: "❌ {mismatchChunks}개 청크에서 행 수가 일치하지 않습니다.",
        STATUS_MISMATCH_INSTRUCTION: "편집 버튼으로 번역을 조정해주세요.",
        STATUS_NO_TRANSLATION: "📝 각 청크를 번역해주세요.",
        STATUS_IN_PROGRESS: "⏳ 번역 진행 중... ({completedChunks}/{totalChunks})",
        STATUS_IN_PROGRESS_REMAINING: "나머지 {remainingChunks}개 청크의 번역이 필요합니다.",
        STATUS_ALL_COMPLETED: "✅ 모든 청크의 번역이 완료되었습니다.",
        STATUS_ALL_COMPLETED_INSTRUCTION1: "번역 미리보기 화면으로 이동할 수 있습니다",
        STATUS_ALL_COMPLETED_INSTRUCTION2: "(청크는 자동 통합됩니다)",
        EDIT_CHUNK_MISMATCH: "행 수 불일치 수정",
        EDIT_CHUNK_NORMAL: "번역 내용 편집",
        EDIT_CHUNK_PENDING: "번역을 붙여넣은 후 편집할 수 있습니다",
        PREVIEW_DISABLED_MISMATCH: "행 수 불일치 청크가 있어 통합할 수 없습니다",
        PREVIEW_DISABLED_INCOMPLETE: "모든 청크의 번역 완료 후 통합할 수 있습니다",
        PREVIEW_ENABLED: "모든 청크를 통합하여 번역 미리보기를 엽니다",
        CHUNK_EDIT_TITLE: "청크 편집 - 청크{chunkId}",
        CHUNK_HEADER: "청크{chunkId} ({characterCount}자)",
        DELETE_CONFIRM_TITLE: "번역 파일 삭제 확인 - {pluginName}",
        DELETE_WARNING_TITLE: "⚠️ 중요한 경고",
        DELETE_WARNING_TEXT: "다음 번역 파일을 삭제합니다:",
        DELETE_RESULT_TITLE: "📋 삭제 실행 후 결과:",
        DELETE_RESULT_TRASH: "• 번역 파일이 휴지통으로 이동됩니다",
        DELETE_RESULT_RECOVERABLE: "• 휴지통에서 복원 가능합니다",
        DELETE_EXECUTE: "삭제"
      }
    };
    // 言語検出
    this.currentLang = this.settings.noticeLanguage || 'en';
  }

  customTrim(text) {
    if (!text) return '';
    return text.replace(/^[\s&&[^ ]]+|[\s&&[^ ]]+$/g, '');
  }

  // Notice翻訳メソッド
  t(key, params = {}) {
    const template = this.noticeMessages[this.currentLang]?.[key] || 
                    this.noticeMessages.en[key] || 
                    key;
    return this.replacePlaceholders(template, params);
  }

  // プレースホルダー置換
  replacePlaceholders(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // 設定画面用翻訳メソッド
  st(key, params = {}) {
    const template = this.settingsMessages[this.currentLang]?.[key] || 
                    this.settingsMessages.en[key] || 
                    key;
    return this.replacePlaceholders(template, params);
  }
  // UI翻訳メソッド
  ui(key, params = {}) {
    const template = this.uiMessages[this.currentLang]?.[key] || 
                    this.uiMessages.en[key] || 
                    key;
    return this.replacePlaceholders(template, params);
  }
  // Modal翻訳メソッド
  modal(key, params = {}) {
    const template = this.modalMessages[this.currentLang]?.[key] || 
                    this.modalMessages.en[key] || 
                    key;
    return this.replacePlaceholders(template, params);
  }

  // 汎用デバウンス機能
  adaptiveDebounce(func, delay = 300) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // プラグインIDをサニタイズ（セキュリティ対策）
  sanitizePluginId(pluginId) {
    if (!pluginId || typeof pluginId !== 'string') {
      throw new Error('Invalid plugin ID');
    }
    return pluginId.replace(/[^a-zA-Z0-9-_]/g, '');
  }
  getTranslationFilePath(pluginId) {
    const sanitizedPluginId = this.sanitizePluginId(pluginId);
    const languageSuffix = this.languageCodes[this.currentLang] || '';
    return `CPLocalizer-translations/${sanitizedPluginId}${languageSuffix}.json`;
  }
  // 文字列をチャンクに分割
  splitStringsIntoChunks(strings, maxChars = 3000) {
    const SAFETY_MARGIN = 200;
    const safeLimit = maxChars - SAFETY_MARGIN;
    
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;
    
    for (const str of strings) {
      const strLength = str.length + 1; // 改行文字も考慮
      
      if (currentLength + strLength > safeLimit && currentChunk.length > 0) {
        chunks.push({
          id: chunks.length + 1,
          strings: [...currentChunk],
          characterCount: currentLength,
          status: 'pending',
          translatedStrings: []
        });
        currentChunk = [str];
        currentLength = strLength;
      } else {
        currentChunk.push(str);
        currentLength += strLength;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push({
        id: chunks.length + 1,
        strings: [...currentChunk],
        characterCount: currentLength,
        status: 'pending',
        translatedStrings: []
      });
    }
    
    return chunks;
  }

  // 総文字数を計算
  calculateTotalCharacters(strings) {
    return strings.reduce((total, str) => total + str.length + 1, 0);
  }

  async onload() {
    console.log("✅ CPLocalizerPlugin loaded");
    // デフォルト設定を追加
    await this.loadSettings();

    // プラグイン読み込み完了後に翻訳を適用
    this.app.workspace.onLayoutReady(() => {
      setTimeout(async () => {
        if (this.settings.translationEnabled) {
          this.applyTranslationByState(true);
        }
      }, 1000);

      // プラグイン管理画面の監視も追加
      this.setupPluginManagementObserver();
      // 設定画面の開閉を監視してフローティングボタンを注入
      this.setupSettingsModalObserver();
    });

    // 設定タブを登録
    this.addSettingTab(new CommunityPluginLocalizerSettingTab(this.app, this));
  }

  // 全てのJSON翻訳を適用
  async applyAllTranslations(showNotice = false) {
    try {
      const pluginManifests = this.app.plugins.manifests;
      const enabledPlugins = this.app.plugins.enabledPlugins;

      const activePlugins = Object.values(pluginManifests)
        .filter(manifest => enabledPlugins.has(manifest.id));

      let appliedCount = 0;

      for (const manifest of activePlugins) {
        const applied = await this.applyTranslation(manifest);
        if (applied) {
          appliedCount++;
        }
      }

      if (appliedCount > 0) {
        if (showNotice) {
          new Notice(this.t('BULK_TRANSLATION_APPLIED', { count: appliedCount }));
        }
      }
    } catch (error) {
      console.error("翻訳適用エラー:", error);
    }
  }

  // 設定画面の開閉を監視してフローティングボタンを管理
  setupSettingsModalObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // モーダルコンテナが追加された場合（設定画面等が開かれた）
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && 
                node.matches && node.matches('.modal-container.mod-dim')) {
              
              // 設定画面かどうかをチェック
              setTimeout(() => {
                const settingsModal = node.querySelector('.modal.mod-settings');
                if (settingsModal) {
                  // さらに少し遅延してボタンを追加（DOM安定化のため）
                  setTimeout(() => {
                    if (this.settings.showFloatingButton) {
                      this.addFloatingButton(settingsModal);
                    }
                    // 翻訳状態に応じて自動適用
                    this.applyTranslationByState();
                    // タブ切り替えの監視を開始（設定画面が開かれた後）
                    this.setupTabSwitchObserver();
                  }, 200);
                }
              }, 100);
              break;
            }
          }
          
          // モーダルコンテナが削除された場合（設定画面等が閉じられた）
          for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && 
                node.matches && node.matches('.modal-container.mod-dim')) {
              break;
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: false  // 直接の子要素のみ監視（パフォーマンス向上）
    });
    
    // 既にモーダルが開いている場合（稀なケース）
    const existingModalContainer = document.querySelector('.modal-container.mod-dim');
    if (existingModalContainer) {
      const settingsModal = existingModalContainer.querySelector('.modal.mod-settings');
      if (settingsModal) {
        this.addFloatingButton(settingsModal);
      }
    }
    
    if (!this.settingsModalObserver) {
      this.settingsModalObserver = observer;
    }
  }

  // タブ切り替えを監視して翻訳を適用（改良版）
  setupTabSwitchObserver() {
    // 既存のobserverを解除
    if (this.tabSwitchObserver) {
      this.tabSwitchObserver.disconnect();
      this.tabSwitchObserver = null;
    }

    const settingsModal = document.querySelector('.modal.mod-settings');
    if (!settingsModal) return;

    // より広範囲を監視：設定画面全体のコンテンツ変更を検出
    const observer = new MutationObserver((mutations) => {
      let shouldApplyTranslation = false;
      
      for (const mutation of mutations) {
        // 1. is-activeクラスの変更（タブ切り替え）
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'class' &&
            mutation.target.classList?.contains('vertical-tab-nav-item') &&
            mutation.target.classList.contains('is-active')) {
          shouldApplyTranslation = true;
          break;
        }
        
        // 2. vertical-tab-content内のコンテンツ変更（新しいプラグイン設定の読み込み）
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 設定項目が追加された場合
              if (node.classList?.contains('setting-item') || 
                  node.querySelector?.('.setting-item') ||
                  node.classList?.contains('vertical-tab-content-container')) {
                shouldApplyTranslation = true;
                break;
              }
            }
          }
          if (shouldApplyTranslation) break;
        }
      }
      
      if (shouldApplyTranslation) {
        // デバウンス処理（複数の変更を統合）
        if (this.tabSwitchDebounceTimer) {
          clearTimeout(this.tabSwitchDebounceTimer);
        }
        
        this.tabSwitchDebounceTimer = setTimeout(() => {
          this.applyTranslationByState();
          
          // ドロワーが開いている場合のみ編集ボタン状態を更新
          if (this.settings.showFloatingButton) {
            this.updateFloatingButtonStatesIfOpen();
          }
          
          setTimeout(() => {
            this.applyTranslationByState();
            
            // 再度、ドロワーが開いている場合のみ状態更新
            this.updateFloatingButtonStatesIfOpen();
          }, 500);
        }, 200);
      }
    });
    
    // 監視対象を拡大：設定画面全体 + タブナビゲーション
    observer.observe(settingsModal, {
      attributes: true,
      childList: true,
      subtree: true, // 重要：全ての子要素を監視
      attributeFilter: ['class']
    });
    
    this.tabSwitchObserver = observer;
  }

  // フローティングボタンを追加
  addFloatingButton(modal) {
    // showFloatingButton設定チェックを追加
    if (!this.settings.showFloatingButton) {
      return;
    }
    // ドラッグ用CSSスタイルを追加
    if (!document.querySelector('#cp-localizer-drag-styles')) {
      const dragStyles = document.createElement('style');
      dragStyles.id = 'cp-localizer-drag-styles';
      dragStyles.textContent = `
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(0.5deg) scale(1.1); }
          75% { transform: rotate(-0.5deg) scale(1.1); }
        }
        .cp-localizer-dragging {
          animation: wiggle 0.3s ease-in-out infinite !important;
          box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
          cursor: move !important;
          z-index: 1001 !important;
        }
        .cp-localizer-floating-button {
          transition: all 0.2s ease;
          touch-action: none; /* タッチ操作の最適化 */
        }
        .cp-localizer-toggle-button {
          touch-action: none; /* ドラッグ用ボタンのタッチ最適化 */
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none; /* iOS長押しメニュー無効化 */
        }
        @media (max-width: 768px) {
          .cp-localizer-drawer-container {
            font-size: 11px !important;
            padding: 6px !important;
          }
          .cp-localizer-drawer-container {
            padding: 5px 6px !important;
            font-size: 10px !important;
            min-height: 28px !important;

            /* === ボタンテキストオーバーフロー対策 === */
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
          }
        }
        /* === 極小画面対応 === */
        @media (max-width: 480px) {
          .cp-localizer-drawer-container button {
            font-size: 9px !important;
            padding: 4px 5px !important;
            min-height: 24px !important;
          }
        }
      `;
      document.head.appendChild(dragStyles);
    }

    // 既存のボタンを削除
    const existingButton = modal.querySelector('.cp-localizer-floating-button');
    if (existingButton) {
      existingButton.remove();
    }

    // トグルボタン（ハンバーガーメニュー）
    const toggleButton = document.createElement('button');
    toggleButton.className = 'cp-localizer-toggle-button';
    toggleButton.textContent = '☰';
    toggleButton.style.cssText = `
      background: var(--interactive-accent);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      color: var(--text-on-accent);
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 8px 10px;
      margin-bottom: 5px;
      box-shadow: var(--shadow-s);
      transition: all 0.2s ease;
      transform-origin: center center;
    `;

    // ドロワーコンテナ（ボタン群を格納）
    const drawerContainer = document.createElement('div');
    drawerContainer.className = 'cp-localizer-drawer-container';

    // === モバイル対応: 動的幅計算 ===
    const isMobile = window.innerWidth < 768;
    const maxDrawerWidth = isMobile ? Math.min(window.innerWidth * 0.85, 300) : 400;

    drawerContainer.style.cssText = `
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 8px;
      box-shadow: var(--shadow-s);
      display: none;
      flex-direction: ${this.settings.menuLayoutHorizontal ? 'row' : 'column'};
      gap: 6px;
      min-width: 120px;
      width: max-content;
      max-width: none;
      opacity: 0;
      transition: all 0.3s ease;
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 5px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: nowrap;
    `;

    // ボタンコンテナ
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'cp-localizer-floating-button';
    buttonContainer.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      user-select: none;
    `;
    
    // 抽出ボタン
    const extractButton = document.createElement('button');
    extractButton.textContent = this.ui('EXTRACT');
    extractButton.style.cssText = `
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      color: var(--text-normal);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 8px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s ease;
    `;
    extractButton.addEventListener('mouseenter', () => {
      extractButton.style.background = 'var(--interactive-hover)';
    });
    extractButton.addEventListener('mouseleave', () => {
      extractButton.style.background = 'var(--interactive-normal)';
    });
    extractButton.addEventListener('click', () => {
      this.extractCurrentPluginStrings();
    });

    // 翻訳を貼付ボタン
    const pasteButton = document.createElement('button');
    pasteButton.textContent = this.ui('PASTE');
    pasteButton.style.cssText = `
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      color: var(--text-normal);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 8px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s ease;
    `;
    pasteButton.addEventListener('mouseenter', () => {
      pasteButton.style.background = 'var(--interactive-hover)';
    });
    pasteButton.addEventListener('mouseleave', () => {
      pasteButton.style.background = 'var(--interactive-normal)';
    });
    pasteButton.addEventListener('click', () => {
      this.pasteCurrentPluginTranslation();
    });

    // 翻訳状態トグルボタン
    const translationToggleButton = document.createElement('button');
    this.updateToggleButtonText(translationToggleButton);
    translationToggleButton.style.cssText = `
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      color: var(--text-normal);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 8px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s ease;
    `;
    translationToggleButton.addEventListener('mouseenter', () => {
      translationToggleButton.style.background = 'var(--interactive-hover)';
    });
    translationToggleButton.addEventListener('mouseleave', () => {
      translationToggleButton.style.background = 'var(--interactive-normal)';
    });
    translationToggleButton.addEventListener('click', async () => {
      this.settings.translationEnabled = !this.settings.translationEnabled;
      await this.saveSettings();
      this.updateToggleButtonText(translationToggleButton);
      this.applyTranslationByState(true);
    });

    // 編集ボタン
    const editButton = document.createElement('button');
    editButton.textContent = this.ui('EDIT');
    editButton.style.cssText = `
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      color: var(--text-normal);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 8px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s ease;
    `;
    editButton.addEventListener('mouseenter', () => {
      if (!editButton.disabled) {
        editButton.style.background = 'var(--interactive-hover)';
      }
    });
    editButton.addEventListener('mouseleave', () => {
      editButton.style.background = 'var(--interactive-normal)';
    });
    editButton.addEventListener('click', () => {
      this.editCurrentPluginTranslation();
    });

    // 編集ボタンの初期状態を設定
    this.updateEditButtonState(editButton);
    editButton.className = 'cp-localizer-edit-button';

    // 削除ボタン
    const deleteButton = document.createElement('button');
    deleteButton.textContent = this.ui('DELETE');
    deleteButton.style.cssText = `
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      color: var(--text-normal);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 8px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s ease;
    `;
    deleteButton.addEventListener('mouseenter', () => {
      if (!deleteButton.disabled) {
        deleteButton.style.background = 'var(--color-red)';
        deleteButton.style.color = 'white';
      }
    });
    deleteButton.addEventListener('mouseleave', () => {
      deleteButton.style.background = 'var(--interactive-normal)';
      deleteButton.style.color = 'var(--text-normal)';
    });
    deleteButton.addEventListener('click', () => {
      this.deleteCurrentPluginTranslation();
    });

    // 削除ボタンの初期状態を設定
    this.updateDeleteButtonState(deleteButton);
    deleteButton.className = 'cp-localizer-delete-button';

    // 統合ドラッグ機能の実装（マウス・タッチ対応）
    const initializeDragHandling = () => {
      let isDragging = false;
      let dragStartTimeout = null;
      let startPos = { x: 0, y: 0, buttonX: 0, buttonY: 0 };

      // 統合イベントハンドラー
      const handleStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 座標取得（マウス・タッチ統一）
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const container = modal.querySelector('.vertical-tab-content-container') || modal;
        
        startPos = { 
          x: clientX, 
          y: clientY,
          buttonX: buttonContainer.offsetLeft,
          buttonY: buttonContainer.offsetTop
        };
        
        // 長押し検出（500ms）
        dragStartTimeout = setTimeout(() => {
          isDragging = true;
          toggleButton.classList.add('cp-localizer-dragging');
          document.body.style.userSelect = 'none';
        }, 500);
        
        // ムーブ・エンドイベントをドキュメントに登録
        if (e.touches) {
          document.addEventListener('touchmove', handleMove, { passive: false });
          document.addEventListener('touchend', handleEnd);
        } else {
          document.addEventListener('mousemove', handleMove);
          document.addEventListener('mouseup', handleEnd);
        }
      };

      // === handleMove関数を以下に置き換え ===
      const handleMove = (e) => {
        if (!isDragging) return;
        
        e.preventDefault();
        
        // 座標取得（マウス・タッチ統一）
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - startPos.x;
        const deltaY = clientY - startPos.y;
        
        // === container取得を1回だけに最適化 ===
        if (!handleMove.container) {
          handleMove.container = modal.querySelector('.vertical-tab-content-container') || modal;
          handleMove.containerRect = handleMove.container.getBoundingClientRect();
          handleMove.modalRect = modal.getBoundingClientRect();
          handleMove.containerOffsetX = handleMove.containerRect.left - handleMove.modalRect.left;
          handleMove.containerOffsetY = handleMove.containerRect.top - handleMove.modalRect.top;
        }
        
        const newX = startPos.buttonX + deltaX;
        const newY = startPos.buttonY + deltaY;
        
        const minX = handleMove.containerOffsetX;
        const minY = handleMove.containerOffsetY;
        const maxX = handleMove.containerOffsetX + handleMove.container.offsetWidth - buttonContainer.offsetWidth;
        const maxY = handleMove.containerOffsetY + handleMove.container.offsetHeight - buttonContainer.offsetHeight;
        
        this.buttonCurrentPos = {
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        };
        
        // === requestAnimationFrameで描画最適化 ===
        if (!handleMove.rafId) {
          handleMove.rafId = requestAnimationFrame(() => {
            buttonContainer.style.left = this.buttonCurrentPos.x + 'px';
            buttonContainer.style.top = this.buttonCurrentPos.y + 'px';
            buttonContainer.style.right = 'auto';
            handleMove.rafId = null;
          });
        }
      };

      const handleEnd = (e) => {
        // タイムアウトクリア
        if (dragStartTimeout) {
          clearTimeout(dragStartTimeout);
          dragStartTimeout = null;
        }
        
        // イベントリスナー削除
        if (e.type === 'touchend') {
          document.removeEventListener('touchmove', handleMove);
          document.removeEventListener('touchend', handleEnd);
        } else {
          document.removeEventListener('mousemove', handleMove);
          document.removeEventListener('mouseup', handleEnd);
        }
        
        if (isDragging) {
          // ドラッグ終了処理
          isDragging = false;
          toggleButton.classList.remove('cp-localizer-dragging');
          document.body.style.userSelect = '';

          const container = modal.querySelector('.vertical-tab-content-container') || modal;
          
          this.saveButtonPosition(this.buttonCurrentPos);
          this.adjustDrawerDirection(buttonContainer, drawerContainer, container);
        } else {
          // 短いタップ/クリック = メニュートグル
          this.isDrawerOpen = !this.isDrawerOpen;
          if (this.isDrawerOpen) {
            const container = modal.querySelector('.vertical-tab-content-container') || modal;
            
            this.updateFloatingButtonStates();
            this.adjustDrawerDirection(buttonContainer, drawerContainer, container);
            drawerContainer.style.display = 'flex';
            setTimeout(() => {
              drawerContainer.style.transform = 'translateY(0)';
              drawerContainer.style.opacity = '1';
            }, 10);
            toggleButton.textContent = '✕';
          } else {
            drawerContainer.style.transform = 'translateY(-10px)';
            drawerContainer.style.opacity = '0';
            setTimeout(() => {
              drawerContainer.style.display = 'none';
            }, 300);
            toggleButton.textContent = '☰';
          }
        }
      };

      // マウス・タッチ両方のイベントを登録
      toggleButton.addEventListener('mousedown', handleStart);
      toggleButton.addEventListener('touchstart', handleStart, { passive: false });
    };

    // ドラッグ処理を初期化
    initializeDragHandling();
    
    // ドロワーコンテナにボタンを追加
    drawerContainer.appendChild(extractButton);
    drawerContainer.appendChild(pasteButton);
    drawerContainer.appendChild(editButton);
    drawerContainer.appendChild(translationToggleButton);
    drawerContainer.appendChild(deleteButton);

    // メインコンテナに追加
    buttonContainer.appendChild(toggleButton);
    buttonContainer.appendChild(drawerContainer);
    modal.appendChild(buttonContainer);
    // 保存された位置を復元
    this.restoreButtonPosition(buttonContainer);
  }
  // フローティングボタンを削除
  removeFloatingButton() {
    const settingsModal = document.querySelector('.modal.mod-settings');
    if (!settingsModal) return;

    const existingButton = settingsModal.querySelector('.cp-localizer-floating-button');
    if (existingButton) {
      existingButton.remove();
    }

    // ドロワー状態をリセット
    this.isDrawerOpen = false;
  }

  // ドロワーの方向を動的調整（モバイル対応版）
  adjustDrawerDirection(buttonContainer, drawerContainer, container) {
    // 現在のボタン位置を取得
    const buttonRect = buttonContainer.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // コンテナ内での相対位置
    const relativeRight = buttonRect.right - containerRect.left;
    const relativeBottom = buttonRect.bottom - containerRect.top;
    
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // === モバイル対応: 動的drawerサイズ計算 ===
    const isMobile = containerWidth < 768;
    const drawerWidth = isMobile 
      ? Math.min(containerWidth * 0.85, 300)  // モバイル: 画面幅の85%、最大300px
      : (this.settings.menuLayoutHorizontal ? 400 : 120); // PC: 従来通り
    const drawerHeight = this.settings.menuLayoutHorizontal ? 60 : 140;
    
    // デフォルト位置をリセット
    drawerContainer.style.top = 'auto';
    drawerContainer.style.bottom = 'auto';
    drawerContainer.style.left = 'auto';
    drawerContainer.style.right = 'auto';
    drawerContainer.style.marginTop = '0';
    drawerContainer.style.marginBottom = '0';
    drawerContainer.style.marginLeft = '0';
    drawerContainer.style.marginRight = '0';
    
    // === 改良された水平方向の調整 ===
    const rightSpaceAvailable = containerWidth - relativeRight;
    const leftSpaceAvailable = relativeRight - buttonContainer.offsetWidth;
    
    if (rightSpaceAvailable >= drawerWidth) {
      // 右向きに展開可能
      drawerContainer.style.left = '0';
    } else if (leftSpaceAvailable >= drawerWidth) {
      // 左向きに展開
      drawerContainer.style.right = '100%';
      drawerContainer.style.marginRight = '5px';
    } else {
      // どちらもスペース不足の場合は右向き展開（オーバーフローを許容）
      drawerContainer.style.left = '0';
      
      // モバイルの場合は追加で右端に固定して見切れを最小化
      if (isMobile && rightSpaceAvailable < drawerWidth * 0.7) {
        drawerContainer.style.left = 'auto';
        drawerContainer.style.right = '0';
        drawerContainer.style.marginRight = '0';
      }
    }
    
    // 垂直方向の調整（既存ロジック維持）
    if (relativeBottom + drawerHeight > containerHeight) {
      // 下端に近い場合：上向きに展開
      drawerContainer.style.bottom = '100%';
      drawerContainer.style.marginBottom = '5px';
    } else {
      // 通常：下向きに展開
      drawerContainer.style.top = '100%';
      drawerContainer.style.marginTop = '5px';
    }
    
  }

  // ボタン位置を保存
  saveButtonPosition(position) {
    if (this.settings) {
      this.settings.buttonPosition = position;
      this.saveSettings();
    }
  }

  // ボタン位置を復元
  restoreButtonPosition(buttonContainer) {
    if (this.settings?.buttonPosition) {
      const pos = this.settings.buttonPosition;
      buttonContainer.style.left = pos.x + 'px';
      buttonContainer.style.top = pos.y + 'px';
      buttonContainer.style.right = 'auto';
      this.buttonCurrentPos = pos;
    }
  }


  // 現在表示中のプラグインから文字列を抽出
  async extractCurrentPluginStrings() {
    try {
      const currentPlugin = this.getCurrentActivePlugin();
      if (!currentPlugin) {
        new Notice(this.t('ERROR_NO_PLUGIN'));
        return;
      }
      
      // HTML要素から文字列を抽出
      const extractedStrings = this.extractTranslatableStringsFromDOM(currentPlugin);
      // 既存翻訳データとの重複を除外
      let filteredStrings = extractedStrings;
      try {
        const existingTranslationResult = await this.loadTranslationJSON(currentPlugin.id);
        if (existingTranslationResult && existingTranslationResult.translations) {
          const existingKeys = Array.from(existingTranslationResult.translations.keys());
          
          filteredStrings = extractedStrings.filter(str => {
            const normalizedStr = this.normalizeText(str);
            const isDuplicate = existingKeys.some(key => {
              const normalizedKey = this.normalizeText(key);
              return normalizedKey === normalizedStr;
            });
            
            return !isDuplicate;
          });
        }
      } catch (error) {
      }

      if (filteredStrings.length === 0) {
        new Notice(this.t('EXTRACTION_NO_STRINGS', { pluginName: currentPlugin.name }));
        return;
      }

      // 総文字数を計算
      const totalCharacters = this.calculateTotalCharacters(filteredStrings);
      
      // 3000文字未満の場合は従来通り
      if (totalCharacters < 3000) {
        // 抽出した文字列をマップに保存
        if (!this.extractedStringsMap) {
          this.extractedStringsMap = new Map();
        }
        this.extractedStringsMap.set(currentPlugin.id, filteredStrings);

        // クリップボードにコピー
        const translationContent = filteredStrings.join("\n");
        await navigator.clipboard.writeText(translationContent);
        
        new Notice(this.t('EXTRACTION_SUCCESS', { count: filteredStrings.length, pluginName: currentPlugin.name }));
      } else {
        // 3000文字以上の場合はチャンク管理モーダルを表示
        const chunks = this.splitStringsIntoChunks(filteredStrings);
        this.chunkData = {
          pluginId: currentPlugin.id,
          pluginName: currentPlugin.name,
          totalCharacters: totalCharacters,
          chunks: chunks
        };
        new Notice(this.t('CHUNK_MANAGEMENT_TOO_LARGE', { chars: totalCharacters }));
        this.showChunkManagementModal();
      }
      
    } catch (error) {
      console.error("文字列抽出エラー:", error);
      new Notice(this.t('ERROR_EXTRACTION'));

    }
  }

  // 現在表示中のプラグインの翻訳を貼付（プレビューポップアップ対応版）
  async pasteCurrentPluginTranslation() {
    try {
      const currentPlugin = this.getCurrentActivePlugin();
      if (!currentPlugin) {
        new Notice(this.t('ERROR_NO_PLUGIN'));
        return;
      }
      
      // 抽出済みの文字列を取得
      if (!this.extractedStringsMap) {
        this.extractedStringsMap = new Map();
      }
      
      const originalStrings = this.extractedStringsMap.get(currentPlugin.id);
      if (!originalStrings || originalStrings.length === 0) {
        new Notice(this.t('ERROR_NO_EXTRACTION'));
        return;
      }

      // クリップボードから翻訳データを取得
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText.trim()) {
        new Notice(this.t('ERROR_CLIPBOARD_EMPTY'));
        return;
      }

      // 翻訳結果を行ごとに分割
      const translatedStrings = this.customTrim(clipboardText).split('\n').map(line => 
        this.customTrim(line.replace(/<[^>]*>/g, '')) // HTMLタグ除去（セキュリティ対策）
      );
        
      // プレビューポップアップを表示
      this.showTranslationPreviewPopup(currentPlugin, originalStrings, translatedStrings);
      
    } catch (error) {
      console.error("翻訳貼付エラー:", error);
      new Notice(this.t('ERROR_PASTE', { error: error.message }));
    }
  }

  // 既存翻訳の編集機能
  async editCurrentPluginTranslation() {
    try {
      const currentPlugin = this.getCurrentActivePlugin();
      if (!currentPlugin) {
        new Notice(this.t('ERROR_NO_PLUGIN'));
        return;
      }
      
      if (!await this.hasExistingTranslation(currentPlugin.id)) {
        new Notice(this.t('ERROR_NO_TRANSLATION_FILE'));
        return;
      }
      
      // JSONファイルから翻訳データを読み込み
      const result = await this.loadTranslationJSON(currentPlugin.id);
      if (!result || !result.translations || result.translations.size === 0) {
        new Notice(this.t('ERROR_TRANSLATION_LOAD_FAILED'));
        return;
      }

      const translationMap = result.translations;
      
      // JSONの内容をそのまま配列に変換
      const originalStrings = Array.from(translationMap.keys());
      const translatedStrings = Array.from(translationMap.values());
      
      // 翻訳プレビューモーダルを表示
      this.showTranslationPreviewPopup(currentPlugin, originalStrings, translatedStrings);
      
    } catch (error) {
      console.error("翻訳編集エラー:", error);
      new Notice(this.t('ERROR_EDIT_FAILED', { error: error.message }));
    }
  }

  // 現在のプラグインの翻訳ファイルを削除
  async deleteCurrentPluginTranslation() {
    try {
      const currentPlugin = this.getCurrentActivePlugin();
      if (!currentPlugin) {
        new Notice(this.t('ERROR_NO_PLUGIN'));
        return;
      }
      
      if (!await this.hasExistingTranslation(currentPlugin.id)) {
        new Notice(this.t('ERROR_NO_TRANSLATION_FILE'));
        return;
      }
      
      // 確認ダイアログを表示
      const modal = new TranslationDeleteConfirmModal(this.app, this, currentPlugin);
      modal.open();
      
    } catch (error) {
      console.error("翻訳削除エラー:", error);
      new Notice(this.t('ERROR_DELETE_FAILED', { error: error.message }));
    }
  }

  // 翻訳ファイルを削除（内部実行用）- Vault内ゴミ箱対応版
  async executeTranslationDeletion(pluginId, pluginName) {
    try {
      const sanitizedPluginId = this.sanitizePluginId(pluginId);
      const jsonPath = this.getTranslationFilePath(pluginId);
      
      if (await this.app.vault.adapter.exists(jsonPath)) {
        try {
          // ファイルオブジェクトを取得
          const file = this.app.vault.getAbstractFileByPath(jsonPath);
          
          if (file) {
            // ゴミ箱に移動（ファイルオブジェクトを使用）
            await this.app.vault.trash(file, true);
            
            // フローティングボタンの状態更新
            this.updateFloatingButtonStates();
            
            new Notice(this.t('DELETE_SUCCESS', { pluginName }));
            return true;
          } else {
            throw new Error('ファイルオブジェクトの取得に失敗');
          }
        } catch (trashError) {
          // trash()が失敗した場合のフォールバック
          console.warn("ゴミ箱移動に失敗、完全削除を実行:", trashError);
          await this.app.vault.adapter.remove(jsonPath);
          
          // フローティングボタンの状態更新
          this.updateFloatingButtonStates();
          
          new Notice(this.t('DELETE_COMPLETE', { pluginName }));
          return true;
        }
      } else {
        new Notice(this.t('ERROR_FILE_NOT_FOUND'));
        return false;
      }
    } catch (error) {
      console.error("翻訳ファイル削除エラー:", error);
      new Notice(this.t('ERROR_DELETE_FAILED', { error: error.message }));
      return false;
    }
  }

  // 編集ボタンの状態を更新
  async updateEditButtonState(editButton) {

    const currentPlugin = this.getCurrentActivePlugin();
    if (!currentPlugin) {
      editButton.disabled = true;
      editButton.style.opacity = '0.5';
      editButton.textContent = this.ui('EDIT');
      editButton.title = '現在表示中のプラグインを特定できませんでした';
      return;
    }
    
    const hasTranslation = await this.hasExistingTranslation(currentPlugin.id);
    editButton.disabled = !hasTranslation;
    editButton.style.opacity = hasTranslation ? '1' : '0.5';
    editButton.textContent = this.ui('EDIT');
    editButton.title = hasTranslation ? 
      this.ui('EDIT_AVAILABLE') : 
      this.ui('EDIT_UNAVAILABLE');
  }
  
  // 削除ボタンの状態を更新
  async updateDeleteButtonState(deleteButton) {

    const currentPlugin = this.getCurrentActivePlugin();
    if (!currentPlugin) {
      deleteButton.disabled = true;
      deleteButton.style.opacity = '0.5';
      deleteButton.textContent = this.ui('DELETE');
      deleteButton.title = '現在表示中のプラグインを特定できませんでした';
      return;
    }
    
    const hasTranslation = await this.hasExistingTranslation(currentPlugin.id);
    deleteButton.disabled = !hasTranslation;
    deleteButton.style.opacity = hasTranslation ? '1' : '0.5';
    deleteButton.textContent = this.ui('DELETE');
    deleteButton.title = hasTranslation ? 
      this.ui('DELETE_AVAILABLE') : 
      this.ui('DELETE_UNAVAILABLE');
  }

  // フローティングボタン状態の一括更新
  async updateFloatingButtonStates() {
    
    const settingsModal = document.querySelector('.modal.mod-settings');
    if (!settingsModal) {
      return;
    }
    
    const floatingButton = settingsModal.querySelector('.cp-localizer-floating-button');
    if (!floatingButton) {
      return;
    }
    
    const drawerButtons = floatingButton.querySelectorAll('button');
    // クラス名でボタンを取得
    const editButton = floatingButton.querySelector('.cp-localizer-edit-button');
    const deleteButton = floatingButton.querySelector('.cp-localizer-delete-button');

    if (editButton) {
      await this.updateEditButtonState(editButton);
    }

    if (deleteButton) {
      await this.updateDeleteButtonState(deleteButton);
    }

    if (deleteButton) {
      await this.updateDeleteButtonState(deleteButton);
    }
  }

  // ドロワーが開いている場合のみフローティングボタン状態を更新
  async updateFloatingButtonStatesIfOpen() {
    if (!this.isDrawerOpen) {
      return;
    }
    // === await追加 ===
    await this.updateFloatingButtonStates();
  }

  // 翻訳プレビューポップアップを表示（Obsidian標準モーダル版）
  showTranslationPreviewPopup(plugin, originalStrings, translatedStrings) {
    const modal = new TranslationPreviewModal(this.app, this, plugin, originalStrings, translatedStrings);
    modal.open();
  }
  // チャンク管理モーダルを表示
  showChunkManagementModal() {
    const modal = new ChunkManagementModal(this.app, this, this.chunkData);
    modal.open();
  }

  // === jsonに翻訳データを保存 ===
  async saveTranslationToJSON(plugin, originalStrings, translatedStrings) {
    try {
      const pluginId = this.sanitizePluginId(plugin.id);
      const translationsDir = `CPLocalizer-translations`;
      const jsonPath = this.getTranslationFilePath(plugin.id);
      
      // translationsフォルダを作成（存在しない場合）
      if (!await this.app.vault.adapter.exists(translationsDir)) {
        await this.app.vault.adapter.mkdir(translationsDir);
      }

      // 既存の翻訳データを読み込み
      let existingTranslations = {};
      if (await this.app.vault.adapter.exists(jsonPath)) {
        try {
          const existingContent = await this.app.vault.adapter.read(jsonPath);
          existingTranslations = JSON.parse(existingContent);
        } catch (error) {
          console.error("既存JSON読み込みエラー:", error);
        }
      }

      // 新しい翻訳データをマージ
      translatedStrings.forEach((translated, index) => {
        const original = originalStrings[index];
        const cleanOriginal = this.normalizeText(original);
        const cleanTranslated = this.normalizeText(translated);
        existingTranslations[cleanOriginal] = cleanTranslated;
      });
      // メタデータを追加
      const currentPluginVersion = this.app.plugins.manifests[plugin.id]?.version || '不明';
      existingTranslations._metadata = {
        pluginVersion: currentPluginVersion
      };

      // JSONファイルに保存（整形付き）
      // メタデータを先頭に配置したオブジェクトを作成
      const orderedTranslations = {
        _metadata: existingTranslations._metadata
      };

      // 翻訳データを追加（_metadataを除外）
      for (const [key, value] of Object.entries(existingTranslations)) {
        if (key !== '_metadata') {
          orderedTranslations[key] = value;
        }
      }

      const jsonContent = JSON.stringify(orderedTranslations, null, 2);
      await this.app.vault.adapter.write(jsonPath, jsonContent);
    } catch (error) {
      console.error("JSON保存エラー:", error);
      throw error;
    }
  }

  // バージョン比較機能
  async getVersionStatus(pluginId) {
    try {
      const currentVersion = this.app.plugins.manifests[pluginId]?.version || '不明';
      const result = await this.loadTranslationJSON(pluginId);
      if (!result || !result.translations) {
        return { status: 'no-translation', currentVersion };
      }

      const savedVersion = result.metadata?.pluginVersion || '不明';
      
      if (savedVersion === currentVersion) {
        return { status: 'up-to-date', currentVersion, savedVersion };
      } else {
        return { status: 'version-mismatch', currentVersion, savedVersion };
      }
    } catch (error) {
      console.error(`バージョンステータス取得エラー (${pluginId}):`, error);
      return { status: 'error', currentVersion: '不明' };
    }
  }

  // 現在表示中のプラグインを取得
  getCurrentActivePlugin() {
    
    // 方法1: Modal-Title方式（統一・最優先）
    const modalTitlePlugin = this.getPluginFromModalTitle();
    if (modalTitlePlugin) {
      return modalTitlePlugin;
    }
    
    // 方法2: Active-Tab方式（フォールバック）
    const activeTabPlugin = this.getPluginFromActiveTab();
    if (activeTabPlugin) {
      return activeTabPlugin;
    }
    return null;
  }

  // Modal-Titleからプラグインを検出
  getPluginFromModalTitle() {
    
    const titleSelectors = [
      '.modal-header .modal-title',
      '.modal .modal-title', 
      '.modal-header h2',
      '.modal-title'
    ];
    
    for (const selector of titleSelectors) {
      const modalTitleElement = document.querySelector(selector);
      if (modalTitleElement) {
        const titleText = modalTitleElement.textContent.trim();
        
        // 完全一致チェック
        const exactMatch = this.findManifestByName(titleText);
        if (exactMatch) {
          return exactMatch;
        }
        
        // パターンマッチング
        const patternMatch = this.findManifestByTitlePattern(titleText);
        if (patternMatch) {
          return patternMatch;
        }
      }
    }
    
    return null;
  }

  // Active-Tabからプラグインを検出（従来方式）
  getPluginFromActiveTab() {
    
    const activeSelectors = [
      '.vertical-tab-nav-item.is-active',
      '.vertical-tab-nav-item[aria-selected="true"]',
      '.vertical-tab-nav-item.mod-active'
    ];
    
    for (const selector of activeSelectors) {
      const activeTab = document.querySelector(selector);
      if (activeTab) {
        const tabText = activeTab.textContent.trim();
        
        const manifest = this.findManifestByName(tabText);
        if (manifest) {
          return manifest;
        }
      }
    }
    
    return null;
  }

  // タイトルパターンマッチング（"Plugin Name Settings" → "Plugin Name"）
  findManifestByTitlePattern(titleText) {
    const manifests = Object.values(this.app.plugins.manifests);
    
    // パターン1: "Settings" 削除
    const withoutSettings = titleText.replace(/\s*-?\s*Settings?\s*$/i, '').trim();
    if (withoutSettings !== titleText) {
      const match = manifests.find(m => m.name === withoutSettings);
      if (match) return match;
    }
    
    // パターン2: "プラグイン:" 削除
    const withoutPrefix = titleText.replace(/^プラグイン:\s*/i, '').trim();
    if (withoutPrefix !== titleText) {
      const match = manifests.find(m => m.name === withoutPrefix);
      if (match) return match;
    }
    
    // パターン3: 部分一致
    return manifests.find(m => 
      titleText.includes(m.name) || m.name.includes(titleText)
    );
  }

  // プラグイン名からマニフェストを検索
  findManifestByName(name) {
    if (!name) return null;
    
    const manifests = this.app.plugins.manifests;
    return Object.values(manifests).find(manifest => manifest.name === name);
  }

  // JSONファイルが存在するかチェック
  async hasExistingTranslation(pluginId) {
    try {
      const sanitizedPluginId = this.sanitizePluginId(pluginId);
      const jsonPath = this.getTranslationFilePath(pluginId);
      
      const exists = await this.app.vault.adapter.exists(jsonPath);
      
      return exists;
    } catch (error) {
      return false;
    }
  }

  // 個別プラグインの翻訳を適用
  async applyTranslation(manifest) {
    try {
      const result = await this.loadTranslationJSON(manifest.id);
      if (!result || !result.translations || result.translations.size === 0) {
        return false;
      }

      const translationMap = result.translations;

      this.replaceTextInDOM(translationMap, manifest.id);
      return true;

    } catch (error) {
      console.error(`翻訳適用エラー (${manifest.name}):`, error);
      return false;
    }
  }

  // 逆翻訳マップを作成（翻訳先言語→英語）
  createReverseTranslationMap(translationMap) {
    const reverseMap = new Map();
    for (const [english, translated] of translationMap.entries()) {
      reverseMap.set(translated, english);
    }
    return reverseMap;
  }

  // 逆翻訳を適用（翻訳先言語→英語）
  async applyReverseTranslation(manifest) {
    try {
      const result = await this.loadTranslationJSON(manifest.id);
      if (!result || !result.translations || result.translations.size === 0) {
        return false;
      }

      const translationMap = result.translations;

      const reverseMap = this.createReverseTranslationMap(translationMap);

      // プラグイン名除外設定を一時的に無効化（逆翻訳時は除外しない）
      const originalSetting = this.settings.excludePluginNames;
      this.settings.excludePluginNames = false;

      this.replaceTextInDOM(reverseMap, manifest.id);

      // 設定を元に戻す
      this.settings.excludePluginNames = originalSetting;
      return true;

    } catch (error) {
      console.error(`逆翻訳適用エラー (${manifest.name}):`, error);
      return false;
    }
  }

  // 全プラグインに逆翻訳を適用
  async applyAllReverseTranslations(showNotice = false) {
    try {
      const pluginManifests = this.app.plugins.manifests;
      const enabledPlugins = this.app.plugins.enabledPlugins;

      const activePlugins = Object.values(pluginManifests)
        .filter(manifest => enabledPlugins.has(manifest.id));

      let appliedCount = 0;

      for (const manifest of activePlugins) {
        const applied = await this.applyReverseTranslation(manifest);
        if (applied) {
          appliedCount++;
        }
      }

      if (appliedCount > 0) {
        if (showNotice) {
          new Notice(this.t('BULK_TRANSLATION_REVERTED', { count: appliedCount }));
        }
      }
    } catch (error) {
      console.error("逆翻訳適用エラー:", error);
    }
  }

  async applyAllTranslationsForCurrentLanguage() {
    try {
      const pluginManifests = this.app.plugins.manifests;
      const enabledPlugins = this.app.plugins.enabledPlugins;

      const activePlugins = Object.values(pluginManifests)
        .filter(manifest => enabledPlugins.has(manifest.id));

      for (const manifest of activePlugins) {
        const hasTranslation = await this.hasExistingTranslation(manifest.id);
        
        if (hasTranslation) {
          await this.applyTranslation(manifest);
        }
      }
    } catch (error) {
      console.error("言語切り替えエラー:", error);
    }
  }

  // JSONファイルを読み込んで翻訳マップを作成
  async loadTranslationJSON(pluginId) {
    try {
      const sanitizedPluginId = this.sanitizePluginId(pluginId);
      const jsonPath = this.getTranslationFilePath(pluginId);
      
      if (!await this.app.vault.adapter.exists(jsonPath)) {
        return null;
      }

      const jsonContent = await this.app.vault.adapter.read(jsonPath);
      const translationData = JSON.parse(jsonContent);
      
      // ObjectからMapに変換
      const translationMap = new Map();
      let metadata = null;

      for (const [original, translated] of Object.entries(translationData)) {
        if (original === '_metadata') {
          metadata = translated;
        } else {
          translationMap.set(original, translated);
        }
      }

      return { metadata, translations: translationMap };
    } catch (error) {
      console.error(`JSON読み込みエラー (${pluginId}):`, error);
      return null;
    }
  }
  // 設定の読み込み・保存メソッドを追加
  async loadSettings() {
    this.settings = Object.assign({
      translationEnabled: true,
      menuLayoutHorizontal: true,
      buttonPosition: null,
      showFloatingButton: true,
      noticeLanguage: 'en',
      translationPreviewSize: { width: 600, height: 500 },
      chunkManagementSize: { width: 800, height: 600 },
      chunkEditSize: { width: 800, height: 600 }
    }, await this.loadData());
    this.currentLang = this.settings.noticeLanguage || 'en';
  }


  async saveSettings() {
    await this.saveData(this.settings);
  }
  // DOM内のテキストを置換（翻訳範囲制限版）
  replaceTextInDOM(translationMap, pluginId = "unknown") {
    // 複数のセレクタパターンを順番に試行
    const containerSelectors = [
      '.vertical-tab-content-container', // 追加：より具体的なコンテンツコンテナ
      '.vertical-tab-content',           // 追加：タブコンテンツ
      '.modal-content.vertical-tabs-container',
      '.modal-content',
      '.vertical-tabs-container',
      '.modal-container .modal-content',
      '.setting-item-container'          // 追加：設定項目コンテナ
    ];
    
    let targetContainer = null;
    for (const selector of containerSelectors) {
      targetContainer = document.querySelector(selector);
      if (targetContainer) break;
    }
    
    if (!targetContainer) {
      targetContainer = document.body;
    }

    let replacedCount = 0;

    // テキストノードの置換
    const walker = document.createTreeWalker(
      targetContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          let parent = node.parentElement;
          while (parent) {
            if (parent.classList.contains('vertical-tab-nav-item')) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // テキストノードの処理
    for (const textNode of textNodes) {
      const originalText = this.customTrim(textNode.textContent);
      
      if (!originalText) continue;
      
      // 統一正規化メソッドを使用
      const normalizedText = this.normalizeText(originalText);
      
      // 正規化されたテキストで翻訳マップを検索
      if (translationMap.has(normalizedText)) {
        const translatedText = translationMap.get(normalizedText);
        textNode.textContent = translatedText;
        replacedCount++;
      }
    }


    // 属性値の置換
    const elementsWithAttributes = targetContainer.querySelectorAll('*');
    
    for (const element of elementsWithAttributes) {
      const tagName = element.tagName?.toLowerCase();
      const isInputElement = ['input', 'textarea'].includes(tagName) || 
                            element.getAttribute('contenteditable') === 'true';
      
      if (isInputElement) {
        continue; // 入力要素はスキップ
      }
      
      // placeholder属性（入力要素以外）
      if (element.placeholder) {
        const normalizedPlaceholder = this.normalizeText(element.placeholder);
        if (translationMap.has(normalizedPlaceholder)) {
          element.placeholder = translationMap.get(normalizedPlaceholder);
          replacedCount++;
        }
      }
      
      // title属性
      if (element.title) {
        const normalizedTitle = this.normalizeText(element.title);
        if (translationMap.has(normalizedTitle)) {
          element.title = translationMap.get(normalizedTitle);
          replacedCount++;
        }
      }
      
      // aria-label属性
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) {
        const normalizedAriaLabel = this.normalizeText(ariaLabel);
        if (translationMap.has(normalizedAriaLabel)) {
          element.setAttribute('aria-label', translationMap.get(normalizedAriaLabel));
          replacedCount++;
        }
      }

      // data-tooltip属性
      const tooltip = element.getAttribute('data-tooltip');
      if (tooltip) {
        const normalizedTooltip = this.normalizeText(tooltip);
        if (translationMap.has(normalizedTooltip)) {
          element.setAttribute('data-tooltip', translationMap.get(normalizedTooltip));
          replacedCount++;
        }
      }
    }
  }

  // HTML要素から翻訳対象文字列を抽出（DOM解析版）
  extractTranslatableStringsFromDOM(manifest) {
    const strings = new Set();
    
    // 設定モーダルを取得
    const settingsModal = document.querySelector('.modal.mod-settings');
    if (!settingsModal) {
      return [];
    }

    // Phase 1: 構造化要素の精密抽出
    this.extractFromStructuredElements(settingsModal, strings);

    // Phase 2: 補完的なTreeWalker抽出（Phase 1でカバーされていない要素）
    this.extractFromTreeWalker(settingsModal, strings);

    const result = Array.from(strings);
    
    return result;
  }

  // Phase 1: 構造化要素の精密抽出
  extractFromStructuredElements(container, strings) {
    
    // 1. setting-item-name（単純テキスト）
    container.querySelectorAll('.setting-item-name').forEach(element => {
      this.extractTextFromElement(element, strings, false);
    });

    // 2. setting-item-description（br分割対応、URL含有要素は除外）
    container.querySelectorAll('.setting-item-description').forEach(element => {
      this.extractFromDescriptionElement(element, strings);
    });

    // 3. リスト要素（ul/ol > li、URL含有要素は除外）
    container.querySelectorAll('ul, ol').forEach(listElement => {
      if (!this.containsAnchorLink(listElement)) {
        this.extractFromListElement(listElement, strings);
      }
    });

    // 4. ボタン要素（フローティングボタン除外版）
    container.querySelectorAll('button:not(.clickable-icon)').forEach(element => {
      // ★ フローティングボタンの除外チェック
      if (this.isCPLocalizerFloatingButton(element)) {
        return; // スキップ
      }
      
      this.extractTextFromElement(element, strings, false);
    });

    // 5. ラベル要素
    container.querySelectorAll('label').forEach(element => {
      this.extractTextFromElement(element, strings, false);
    });

    // 6. その他の単純要素
    ['.mod-cta', '.setting-item-info .description', 
    '.vertical-tab-content h1', '.vertical-tab-content h2', '.vertical-tab-content h3'].forEach(selector => {
      container.querySelectorAll(selector).forEach(element => {
        this.extractTextFromElement(element, strings, false);
      });
    });
  }

  // フローティングボタン判定メソッドを追加
  isCPLocalizerFloatingButton(element) {
    // 親要素に cp-localizer-drawer-container クラスがあるかチェック
    if (element.parentElement?.classList?.contains('cp-localizer-drawer-container')) {
      return true;
    }
    
    // 祖父母要素に cp-localizer-floating-button クラスがあるかチェック
    if (element.parentElement?.parentElement?.classList?.contains('cp-localizer-floating-button')) {
      return true;
    }
    
    // より安全な祖先チェック（最大3階層まで）
    let current = element;
    for (let i = 0; i < 3; i++) {
      current = current.parentElement;
      if (!current) break;
      
      if (current.classList?.contains('cp-localizer-floating-button') ||
          current.classList?.contains('cp-localizer-drawer-container') ||
          current.classList?.contains('cp-localizer-toggle-button')) {
        return true;
      }
    }
    
    return false;
  }

  // description要素からテキストノード直接走査で抽出（修正版）
  extractFromDescriptionElement(element, strings) {
    // TreeWalkerでテキストノードを直接走査
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = this.customTrim(node.textContent);
      
      if (text && this.isEnglishText(text)) {
        const normalizedText = this.normalizeText(text);
        
        strings.add(normalizedText);
      }
    }

    // 属性値も抽出（既存のまま）
    this.extractAttributesFromElement(element, strings);
  }

  // リスト要素（ul/ol）からli単位で抽出
  extractFromListElement(listElement, strings) {
    const listItems = listElement.querySelectorAll('li');
    
    listItems.forEach(li => {
      // 直接の子テキストノードのみを抽出（ネストしたリストは除外）
      this.extractDirectTextFromElement(li, strings);
      
      // ネストしたリストがある場合は再帰処理
      const nestedLists = li.querySelectorAll('ul, ol');
      nestedLists.forEach(nestedList => {
        this.extractFromListElement(nestedList, strings);
      });
    });
  }

  // 要素の直接の子テキストノードのみを抽出（ネスト要素を除外）
  extractDirectTextFromElement(element, strings) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 直接の子のテキストノードのみ受け入れ
          if (node.parentElement === element) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let textContent = '';
    let node;
    while (node = walker.nextNode()) {
      textContent += node.textContent;
    }

    // aタグなど、直接の子要素のテキストも含める
    const directChildren = element.children;
    for (const child of directChildren) {
      if (child.tagName.toLowerCase() === 'a') {
        textContent += child.textContent;
      }
    }

    if (textContent.trim()) {
      const normalizedText = this.normalizeText(textContent);
      if (this.isEnglishText(textContent)) {
        strings.add(normalizedText);
      }
    }

    // 属性値も抽出
    this.extractAttributesFromElement(element, strings);
  }

  // 単純な要素からテキストを抽出
  extractTextFromElement(element, strings, includeAttributes = true) {
    const text = this.customTrim(element.textContent);
    if (text) {
      const normalizedText = this.normalizeText(text);
      if (this.isEnglishText(text)) {
        strings.add(normalizedText);
      }
    }
    
    if (includeAttributes) {
      this.extractAttributesFromElement(element, strings);
    }
  }

  // 要素の属性値を抽出
  extractAttributesFromElement(element, strings) {
    const tagName = element.tagName?.toLowerCase();
    const isInputElement = ['input', 'textarea'].includes(tagName) || 
                          element.getAttribute('contenteditable') === 'true';

    if (!isInputElement) {
      ['placeholder', 'title', 'aria-label'].forEach(attr => {
        const attrValue = element.getAttribute(attr);
        if (attrValue && this.isEnglishText(attrValue)) {
          const normalizedAttr = this.normalizeText(attrValue);
          strings.add(normalizedAttr);
        }
      });
    }
  }

  // Phase 2: 補完的なTreeWalker抽出
  extractFromTreeWalker(container, strings) {
    const beforeCount = strings.size;

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (!text || text.length < 3) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Phase 1で処理された要素の子要素は除外
            const parent = node.parentElement;
            if (this.isAlreadyProcessedInPhase1(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            if (this.shouldSkipElement(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
          
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (this.shouldSkipElement(node) || this.isAlreadyProcessedInPhase1(node)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            if (node.hasAttribute('placeholder') || 
                node.hasAttribute('title') || 
                node.hasAttribute('aria-label')) {
              return NodeFilter.FILTER_ACCEPT;
            }
            
            return NodeFilter.FILTER_SKIP;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = this.customTrim(node.textContent);
        
        // Step 1: DOM文脈判定を追加
        if (this.isFileSelectionContext(node.parentElement)) {
          continue; // ファイル選択文脈のテキストは除外
        }
        
        if (this.isEnglishText(text)) {
          const normalizedText = this.normalizeText(text);
          strings.add(normalizedText);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        this.extractAttributesFromElement(node, strings);
      }
    }

    const addedCount = strings.size - beforeCount;
  }

  // Phase 1で処理済みの要素かどうかを判定
  isAlreadyProcessedInPhase1(element) {
    if (!element || !element.classList) return false;
  
    // Phase 1で処理されるクラス名
    const phase1Classes = [
      'setting-item-name',
      'setting-item-description', 
      'setting-item-info',
      'mod-cta'
    ];
    
    // 自分自身または祖先要素がPhase 1の対象かチェック
    let current = element;
    while (current) {
      if (current.classList) {
        for (const className of phase1Classes) {
          if (current.classList.contains(className)) {
            return true;
          }
        }
        
        // ul/ol/liもPhase 1で処理済み
        const tagName = current.tagName?.toLowerCase();
        if (['ul', 'ol', 'li'].includes(tagName)) {
          return true;
        }
        
        // button, labelもPhase 1で処理済み
        if (['button', 'label'].includes(tagName) && !current.classList.contains('clickable-icon')) {
          return true;
        }
      }
      current = current.parentElement;
    }
    
    return false;
  }

  // 抽出をスキップすべき要素かどうかを判定
  shouldSkipElement(element) {
    if (!element || !element.classList) return false;
    
    // スキップ対象のクラス名パターン
    const skipPatterns = [
      'vertical-tab-nav-item',    // タブナビゲーション
      'clickable-icon',           // アイコンボタン
      'modal-close-button',       // 閉じるボタン
      'mod-root',                 // ルート要素
      'workspace-leaf',           // ワークスペース
      'status-bar',               // ステータスバー
      'titlebar',                 // タイトルバー
      'nav-',                     // ナビゲーション系
      'ribbon',                   // リボン
      'sidebar',                   // サイドバー
      'modal-header',
      'modal-title', 
      'vertical-tab-header'
    ];
    
    // クラス名でのスキップ判定
    for (const pattern of skipPatterns) {
      if (Array.from(element.classList).some(className => 
          className.includes(pattern))) {
        return true;
      }
    }
    
    // 非表示要素のスキップ
    if (element.style && (
        element.style.display === 'none' || 
        element.style.visibility === 'hidden' ||
        element.style.opacity === '0')) {
      return true;
    }
    
    // script, style, noscript, 入力要素のスキップ
    const tagName = element.tagName?.toLowerCase();
    if (['script', 'style', 'noscript', 'input', 'textarea'].includes(tagName)) {
      return true;
    }

    // contenteditable要素のスキップ
    if (element.getAttribute('contenteditable') === 'true') {
      return true;
    }
    return false;
  }

  // a hrefを含む要素かどうかを判定
  containsAnchorLink(element) {
    if (!element) return false;
    
    // 自分自身がaタグの場合
    if (element.tagName?.toLowerCase() === 'a' && element.hasAttribute('href')) {
      return true;
    }
    
    // 子要素にa hrefが含まれている場合
    const anchors = element.querySelectorAll('a[href]');
    return anchors.length > 0;
  }

  normalizeText(text) {
    if (!text) return '';
    
    // 絵文字を一時的に保護
    const emojiPlaceholders = [];
    let protectedText = text.replace(this.emojiRegex, (match) => {
      const placeholder = `__EMOJI_${emojiPlaceholders.length}__`;
      emojiPlaceholders.push(match);
      return placeholder;
    });
    
    // 通常の正規化処理
    protectedText = protectedText
      .replace(/\\[nt]/g, '')           // \n, \t を削除
      .replace(/[\r\n\t]+/g, '')       // 実際の改行・タブを削除
      .replace(/[\s&&[^ ]]+/g, '');    // U+0020以外の空白文字を削除
    
    // 絵文字を復元
    emojiPlaceholders.forEach((emoji, index) => {
      protectedText = protectedText.replace(`__EMOJI_${index}__`, emoji);
    });
    // 絵文字を復元
    emojiPlaceholders.forEach((emoji, index) => {
      protectedText = protectedText.replace(`__EMOJI_${index}__`, emoji);
    });

    return protectedText;
  }

  // プラグイン名と一致するかチェック
  isPluginNameExactMatch(text) {
    if (!text) return false;
    
    const manifests = this.app.plugins.manifests;
    const enabledPlugins = this.app.plugins.enabledPlugins;
    
    const pluginNames = Object.values(manifests)
      .filter(manifest => enabledPlugins.has(manifest.id))
      .map(manifest => this.normalizeText(manifest.name));
    
    const normalizedText = this.normalizeText(text);
    return pluginNames.includes(normalizedText);
  }


  // 英語テキスト判定メソッド（TreeWalker用に強化）
  // ===== 緊急修正: 重要UI語の保護実装 =====

  // 既存のisEnglishText関数を以下のように修正
  isEnglishText(text, testMode = false) {
    const steps = testMode ? [] : null;
    
    // 1. 最低限のnullチェック
    if (!text) {
      if (testMode) {
        steps.push({ name: this.st('STEP_BASIC_CHECK'), status: '❌', reason: this.st('REASON_EMPTY_STRING') });
        return {
          result: false,
          reason: this.st('REASON_EMPTY_STRING_SHORT'),
          detail: this.st('DETAIL_EMPTY_STRING'),
          steps
        };
      }
      return false;
    }

    // 2. 【最優先】元の文字列での重要UI語チェック（正規化・絵文字除去前）
    const criticalUIWords = [
      'up', 'down', 'select', 'add', 'new', 'edit', 'save', 'delete', 'remove', 'copy', 'cut', 'paste',
      'show', 'hide', 'view', 'open', 'close', 'move', 'drag', 'drop', 'click', 'tap', 'press', 'choose', 'pick', 'toggle',
      'left', 'right', 'top', 'bottom', 'next', 'prev', 'file', 'folder', 'zip', 'pdf', 'csv', 'json', 'xml', 'html',
      'set', 'get', 'max', 'min', 'size', 'width', 'height', 'name', 'type', 'auto', 'manual', 'mode', 'run', 'stop', 'start', 'end', 'done',
      'tag', 'tab', 'item', 'card', 'note', 'page', 'link', 'url', 'find', 'search', 'filter', 'sort', 'group', 'list', 'grid',
      'import', 'export', 'load', 'sync', 'backup', 'restore'
    ];
    
    const originalLowerText = text.toLowerCase().trim();
    if (criticalUIWords.includes(originalLowerText)) {
      if (testMode) {
        steps.push({ name: this.st('STEP_IMPORTANT_UI_PROTECTION'), status: '✅', reason: this.st('REASON_IMPORTANT_UI_PROTECTION') });
        return {
          result: true,
          reason: this.st('REASON_IMPORTANT_UI_PROTECTION_SHORT'),
          detail: this.st('DETAIL_IMPORTANT_UI_PROTECTION'),
          steps
        };
      }
      return true;
    }
    if (testMode) {
      steps.push({ name: this.st('STEP_IMPORTANT_UI_PROTECTION'), status: '🔄', reason: this.st('REASON_IMPORTANT_UI_PROTECTION') });
    }
    
    // 3. プラグイン名完全一致チェック
    if (this.isPluginNameExactMatch(text)) {
      if (testMode) {
        steps.push({ 
          name: this.st('STEP_PLUGIN_NAME_EXCLUSION'), 
          status: '❌', 
          reason: this.st('REASON_PLUGIN_NAME_EXACT_MATCH') 
        });
        return {
          result: false,
          reason: this.st('REASON_PLUGIN_NAME_EXACT_MATCH'),
          detail: this.st('DETAIL_PLUGIN_NAME_EXACT_MATCH'),
          steps
        };
      }
      return false;
    }
    if (testMode) {
      steps.push({ 
        name: this.st('STEP_PLUGIN_NAME_EXCLUSION'), 
        status: '✅', 
        reason: this.st('REASON_PLUGIN_NAME_EXACT_MATCH') 
      });
    }

    // 4. 長さチェック（重要UI語でない場合のみ）
    if (text.length < 3) {
      if (testMode) {
        steps.push({ name: this.st('STEP_LENGTH_CHECK'), status: '❌', reason: this.st('REASON_CHAR_COUNT_INSUFFICIENT', { count: text.length }) });
        return {
          result: false,
          reason: this.st('REASON_CHAR_COUNT_INSUFFICIENT_SHORT'),
          detail: this.st('DETAIL_CHAR_COUNT_INSUFFICIENT'),
          steps
        };
      }
      return false;
    }
    if (testMode) {
      steps.push({ name: this.st('STEP_LENGTH_CHECK'), status: '✅', reason: this.st('REASON_CHAR_COUNT', { count: text.length }) });
    }

    // 5. 正規化処理
    const normalizedText = this.normalizeText(text);
    if (!normalizedText || normalizedText.length < 3) {
      if (testMode) {
        steps.push({ name: this.st('STEP_POST_NORMALIZATION_CHECK'), status: '❌', reason: this.st('REASON_POST_NORMALIZATION_INSUFFICIENT') });
        return {
          result: false,
          reason: this.st('REASON_POST_NORMALIZATION_INSUFFICIENT_SHORT'),
          detail: this.st('DETAIL_POST_NORMALIZATION_INSUFFICIENT'),
          steps
        };
      }
      return false;
    }
    if (testMode) {
      if (normalizedText !== text) {
        steps.push({ name: this.st('STEP_NORMALIZATION'), status: '🔄', reason: this.st('REASON_STRING_NORMALIZED') });
      } else {
        steps.push({ name: this.st('STEP_NORMALIZATION'), status: '✅', reason: this.st('REASON_NO_CHANGE') });
      }
      steps.push({ name: this.st('STEP_POST_NORMALIZATION_CHECK'), status: '✅', reason: this.st('REASON_CHAR_COUNT', { count: normalizedText.length }) });
    }

    // 6. 絵文字除去
    const textWithoutEmoji = normalizedText.replace(this.emojiRegex, '').trim();
    if (!textWithoutEmoji || textWithoutEmoji.length < 2) {
      if (testMode) {
        steps.push({ name: this.st('STEP_EMOJI_REMOVAL'), status: '🔄', reason: this.st('REASON_EMOJI_REMOVED') });
        steps.push({ name: this.st('STEP_POST_EMOJI_CHECK'), status: '❌', reason: this.st('REASON_POST_EMOJI_INSUFFICIENT') });
        return {
          result: false,
          reason: this.st('REASON_POST_EMOJI_INSUFFICIENT_SHORT'),
          detail: this.st('DETAIL_POST_EMOJI_INSUFFICIENT'),
          steps
        };
      }
      return false;
    }
    if (testMode) {
      if (normalizedText !== textWithoutEmoji) {
        steps.push({ name: this.st('STEP_EMOJI_REMOVAL'), status: '🔄', reason: this.st('REASON_EMOJI_REMOVED') });
      } else {
        steps.push({ name: this.st('STEP_EMOJI_REMOVAL'), status: '✅', reason: this.st('REASON_NO_EMOJI') });
      }
      steps.push({ name: this.st('STEP_POST_EMOJI_CHECK'), status: '✅', reason: this.st('REASON_CHAR_COUNT', { count: textWithoutEmoji.length }) });
    }
    
    // 7. 文字種チェック部分
    const englishPattern = /^[\p{L}\p{N}\p{P}\p{S}\p{Z}]+$/u;
    const englishPatternMatch = englishPattern.test(textWithoutEmoji);
    if (!englishPatternMatch) {
      if (testMode) {
        steps.push({ name: this.st('STEP_CHARACTER_TYPE_CHECK'), status: '❌', reason: this.st('REASON_INVALID_CHARACTERS') });
        return {
          result: false,
          reason: this.st('REASON_CHARACTER_TYPE_FAILED'),
          detail: this.st('DETAIL_INVALID_CHARACTERS'),
          steps
        };
      }
      return false;
    }
    if (testMode) {
      steps.push({ name: this.st('STEP_CHARACTER_TYPE_CHECK'), status: '✅', reason: this.st('REASON_VALID_CHARS_ONLY') });
    }

    // === 追加: 非英語スクリプトの除外判定 ===
    const nonEnglishScripts = {
      'SCRIPT_HIRAGANA': /\p{Script=Hiragana}/u,
      'SCRIPT_KATAKANA': /\p{Script=Katakana}/u,
      'SCRIPT_HAN': /\p{Script=Han}/u,
      'SCRIPT_HANGUL': /\p{Script=Hangul}/u,
      'SCRIPT_ARABIC': /\p{Script=Arabic}/u,
      'SCRIPT_THAI': /\p{Script=Thai}/u,
      'SCRIPT_CYRILLIC': /\p{Script=Cyrillic}/u,
      'SCRIPT_HEBREW': /\p{Script=Hebrew}/u
    };

    // 8. 非英語スクリプトの除外判定部分
    if (testMode) {
      // 検出された文字種を記録
      const detectedScripts = [];
      for (const [scriptKey, pattern] of Object.entries(nonEnglishScripts)) {
        if (pattern.test(textWithoutEmoji)) {
          detectedScripts.push(this.st(scriptKey));
        }
      }

      if (detectedScripts.length > 0) {
        let reasonText;
        if (detectedScripts.length === 1) {
          reasonText = this.st('SCRIPT_SINGLE_DETECTED', { script: detectedScripts[0] });
        } else {
          reasonText = this.st('SCRIPT_MULTIPLE_DETECTED', { scripts: detectedScripts.join('・') });
        }
        
        steps.push({ name: this.st('STEP_ALPHABET_SCRIPT_CHECK'), status: '❌', reason: reasonText });
        return {
          result: false,
          reason: this.st('REASON_NON_ENGLISH_SCRIPT_SHORT'),
          detail: this.st('DETAIL_NON_ENGLISH_SCRIPT', { scripts: detectedScripts.join('・') }),
          steps
        };
      }
      steps.push({ name: this.st('STEP_ALPHABET_SCRIPT_CHECK'), status: '✅', reason: this.st('REASON_ALPHABET_SCRIPT_ONLY') });
    } else {
      // 通常モード：高速判定
      for (const [scriptKey, pattern] of Object.entries(nonEnglishScripts)) {
        if (pattern.test(textWithoutEmoji)) {
          return false;
        }
      }
    }

    // 9. アルファベット存在チェック部分
    const hasLetter = /[a-zA-Z]/.test(textWithoutEmoji);
    if (!hasLetter) {
      if (testMode) {
        steps.push({ name: this.st('STEP_ALPHABET_EXISTENCE'), status: '❌', reason: this.st('REASON_NO_ALPHABET') });
        return {
          result: false,
          reason: this.st('REASON_NO_ALPHABET_SHORT'),
          detail: this.st('DETAIL_NO_ALPHABET'),
          steps
        };
      }
      return false;
    }
    if (testMode) {
      steps.push({ name: this.st('STEP_ALPHABET_EXISTENCE'), status: '✅', reason: this.st('REASON_ENGLISH_ALPHABET_EXISTS') });
    }
    
    // 10. ピリオド始まりの特別処理部分
    if (textWithoutEmoji.startsWith('.')) {
      // 明らかに技術的なファイル名/パターンを除外
      const technicalDotPatterns = [
        /^\.[a-z]+$/,                    // .env, .git等（小文字のみ）
        /^\.[a-z0-9]+$/,                 // メディア系
        /^\.[a-z]+\.[a-z]+$/,           // .gitignore, .eslintrc等
        /^\.\//,                         // ./path形式
        /^\.\d/,                         // .1, .2等（バージョン番号）
        /^\.[A-Z_]+$/,                   // .ENV等（定数形式）
      ];
      
      const isDotTechnical = technicalDotPatterns.some(pattern => pattern.test(textWithoutEmoji));
      if (isDotTechnical) {
        if (testMode) {
          steps.push({ name: this.st('STEP_TECHNICAL_PATTERN_CHECK'), status: '❌', reason: this.st('REASON_DOT_TECHNICAL_PATTERN') });
          return {
            result: false,
            reason: this.st('REASON_TECHNICAL_PATTERN_SHORT'),
            detail: this.st('DETAIL_DOT_TECHNICAL_PATTERN'),
            steps
          };
        }
        return false;
      }
      
      // ピリオド+スペース+英大文字なら文章として扱う
      if (/^\.\s+[A-Z]/.test(textWithoutEmoji)) {
        if (testMode) {
          steps.push({ name: this.st('STEP_TECHNICAL_PATTERN_CHECK'), status: '✅', reason: this.st('REASON_DOT_SENTENCE_PROTECTION') });
        }
        return testMode ? { 
          result: true, 
          reason: this.st('REASON_DOT_SENTENCE_PROTECTION_SHORT'), 
          detail: this.st('DETAIL_DOT_SENTENCE'), 
          steps 
        } : true;
      }
      
      // その他のピリオド始まりは後続の処理に委ねる
    } else {
      // 通常の技術パターンチェック
      const technicalPatterns = [
        { pattern: /^[a-f0-9]{8,}$/i, name: this.st('REASON_HASH_PATTERN'), detail: this.st('DETAIL_HASH_PATTERN') },
        { pattern: /^https?:\/\//i, name: this.st('REASON_URL_FORMAT'), detail: this.st('DETAIL_URL_PATTERN') },
        { pattern: /^[\/\\]/, name: this.st('REASON_PATH_FORMAT'), detail: this.st('DETAIL_PATH_PATTERN') },
        { pattern: /^\d+(\.\d+)*$/, name: this.st('REASON_VERSION_FORMAT'), detail: this.st('DETAIL_VERSION_PATTERN') },
        { pattern: /^[A-Z_]+$/, name: this.st('REASON_CONSTANT_FORMAT'), detail: this.st('DETAIL_CONSTANT_PATTERN') },
        { pattern: /^\s*[\{\}\[\](),:;]\s*$/, name: this.st('REASON_SYMBOLS_ONLY'), detail: this.st('DETAIL_SYMBOLS_PATTERN') },
        { pattern: /^(true|false|null|undefined)$/i, name: this.st('REASON_PROGRAM_KEYWORDS'), detail: this.st('DETAIL_PROGRAM_KEYWORDS_PATTERN') },
        { pattern: /^[0-9\s\-+()]+$/, name: this.st('REASON_NUMBERS_SYMBOLS_ONLY'), detail: this.st('DETAIL_NUMBERS_SYMBOLS_PATTERN') }
      ];
      
      for (const tech of technicalPatterns) {
        if (tech.pattern.test(textWithoutEmoji)) {
          if (testMode) {
            steps.push({ name: this.st('STEP_TECHNICAL_PATTERN_CHECK'), status: '❌', reason: tech.name });
            return {
              result: false,
              reason: this.st('REASON_TECHNICAL_PATTERN_SHORT'),
              detail: tech.detail,
              steps
            };
          }
          return false;
        }
      }
    }
    if (testMode) {
      steps.push({ name: this.st('STEP_TECHNICAL_PATTERN_CHECK'), status: '✅', reason: this.st('REASON_NOT_TECHNICAL_PATTERN') });
    }

    // 🔧 【修正】短すぎる一般的な単語の除外（重要語を除外リストから削除）
    // 11. 短い単語除外チェック部分
    const reallyCommonShortWords = [
      'to', 'in', 'at', 'is', 'be', 'do', 'or', 'if', 'an', 'as', 'by', 'he', 'it', 'me', 'my', 'of', 'so', 'we', 'us', 'am'
    ];

    if (reallyCommonShortWords.includes(textWithoutEmoji)) {
      if (testMode) {
        steps.push({ name: this.st('STEP_SHORT_WORD_EXCLUSION'), status: '❌', reason: this.st('REASON_COMMON_SHORT_WORD') });
        return {
          result: false,
          reason: this.st('REASON_COMMON_SHORT_WORD_SHORT'),
          detail: this.st('DETAIL_COMMON_SHORT_WORD'),
          steps
        };
      }
      return false;
    }
    if (testMode) {
      steps.push({ name: this.st('STEP_SHORT_WORD_EXCLUSION'), status: '✅', reason: this.st('REASON_NOT_COMMON_SHORT_WORD') });
    }

    // 12. 単語数・3文字単語判定部分
    const words = textWithoutEmoji.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 1 && words[0].length < 3) {
      if (testMode) {
        steps.push({ name: this.st('STEP_SHORT_WORD_EXCLUSION'), status: '❌', reason: this.st('REASON_TWO_CHAR_OR_LESS') });
        return {
          result: false,
          reason: this.st('REASON_SHORT_WORD_SHORT'),
          detail: this.st('DETAIL_TWO_CHAR_WORD'),
          steps
        };
      }
      return false;
    }

    if (words.length === 1 && words[0].length === 3) {
      // 3文字の場合は大文字を含むか重要語かで判定
      if (!/[A-Z]/.test(words[0]) && !criticalUIWords.includes(words[0].toLowerCase())) {
        // ただし、明らかに技術用語でない場合は保護
        const technicalIndicators = /^(api|css|sql|xml|url|jpg|png|pdf|zip|css|js|ts)$/i;
        if (!technicalIndicators.test(words[0])) {
          if (testMode) {
            steps.push({ name: this.st('STEP_THREE_CHAR_WORD_CHECK'), status: '✅', reason: this.st('REASON_NON_TECHNICAL_THREE_CHAR_PROTECTION') });
          }
          return testMode ? { 
            result: true, 
            reason: this.st('REASON_NON_TECHNICAL_THREE_CHAR_SHORT'), 
            detail: this.st('DETAIL_NON_TECHNICAL_THREE_CHAR_PROTECTION'), 
            steps 
          } : true;
        }
        if (testMode) {
          steps.push({ name: this.st('STEP_THREE_CHAR_WORD_CHECK'), status: '❌', reason: this.st('REASON_THREE_CHAR_NO_UPPERCASE_IMPORTANT') });
          return {
            result: false,
            reason: this.st('REASON_THREE_CHAR_WORD_SHORT'),
            detail: this.st('DETAIL_THREE_CHAR_WORD'),
            steps
          };
        }
        return false;
      }
    }
    
    // 13. ピリオド始まり文章の特別処理部分
    if (textWithoutEmoji.startsWith('.') && textWithoutEmoji.length > 3) {
      // ". Press any key" のような文章は有効として扱う
      const withoutLeadingPeriod = textWithoutEmoji.substring(1).trim();
      if (withoutLeadingPeriod.length >= 3 && /^[A-Z\s]/.test(withoutLeadingPeriod)) {
        if (testMode) {
          steps.push({ name: this.st('STEP_PERIOD_START_SENTENCE_CHECK'), status: '✅', reason: this.st('REASON_DOT_SENTENCE_PROTECTION') });
        }
        return testMode ? { 
          result: true, 
          reason: this.st('REASON_ENGLISH_PASSED_SHORT'), 
          detail: this.st('DETAIL_ENGLISH_PASSED'), 
          steps 
        } : true;
      }
    }

    // 14. 最終結果部分（英語判定通過）
    if (testMode) {
      return {
        result: true,
        reason: this.st('REASON_ENGLISH_PASSED_SHORT'),
        detail: this.st('DETAIL_ENGLISH_PASSED'),
        steps
      };
    }
    return true;
  }

  // DOM文脈判定: ファイル選択文脈かどうかを判定
  isFileSelectionContext(element) {
    if (!element) return false;
    
    // 自分自身または祖先要素を辿って判定
    let current = element;
    let depth = 0;
    
    while (current && depth < 10) { // 最大10層まで遡る（無限ループ防止）
      if (!current.classList && !current.tagName) {
        current = current.parentElement;
        depth++;
        continue;
      }

      
      const tagName = current.tagName?.toLowerCase();
      const classList = current.classList || [];
      if (classList.contains('choices__list') && classList.contains('choices__list--dropdown')) {
        return true; // Kanbanの数千ファイルリストを除外
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return false;
  }

  // プラグイン管理画面の監視設定
  setupPluginManagementObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // モーダルコンテナが追加された場合
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && 
                node.matches && node.matches('.modal-container.mod-dim')) {
              
              // プラグイン管理画面かどうかをチェック
              setTimeout(() => {
                const pluginModal = node.querySelector('.modal.mod-plugins');
                if (pluginModal) {
                  setTimeout(() => {
                    this.applyTranslationByState();
                  }, 200);
                }
              }, 100);
              break;
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: false
    });
    
    if (!this.pluginManagementObserver) {
      this.pluginManagementObserver = observer;
    }
  }

  // 翻訳状態に応じて翻訳を適用（現在プラグインのみ対象）
  async applyTranslationByState(showNotice = false) {
    const currentPlugin = this.getCurrentActivePlugin();
    if (!currentPlugin) {
      return;
    }
    
    if (this.settings.translationEnabled) {
      const applied = await this.applyTranslation(currentPlugin);
      if (applied) {
        if (showNotice) {
          new Notice(this.t('TRANSLATION_APPLIED', { pluginName: currentPlugin.name }));
        }
      }
    } else {
      const applied = await this.applyReverseTranslation(currentPlugin);
      if (applied) {
        if (showNotice) {
          new Notice(this.t('TRANSLATION_REVERTED', { pluginName: currentPlugin.name }));
        }
      }
    }
  }

  // トグルボタンのテキストを更新
  updateToggleButtonText(button) {
    if (this.settings.translationEnabled) {
      button.textContent = this.ui('TRANSLATION_ON');
      button.style.opacity = '1';
    } else {
      button.textContent = this.ui('TRANSLATION_OFF');
      button.style.opacity = '0.7';
    }
  }

  // 文字列抽出テスト機能
  testStringExtraction(inputText) {
    if (!inputText || typeof inputText !== 'string') {
      return {
        success: false,
        error: '文字列が入力されていません',
        inputText: inputText || '',
        result: false
      };
    }

    try {
      // Step 1: 英語判定（testMode使用 - 全ての判定を委任）
      const englishResult = this.isEnglishText(inputText, true);
      
      if (!englishResult.result) {
        return {
          success: true,
          inputText,
          normalizedText: this.normalizeText(inputText),
          result: false,
          reason: englishResult.reason,
          detail: englishResult.detail,
          steps: englishResult.steps
        };
      }

      const normalizedText = this.normalizeText(inputText);
      const steps = [...englishResult.steps];

      // 最終結果
      return {
        success: true,
        inputText,
        normalizedText,
        result: true,
        reason: this.st('REASON_EXTRACTION_TARGET_SHORT'),
        detail: this.st('DETAIL_EXTRACTION_TARGET'),
        steps
      };

    } catch (error) {
      return {
        success: false,
        error: `処理中にエラーが発生しました: ${error.message}`,
        inputText,
        result: false
      };
    }
  }

  onunload() {
    if (this.settingsModalObserver) {
      this.settingsModalObserver.disconnect();
      this.settingsModalObserver = null;
    }
    if (this.pluginManagementObserver) {
      this.pluginManagementObserver.disconnect();
      this.pluginManagementObserver = null;
    }
    if (this.tabSwitchObserver) {
      this.tabSwitchObserver.disconnect();
      this.tabSwitchObserver = null;
    }
    // 全てのタイムアウトをクリア
    if (this.dragStartTimeout) {
      clearTimeout(this.dragStartTimeout);
      this.dragStartTimeout = null;
    }
    
    // タッチイベントのクリーンアップ
    document.removeEventListener('touchmove', () => {});
    document.removeEventListener('touchend', () => {});
    document.removeEventListener('mousemove', () => {});
    document.removeEventListener('mouseup', () => {});
  }
    
};

// Obsidian標準モーダルクラスを継承した翻訳プレビューモーダル
class TranslationPreviewModal extends Modal {
  constructor(app, plugin, pluginManifest, originalStrings, translatedStrings) {
    super(app);
    this.plugin = plugin;
    this.pluginManifest = pluginManifest;
    this.originalStrings = originalStrings;
    this.translatedStrings = translatedStrings;
    this.translationInputs = [];
    this.insertButtons = [];
    this.insertUpButtons = [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // モーダルのリサイズ設定を追加（この部分を挿入）
    this.setupModalResize();      
    // モーダルタイトル
    contentEl.createEl('h2', { text: this.plugin.modal('TRANSLATION_PREVIEW_TITLE', { pluginName: this.pluginManifest.name }) });

    // 検索バー
    const searchContainer = contentEl.createDiv();
    searchContainer.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      margin-bottom: 12px;
    `;

    // 検索ボックス
    const searchInput = searchContainer.createEl('input');
    searchInput.type = 'text';
    searchInput.placeholder = this.plugin.modal('SEARCH_PLACEHOLDER');
    searchInput.style.cssText = `
      flex: 1;
      padding: 6px 10px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 3px;
      background: var(--background-primary);
      font-size: 13px;
    `;

    // 検索対象選択
    const targetSelect = searchContainer.createEl('select');
    targetSelect.style.cssText = `
      padding: 6px 8px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 3px;
      background: var(--background-primary);
      font-size: 13px;
    `;
    [
      { value: 'both', key: 'BOTH' },
      { value: 'original', key: 'ORIGINAL' },
      { value: 'translation', key: 'TRANSLATION' }
    ].forEach(({ value, key }) => {
      const option = targetSelect.createEl('option');
      option.value = value;
      option.textContent = this.plugin.modal(key);
    });

    // 検索結果表示
    const searchResultSpan = searchContainer.createEl('span');
    searchResultSpan.style.cssText = `
      font-size: 12px;
      color: var(--text-muted);
      min-width: 80px;
    `;

    // ナビゲーションボタン
    const prevButton = searchContainer.createEl('button');
    prevButton.textContent = '↑';
    prevButton.title = this.plugin.modal('PREVIOUS_RESULT');
    prevButton.style.cssText = `
      padding: 4px 8px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;

    const nextButton = searchContainer.createEl('button');
    nextButton.textContent = '↓';
    nextButton.title = this.plugin.modal('NEXT_RESULT');
    nextButton.style.cssText = `
      padding: 4px 8px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;

    // 検索イベントリスナー デバウンス適用版
    const performSearch = () => {
      this.searchTerm = searchInput.value.toLowerCase();
      this.searchTarget = targetSelect.value;
      this.updateSearchResults();
      this.updateSearchDisplay(searchResultSpan);
      this.highlightSearchResults();
    };

    // デバウンス関数を作成
    const debouncedSearch = this.plugin.adaptiveDebounce(performSearch, 300);

    // デバウンス適用
    searchInput.addEventListener('input', debouncedSearch);
    targetSelect.addEventListener('change', debouncedSearch);

    prevButton.addEventListener('click', () => {
      if (this.searchResults.length > 0) {
        this.currentSearchIndex = this.currentSearchIndex <= 0 ? 
          this.searchResults.length - 1 : this.currentSearchIndex - 1;
        this.updateSearchDisplay(searchResultSpan);
        this.scrollToSearchResult();
      }
    });

    nextButton.addEventListener('click', () => {
      if (this.searchResults.length > 0) {
        this.currentSearchIndex = this.currentSearchIndex >= this.searchResults.length - 1 ? 
          0 : this.currentSearchIndex + 1;
        this.updateSearchDisplay(searchResultSpan);
        this.scrollToSearchResult();
      }
    });
    // 検索バーでのエンターキー操作
    const updateSearchIndex = (isShiftKey) => {
      if (this.searchResults.length === 0) return;
      
      // インデックス更新（即座実行）
      if (isShiftKey) {
        this.currentSearchIndex = this.currentSearchIndex <= 0 ? 
          this.searchResults.length - 1 : this.currentSearchIndex - 1;
      } else {
        this.currentSearchIndex = this.currentSearchIndex >= this.searchResults.length - 1 ? 
          0 : this.currentSearchIndex + 1;
      }
      
      // 件数表示のみ即座更新
      this.updateSearchDisplay(searchResultSpan);
    };

    // 重量処理のデバウンス版
    const debouncedScrollAndHighlight = this.plugin.adaptiveDebounce(() => {
      this.scrollToSearchResult();
    }, 200);

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        // 1. 軽量処理を即座実行
        updateSearchIndex(e.shiftKey);
        
        // 2. 重量処理はデバウンス
        debouncedScrollAndHighlight();
      }
    });

    // 検索状態を保存するための参照
    this.searchElements = {
      searchInput,
      targetSelect,
      searchResultSpan,
      prevButton,
      nextButton
    };




    // ステータス表示
    const statusDiv = contentEl.createDiv();
    statusDiv.style.cssText = `
      padding: 8px 12px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
    `;

    const updateStatus = () => {
      const totalLines = this.originalStrings.length;
      const completedLines = this.translationInputs.filter(input => input.value.trim() !== '').length;
      const isAllCompleted = completedLines === totalLines;
      
      statusDiv.empty();
      const statusKey = isAllCompleted ? 'TRANSLATION_STATUS' : 'TRANSLATION_STATUS_INCOMPLETE';
      const statusSpan = statusDiv.createEl('span', {
        text: this.plugin.modal(statusKey, { completed: completedLines, total: totalLines })
      });
      
      saveButton.disabled = !isAllCompleted;
      saveButton.style.opacity = isAllCompleted ? '1' : '0.5';
      
      // 上矢印ボタンの状態を更新
      this.insertUpButtons.forEach((button, index) => {
        const isCurrentRowEmpty = this.translationInputs[index].value.trim() === '';
        const hasUpwardEmpty = this.findPreviousEmptyLine(index) !== -1;
        button.disabled = isAllCompleted || isCurrentRowEmpty || !hasUpwardEmpty;
        button.style.opacity = button.disabled ? '0.5' : '1';
        button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
        
        if (isAllCompleted) {
          button.title = this.plugin.modal('BUTTON_MOVE_UP_DISABLED_ALL_COMPLETED');
        } else if (isCurrentRowEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_UP_DISABLED_EMPTY_LINE');
        } else if (!hasUpwardEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_UP_DISABLED_NO_TARGET');
        } else {
          button.title = this.plugin.modal('MOVE_UP_TOOLTIP');
        }
      });

      // 下矢印ボタンの状態を更新
      this.insertButtons.forEach((button, index) => {
        const isCurrentRowEmpty = this.translationInputs[index].value.trim() === '';
        const hasDownwardEmpty = this.findNextEmptyLine(index) !== -1;
        const isLastRow = index === this.translationInputs.length - 1;
        button.disabled = isAllCompleted || isCurrentRowEmpty || !hasDownwardEmpty || isLastRow;
        button.style.opacity = button.disabled ? '0.5' : '1';
        button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
        
        if (isAllCompleted) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_ALL_COMPLETED');
        } else if (isCurrentRowEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_EMPTY_LINE');
        } else if (isLastRow) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_LAST_LINE');
        } else if (!hasDownwardEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_NO_TARGET');
        } else {
          button.title = this.plugin.modal('MOVE_DOWN_TOOLTIP');
        }
      });
    };
    this.updateStatus = updateStatus;

    // スクロール可能なコンテンツエリア
    const scrollContainer = contentEl.createDiv();
    scrollContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 16px;
      min-height: 200px;
    `;

    // contentElにflexレイアウトを追加
    contentEl.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px;
    `;

    // 各翻訳行を作成
    this.originalStrings.forEach((originalText, index) => {
      const row = scrollContainer.createDiv();
      row.style.cssText = `
        display: grid;
        grid-template-columns: 40px 30px 1fr 1fr 30px 30px;
        gap: 8px;
        margin-bottom: 12px;
        align-items: start;
      `;

      // 行番号
      const lineNumber = row.createDiv();
      lineNumber.textContent = (index + 1).toString();
      lineNumber.style.cssText = `
        text-align: center;
        font-weight: 500;
        color: var(--text-muted);
        padding-top: 8px;
      `;
      
      // オリジナルテキストコピーボタン
      const copyButton = row.createEl('button');
      copyButton.textContent = '📋';
      copyButton.title = this.plugin.modal('COPY_ORIGINAL_TOOLTIP');
      copyButton.style.cssText = `
        padding: 4px;
        background: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        height: 24px;
        margin-top: 6px;
        transition: background-color 0.2s ease;
      `;
      copyButton.addEventListener('mouseenter', () => {
        copyButton.style.background = 'var(--interactive-hover)';
      });
      copyButton.addEventListener('mouseleave', () => {
        copyButton.style.background = 'var(--interactive-normal)';
      });
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(originalText);
          new Notice(this.plugin.t('COPY_SUCCESS', { text: originalText.substring(0, 30) }));
          const originalButtonText = copyButton.textContent;
          copyButton.textContent = '✅';
          setTimeout(() => {
            copyButton.textContent = originalButtonText;
          }, 1000);
        } catch (error) {
          new Notice(this.plugin.t('ERROR_COPY_FAILED'));
        }
      });

      // 元文字列
      const originalDiv = row.createDiv();
      originalDiv.style.cssText = `
        padding: 8px 12px;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        font-size: 13px;
        line-height: 1.4;
        word-wrap: break-word;
        max-height: 100px;
        overflow-y: auto;
      `;
      originalDiv.textContent = originalText;

      // 翻訳入力フィールド
      const translationInput = row.createEl('textarea');
      translationInput.value = this.translatedStrings[index] || '';
      translationInput.style.cssText = `
        padding: 8px 12px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        font-size: 13px;
        line-height: 1.4;
        min-height: 36px;
        resize: vertical;
      `;

      const debouncedUpdateStatus = this.plugin.adaptiveDebounce(updateStatus, 200);
      translationInput.addEventListener('input', debouncedUpdateStatus);
      
      // 検索用のデータ属性を追加
      row.setAttribute('data-row-index', index);
      originalDiv.setAttribute('data-search-type', 'original');
      translationInput.setAttribute('data-search-type', 'translation');

      // 翻訳入力の変更時に検索結果も更新
      const debouncedSearchUpdate = this.plugin.adaptiveDebounce(() => {
        if (this.searchTerm) {
          this.updateSearchResults();
          this.updateSearchDisplay(this.searchElements.searchResultSpan);
          this.highlightSearchResults();
        }
      }, 500);

      translationInput.addEventListener('input', () => {
        updateStatus();
        debouncedSearchUpdate();
      });

      this.translationInputs.push(translationInput);

      // 上移動ボタン
      const insertUpButton = row.createEl('button');
      insertUpButton.textContent = '↑';
      insertUpButton.title = this.plugin.modal('MOVE_UP_TOOLTIP');
      insertUpButton.style.cssText = `
        padding: 4px;
        background: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        height: 24px;
        margin-top: 6px;
      `;
      insertUpButton.addEventListener('click', () => this.insertEmptyLineUp(index));
      this.insertUpButtons.push(insertUpButton);

      // 下移動ボタン（既存のinsertButtonをinsertDownButtonに名前変更）
      const insertDownButton = row.createEl('button');
      insertDownButton.textContent = '↓';
      insertDownButton.title = this.plugin.modal('MOVE_DOWN_TOOLTIP');
      insertDownButton.style.cssText = `
        padding: 4px;
        background: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        height: 24px;
        margin-top: 6px;
      `;
      insertDownButton.addEventListener('click', () => this.insertEmptyLine(index));
      this.insertButtons.push(insertDownButton);
    });

    // ボタンエリア
    const buttonArea = contentEl.createDiv();
    buttonArea.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    // 右側ボタングループ
    const rightButtons = buttonArea.createDiv();
    rightButtons.style.cssText = `display: flex; gap: 8px;`;

    // キャンセルボタン
    const cancelButton = rightButtons.createEl('button', { text: this.plugin.modal('CANCEL') });
    cancelButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelButton.addEventListener('click', () => this.close());

    // 保存ボタン
    const saveButton = rightButtons.createEl('button', { text: this.plugin.modal('SAVE') });
    saveButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-accent);
      border: 1px solid var(--interactive-accent);
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-on-accent);
    `;
    
    saveButton.addEventListener('click', async () => {
      const finalTranslatedStrings = this.translationInputs.map(input => this.plugin.customTrim(input.value));
      const emptyCount = finalTranslatedStrings.filter(str => str === '').length;
      
      if (emptyCount > 0) {
        new Notice(this.plugin.t('ERROR_INCOMPLETE_TRANSLATION', { count: emptyCount }));
        return;
      }
      
      try {
        await this.plugin.saveTranslationToJSON(this.pluginManifest, this.originalStrings, finalTranslatedStrings);
        new Notice(this.plugin.t('SAVE_SUCCESS', { pluginName: this.pluginManifest.name }));
        this.close();
      } catch (error) {
        console.error('保存エラー:', error);
        new Notice(this.plugin.t('ERROR_SAVE_FAILED', { error: error.message }));
      }
    });

    // 初期ステータス更新
    updateStatus();

    // 最初の空のテキストエリアにフォーカス
    const firstEmptyInput = this.translationInputs.find(input => input.value.trim() === '');
    if (firstEmptyInput) {
      setTimeout(() => firstEmptyInput.focus(), 100);
    }
  }

  // 空行挿入機能
  insertEmptyLine(insertIndex) {
    // すべて入力済みの場合は処理を中断
    const isAllCompleted = this.translationInputs.every(input => input.value.trim() !== '');
    if (isAllCompleted) {
      new Notice(this.plugin.t('WARNING_ALL_COMPLETED'));
      return;
    }

    // 最下行チェック
    if (insertIndex === this.translationInputs.length - 1) {
      new Notice(this.plugin.t('WARNING_LAST_LINE'));
      return;
    }

    // 👇 修正点：移動先を先に確認
    const targetEmptyIndex = this.findNextEmptyLine(insertIndex);
    if (targetEmptyIndex === -1) {
      new Notice(this.plugin.t('WARNING_NO_TARGET'));
      return;
    }

    // 移動先が確認できてから内容を移動
    const currentText = this.translationInputs[insertIndex].value;
    
    // 移動元より後、移動先より前の要素を1つ後ろにシフト
    for (let i = targetEmptyIndex; i > insertIndex + 1; i--) {
      this.translationInputs[i].value = this.translationInputs[i - 1].value;
    }

    // 移動元を空白にする
    this.translationInputs[insertIndex].value = '';

    // 移動元の直後に元の内容を配置
    this.translationInputs[insertIndex + 1].value = currentText;

    // 空白になった行にフォーカス
    setTimeout(() => {
      this.translationInputs[insertIndex].focus();
    }, 100);

    new Notice(this.plugin.t('BUTTON_SHIFT_SUCCESS', { line: insertIndex + 1 }));
    if (this.updateStatus) {
      this.updateStatus();
    }
  }
  // 上移動機能
  insertEmptyLineUp(insertIndex) {
    // すべて入力済みの場合は処理を中断
    const isAllCompleted = this.translationInputs.every(input => input.value.trim() !== '');
    if (isAllCompleted) {
      new Notice(this.plugin.t('WARNING_ALL_COMPLETED'));
      return;
    }

    // 上の空行を検索
    const targetEmptyIndex = this.findPreviousEmptyLine(insertIndex);
    if (targetEmptyIndex === -1) {
      new Notice(this.plugin.t('WARNING_NO_TARGET'));
      return;
    }

    // 内容を移動
    const currentText = this.translationInputs[insertIndex].value;

    // 移動先より後、移動元より前の要素を1つずつ前にシフト
    for (let i = targetEmptyIndex; i < insertIndex; i++) {
      this.translationInputs[i].value = this.translationInputs[i + 1].value;
    }

    // 移動元を空白にする
    this.translationInputs[insertIndex].value = '';

    // 移動元の直前に元の内容を配置
    this.translationInputs[insertIndex - 1].value = currentText;

    // 移動先にフォーカス
    setTimeout(() => {
      this.translationInputs[insertIndex - 1].focus();
    }, 100);

    new Notice(this.plugin.t('BUTTON_MOVE_SUCCESS', { from: insertIndex + 1, to: insertIndex }));
    if (this.updateStatus) {
      this.updateStatus();
    }
  }

  // 上の空行を検索
  findPreviousEmptyLine(startIndex) {
    for (let i = startIndex - 1; i >= 0; i--) {
      if (this.translationInputs[i].value.trim() === '') {
        return i;
      }
    }
    return -1;
  }

  // 下の空行を検索
  findNextEmptyLine(startIndex) {
    for (let i = startIndex + 1; i < this.translationInputs.length; i++) {
      if (this.translationInputs[i].value.trim() === '') {
        return i;
      }
    }
    return -1;
  }

  // 検索結果を更新
  updateSearchResults() {
    this.searchResults = [];
    this.currentSearchIndex = -1;
    
    if (!this.searchTerm.trim()) {
      return;
    }
    
    this.originalStrings.forEach((originalText, index) => {
      const translatedText = this.translationInputs[index].value;
      let isMatch = false;
      
      if (this.searchTarget === 'original' || this.searchTarget === 'both') {
        if (originalText.toLowerCase().includes(this.searchTerm)) {
          isMatch = true;
        }
      }
      
      if (this.searchTarget === 'translation' || this.searchTarget === 'both') {
        if (translatedText.toLowerCase().includes(this.searchTerm)) {
          isMatch = true;
        }
      }
      
      if (isMatch) {
        this.searchResults.push(index);
      }
    });
    
    if (this.searchResults.length > 0) {
      this.currentSearchIndex = 0;
    }
  }

  // 検索表示を更新
  updateSearchDisplay(searchResultSpan) {
    const { searchInput, prevButton, nextButton } = this.searchElements;
    
    if (!this.searchTerm.trim()) {
      searchResultSpan.textContent = '';
      prevButton.disabled = true;
      nextButton.disabled = true;
      prevButton.style.opacity = '0.5';
      nextButton.style.opacity = '0.5';
      return;
    }
    
    if (this.searchResults.length === 0) {
      searchResultSpan.textContent = this.plugin.modal('SEARCH_RESULTS_NONE');
      prevButton.disabled = true;
      nextButton.disabled = true;
      prevButton.style.opacity = '0.5';
      nextButton.style.opacity = '0.5';
    } else {
      searchResultSpan.textContent = this.plugin.modal('SEARCH_RESULTS_COUNT', {
        current: this.currentSearchIndex + 1,
        total: this.searchResults.length
      });
      prevButton.disabled = false;
      nextButton.disabled = false;
      prevButton.style.opacity = '1';
      nextButton.style.opacity = '1';
    }
  }

  // 検索結果をハイライト（枠線 + アイコン版）
  highlightSearchResults() {
    // 既存のハイライトをクリア
    const allRows = this.modalEl.querySelectorAll('[data-row-index]');
    allRows.forEach(row => {
      // 検索関連のスタイルのみクリア（元々のスタイルは保持）
      row.style.border = '';
      row.style.borderRadius = '';
      row.style.padding = '';
      row.style.position = '';
      
      // アイコンを削除
      const existingIcon = row.querySelector('.search-result-icon');
      if (existingIcon) {
        existingIcon.remove();
      }
      
      const originalDiv = row.querySelector('[data-search-type="original"]');
      const translationInput = row.querySelector('[data-search-type="translation"]');
      
      if (originalDiv) {
        // 元々のスタイルを復元
        originalDiv.style.border = '1px solid var(--background-modifier-border)';
        originalDiv.style.borderRadius = '4px';
        // テキスト内ハイライトをクリア（innerHTMLを使わない方法）
        const rowIndex = parseInt(row.getAttribute('data-row-index'));
        if (!isNaN(rowIndex) && this.originalStrings[rowIndex]) {
          originalDiv.textContent = this.originalStrings[rowIndex];
        }
      }
      
      if (translationInput) {
        // 元々のスタイルを復元
        translationInput.style.border = '1px solid var(--background-modifier-border)';
        translationInput.style.borderRadius = '4px';
        translationInput.style.backgroundColor = 'var(--background-primary)';
      }
    });
    
    if (!this.searchTerm.trim() || this.searchResults.length === 0) {
      return;
    }
    
    // 検索結果をハイライト
    this.searchResults.forEach((rowIndex, searchIndex) => {
      const row = this.modalEl.querySelector(`[data-row-index="${rowIndex}"]`);
      if (row) {
        const isCurrent = searchIndex === this.currentSearchIndex;
        
        // 枠線スタイル
        const borderColor = isCurrent ? 
          'var(--interactive-accent)' : 
          'var(--color-yellow)';
        const borderWidth = isCurrent ? '3px' : '2px';
        
        row.style.border = `${borderWidth} solid ${borderColor}`;
        row.style.borderRadius = '6px';
        row.style.padding = '8px';
        
        // アイコンを追加
        const iconSpan = row.createEl('span');
        iconSpan.className = 'search-result-icon';
        iconSpan.textContent = isCurrent ? '🎯' : '🔍';
        iconSpan.style.cssText = `
          position: absolute;
          top: -8px;
          right: -8px;
          background: ${borderColor};
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        // 行を相対位置に設定（アイコンの絶対位置のため）
        row.style.position = 'relative';
        
        // 個別要素の枠線
        const originalDiv = row.querySelector('[data-search-type="original"]');
        const translationInput = row.querySelector('[data-search-type="translation"]');

        if (this.searchTarget === 'original' || this.searchTarget === 'both') {
          if (originalDiv && this.originalStrings[rowIndex].toLowerCase().includes(this.searchTerm)) {
            originalDiv.style.border = `1px solid ${borderColor}`;
            originalDiv.style.borderRadius = '4px';
            // テキスト内ハイライトを適用
            this.highlightTextContent(originalDiv, this.originalStrings[rowIndex], isCurrent);
          }
        }

        if (this.searchTarget === 'translation' || this.searchTarget === 'both') {
          if (translationInput && translationInput.value.toLowerCase().includes(this.searchTerm)) {
            translationInput.style.border = `1px solid ${borderColor}`;
            translationInput.style.borderRadius = '4px';
            // 翻訳フィールドは入力要素なので、背景色でハイライト
            const highlightColor = isCurrent ? 
              'rgba(var(--interactive-accent-rgb), 0.1)' : 
              'rgba(241, 196, 15, 0.1)';
            translationInput.style.backgroundColor = highlightColor;
          }
        }
      }
    });
  }

  // 現在の検索結果にスクロール
  scrollToSearchResult() {
    if (this.currentSearchIndex >= 0 && this.currentSearchIndex < this.searchResults.length) {
      const rowIndex = this.searchResults[this.currentSearchIndex];
      const row = this.modalEl.querySelector(`[data-row-index="${rowIndex}"]`);
      if (row) {
        row.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        this.highlightSearchResults();
      }
    }
  }
  // テキスト内の検索文字列をハイライト
  highlightTextContent(element, text, isCurrentResult) {
    element.empty();
    this.createHighlightedContent(element, text, this.searchTerm, isCurrentResult);
  }

  // 安全なハイライト機能を実装
  createHighlightedContent(element, text, searchTerm, isCurrentResult) {
    if (!searchTerm.trim() || !text.toLowerCase().includes(searchTerm.toLowerCase())) {
      element.appendText(text);
      return;
    }
    
    const highlightClass = isCurrentResult ? 'search-highlight-current' : 'search-highlight-other';
    const lowerText = text.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    let lastIndex = 0;
    let matchIndex = lowerText.indexOf(lowerSearchTerm);
    
    while (matchIndex !== -1) {
      // マッチ前のテキストを追加
      if (matchIndex > lastIndex) {
        element.appendText(text.substring(lastIndex, matchIndex));
      }
      
      // ハイライト部分をmarkタグで安全に追加
      const mark = element.createEl('mark', {
        text: text.substring(matchIndex, matchIndex + searchTerm.length),
        cls: highlightClass
      });
      
      lastIndex = matchIndex + searchTerm.length;
      matchIndex = lowerText.indexOf(lowerSearchTerm, lastIndex);
    }
    
    // 残りのテキストを追加
    if (lastIndex < text.length) {
      element.appendText(text.substring(lastIndex));
    }
  }

  onClose() {
    // クリーンアップ処理
    this.translationInputs = [];
    this.insertButtons = [];
    this.insertUpButtons = [];
    this.searchElements = null;
    this.searchResults = [];
    this.currentSearchIndex = -1;
    this.searchTerm = '';
    // 検索用スタイルを削除
    const searchStyles = document.querySelector('#translation-modal-search-styles');
    if (searchStyles) {
      searchStyles.remove();
    }
  }

  setupModalResize() {
    const modal = this.modalEl;
    
    // 保存されたサイズを復元
    const savedSize = this.plugin.settings.translationPreviewSize;
    modal.style.width = savedSize.width + 'px';
    modal.style.height = savedSize.height + 'px';
    modal.style.maxWidth = 'none';
    modal.style.maxHeight = 'none';
    modal.style.minWidth = '400px';
    modal.style.minHeight = '300px';
    modal.style.resize = 'none'; // CSSのresizeを無効化
    
    // リサイズハンドルを作成
    const resizeHandle = modal.createDiv();
    resizeHandle.className = 'translation-modal-resize-handle';
    resizeHandle.textContent = '⋰';
    resizeHandle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nw-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--background-primary);
      border-left: 1px solid var(--background-modifier-border);
      border-top: 1px solid var(--background-modifier-border);
      user-select: none;
      transition: color 0.2s ease;
    `;
    
    // リサイズ機能の実装
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(window.getComputedStyle(modal, null).getPropertyValue('width'));
      startHeight = parseInt(window.getComputedStyle(modal, null).getPropertyValue('height'));
      
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
      
      const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const width = Math.max(400, startWidth + (e.clientX - startX));
        const height = Math.max(300, startHeight + (e.clientY - startY));
        
        modal.style.width = width + 'px';
        modal.style.height = height + 'px';
      };
      
      const handleMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          
          // サイズを保存
          const finalWidth = parseInt(modal.style.width);
          const finalHeight = parseInt(modal.style.height);
          this.plugin.settings.translationPreviewSize = {
            width: finalWidth,
            height: finalHeight
          };
          this.plugin.saveSettings();
          
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    // 検索ハイライト用のスタイルを追加
    if (!document.querySelector('#translation-modal-search-styles')) {
      const searchStyles = document.createElement('style');
      searchStyles.id = 'translation-modal-search-styles';
      searchStyles.textContent = `
        .search-result-icon {
          animation: searchPulse 1s ease-in-out infinite alternate;
        }
        
        @keyframes searchPulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        
        /* 黄色の定義（テーマに依存しない） */
        :root {
          --color-yellow: #f1c40f;
        }
        
        /* ダークテーマでの調整 */
        .theme-dark {
          --color-yellow: #f39c12;
        }
        /* テキスト内ハイライト用スタイル */
        .search-highlight-current {
          background-color: var(--interactive-accent) !important;
          color: white !important;
          padding: 1px 2px;
          border-radius: 2px;
          font-weight: bold;
          animation: textHighlightPulse 1.5s ease-in-out infinite alternate;
        }
        
        .search-highlight-other {
          background-color: var(--color-yellow) !important;
          color: black !important;
          padding: 1px 2px;
          border-radius: 2px;
          font-weight: 500;
        }
        
        @keyframes textHighlightPulse {
          0% { box-shadow: 0 0 2px var(--interactive-accent); }
          100% { box-shadow: 0 0 6px var(--interactive-accent); }
        }
      `;
      document.head.appendChild(searchStyles);
    }


  }
}

// チャンク管理モーダル
class ChunkManagementModal extends Modal {
  constructor(app, plugin, chunkData) {
    super(app);
    this.plugin = plugin;
    this.chunkData = chunkData;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    // ===== Flexboxレイアウト設定 =====
    contentEl.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px;
    `;
    // モーダルタイトル
    contentEl.createEl('h2', { text: this.plugin.modal('CHUNK_MANAGEMENT_TITLE', { pluginName: this.chunkData.pluginName }) });
    // サイズ拡縮機能を追加
    this.setupModalResize();

    // 統計情報
    const statsDiv = contentEl.createDiv();
    statsDiv.className = 'stats-div';  
    statsDiv.style.cssText = `
      padding: 12px 16px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      margin-bottom: 16px;
    `;
    
    const totalChunks = this.chunkData.chunks.length;
    const completedChunks = this.chunkData.chunks.filter(c => c.status === 'completed').length;
    
    statsDiv.empty();
    const statsLine1 = statsDiv.createEl('div', {
      text: this.plugin.modal('STATS_TOTAL_CHARS', { 
        totalCharacters: this.chunkData.totalCharacters, 
        totalChunks: totalChunks 
      })
    });
    const statsLine2 = statsDiv.createEl('div', {
      text: this.plugin.modal('STATS_TRANSLATION_STATUS', { 
        progressIndicator: this.getProgressIndicator(completedChunks, totalChunks),
        completedChunks: completedChunks,
        totalChunks: totalChunks
      }),
      attr: { style: 'margin-top: 4px;' }
    });

    // スクロール可能なチャンクリスト
    const scrollContainer = contentEl.createDiv();
    scrollContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 16px;
      min-height: 200px;
    `;

    // 各チャンクを表示
    this.chunkData.chunks.forEach((chunk, index) => {
      this.createChunkElement(scrollContainer, chunk, index);
    });

    // ステータスメッセージ
    this.statusMessageEl = contentEl.createDiv();
    this.statusMessageEl.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 16px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.4;
    `;
    this.updateStatusMessage();

    // ボタンエリア
    const buttonArea = contentEl.createDiv();
    buttonArea.style.cssText = `
      display: flex;
      justify-content: space-between;
      gap: 12px;
    `;

    // 翻訳プレビューへ移動ボタン
    this.previewButton = buttonArea.createEl('button', { text: this.plugin.modal('MOVE_TO_PREVIEW') });
    this.previewButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-accent);
      border: 1px solid var(--interactive-accent);
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-on-accent);
    `;
    this.previewButton.addEventListener('click', () => this.openTranslationPreview());

    // 閉じるボタン
    const closeButton = buttonArea.createEl('button', { text: this.plugin.modal('CLOSE') });
    closeButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      cursor: pointer;
    `;
    closeButton.addEventListener('click', () => this.close());

    this.updatePreviewButtonState();
  }

  createChunkElement(container, chunk, index) {
    const chunkDiv = container.createDiv();
    chunkDiv.className = 'chunk-element';
    chunkDiv.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      background: var(--background-primary);
    `;

    // チャンク情報
    const headerDiv = chunkDiv.createDiv();
    headerDiv.className = 'chunk-header';
    headerDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-weight: 500;
    `;
    
    const statusDisplay = this.getChunkStatusDisplay(chunk);
    const statusIcon = statusDisplay.icon;
    const statusText = statusDisplay.text;

    const mainSpan = headerDiv.createEl('span');
    mainSpan.appendText(this.plugin.modal('CHUNK_HEADER', { 
      chunkId: chunk.id, 
      characterCount: chunk.characterCount 
    }) + ' ');
    const statusSpan = mainSpan.createEl('span', {
      text: `${statusIcon} ${statusText}`,
      attr: { style: `color: ${statusDisplay.color}` }
    });

    // プレビューテキスト
    const previewDiv = chunkDiv.createDiv();
    previewDiv.className = 'chunk-preview';
    previewDiv.style.cssText = `
      background: var(--background-secondary);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    
    const previewText = chunk.status === 'completed' && chunk.translatedStrings.length > 0
      ? chunk.translatedStrings.slice(0, 3).join(', ') + '...'
      : chunk.strings.slice(0, 3).join(', ') + '...';
    previewDiv.textContent = previewText;

    // ボタンエリア
    const buttonDiv = chunkDiv.createDiv();
    buttonDiv.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    // コピーボタン
    const copyButton = buttonDiv.createEl('button', { text: this.plugin.modal('COPY_CHUNK') });
    copyButton.style.cssText = this.getButtonStyle();
    copyButton.addEventListener('click', () => this.copyChunk(chunk));

    // 貼付ボタン
    const pasteButton = buttonDiv.createEl('button', { text: this.plugin.modal('PASTE_CHUNK') });

    pasteButton.style.cssText = this.getButtonStyle();
    pasteButton.addEventListener('click', () => this.pasteChunk(chunk));

    // 編集ボタン
    const editButton = buttonDiv.createEl('button', { text: this.plugin.modal('EDIT_CHUNK') });
    editButton.className = 'edit-button';
    editButton.style.cssText = this.getButtonStyle();
    editButton.disabled = chunk.status === 'pending';
    if (chunk.status === 'pending') {
      editButton.style.opacity = '0.5';
      editButton.style.cursor = 'not-allowed';
      editButton.title = this.plugin.modal('EDIT_CHUNK_PENDING');
    } else {
      editButton.style.opacity = '1';
      editButton.style.cursor = 'pointer';
      editButton.title = chunk.status === 'mismatch' ? 
        this.plugin.modal('EDIT_CHUNK_MISMATCH') : 
        this.plugin.modal('EDIT_CHUNK_NORMAL');
    }
    editButton.addEventListener('click', () => this.editChunk(chunk));
  }

  getButtonStyle() {
    return `
      padding: 6px 12px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s ease;
    `;
  }

  getProgressIndicator(completed, total) {
    const indicators = [];
    for (let i = 0; i < total; i++) {
      const chunk = this.chunkData.chunks[i];
      if (chunk.status === 'completed') {
        indicators.push('●');
      } else if (chunk.status === 'mismatch') {
        indicators.push('!');
      } else {
        indicators.push('○');
      }
    }
    return `[${indicators.join('')}]`;
  }

  updateStatusMessage() {
    const totalChunks = this.chunkData.chunks.length;
    const completedChunks = this.chunkData.chunks.filter(c => c.status === 'completed').length;
    const mismatchChunks = this.chunkData.chunks.filter(c => c.status === 'mismatch').length;
    
    this.statusMessageEl.empty();

    if (mismatchChunks > 0) {
      const errorDiv = this.statusMessageEl.createEl('div', {
        attr: { style: 'color: var(--text-error);' }
      });
      errorDiv.appendText(this.plugin.modal('STATUS_MISMATCH_ERROR', { mismatchChunks: mismatchChunks }));
      errorDiv.createEl('br');
      errorDiv.appendText(this.plugin.modal('STATUS_MISMATCH_INSTRUCTION'));
    } else if (completedChunks === 0) {
      this.statusMessageEl.createEl('div', {
        text: this.plugin.modal('STATUS_NO_TRANSLATION'),
        attr: { style: 'color: var(--text-muted);' }
      });
    } else if (completedChunks < totalChunks) {
      const progressDiv = this.statusMessageEl.createEl('div', {
        attr: { style: 'color: var(--text-accent);' }
      });
      progressDiv.appendText(this.plugin.modal('STATUS_IN_PROGRESS', { 
        completedChunks: completedChunks, 
        totalChunks: totalChunks 
      }));
      progressDiv.createEl('br');
      progressDiv.appendText(this.plugin.modal('STATUS_IN_PROGRESS_REMAINING', { 
        remainingChunks: totalChunks - completedChunks 
      }));
    } else {
      const successDiv = this.statusMessageEl.createEl('div', {
        attr: { style: 'color: var(--text-success);' }
      });
      successDiv.appendText(this.plugin.modal('STATUS_ALL_COMPLETED'));
      successDiv.createEl('br');
      successDiv.appendText(this.plugin.modal('STATUS_ALL_COMPLETED_INSTRUCTION1'));
      successDiv.createEl('br');
      successDiv.appendText(this.plugin.modal('STATUS_ALL_COMPLETED_INSTRUCTION2'));
    }
  }

  updatePreviewButtonState() {
    const allCompleted = this.chunkData.chunks.every(c => c.status === 'completed');
    const hasMismatch = this.chunkData.chunks.some(c => c.status === 'mismatch');
    
    this.previewButton.disabled = !allCompleted;
    this.previewButton.style.opacity = allCompleted ? '1' : '0.5';
    
    if (hasMismatch) {
      this.previewButton.title = this.plugin.modal('PREVIEW_DISABLED_MISMATCH');
    } else if (!allCompleted) {
      this.previewButton.title = this.plugin.modal('PREVIEW_DISABLED_INCOMPLETE');
    } else {
      this.previewButton.title = this.plugin.modal('PREVIEW_ENABLED');
    }
  }
  getChunkStatusDisplay(chunk) {
    switch(chunk.status) {
      case 'completed':
        return { 
          icon: '[●]', 
          text: this.plugin.modal('TRANSLATION_COMPLETED'), 
          color: 'var(--text-success)' 
        };
      case 'mismatch':
        return { 
          icon: '[!]', 
          text: this.plugin.modal('LINE_MISMATCH'), 
          color: 'var(--text-error)' 
        };
      case 'pending':
      default:
        return { 
          icon: '[○]', 
          text: this.plugin.modal('UNTRANSLATED'), 
          color: 'var(--text-muted)' 
        };
    }
  }

    updateHeaderStats() {
      const statsDiv = this.contentEl.querySelector('.stats-div');
      if (!statsDiv) return;
      
      const totalChunks = this.chunkData.chunks.length;
      const completedChunks = this.chunkData.chunks.filter(c => c.status === 'completed').length;
      
      statsDiv.empty();
      const statsLine1 = statsDiv.createEl('div', {
        text: this.plugin.modal('STATS_TOTAL_CHARS', { 
          totalCharacters: this.chunkData.totalCharacters, 
          totalChunks: totalChunks 
        })
      });
      const statsLine2 = statsDiv.createEl('div', {
        text: this.plugin.modal('STATS_TRANSLATION_STATUS', { 
          progressIndicator: this.getProgressIndicator(completedChunks, totalChunks),
          completedChunks: completedChunks,
          totalChunks: totalChunks
        }),
        attr: { style: 'margin-top: 4px;' }
      });
    }

    updateChunkElement(chunk) {
      const chunkElements = this.contentEl.querySelectorAll('.chunk-element');
      const chunkIndex = this.chunkData.chunks.findIndex(c => c.id === chunk.id);
      const chunkElement = chunkElements[chunkIndex];
      
      if (!chunkElement) return;
      
      // ステータス表示を更新
      const statusDisplay = this.getChunkStatusDisplay(chunk);
      const headerDiv = chunkElement.querySelector('.chunk-header');
      if (headerDiv) {
        headerDiv.empty();
        const mainSpan = headerDiv.createEl('span');
        mainSpan.appendText(this.plugin.modal('CHUNK_HEADER', { 
          chunkId: chunk.id, 
          characterCount: chunk.characterCount 
        }) + ' ');
        const statusSpan = mainSpan.createEl('span', {
          text: `${statusDisplay.icon} ${statusDisplay.text}`,
          attr: { style: `color: ${statusDisplay.color}` }
        });
      }
      
      // プレビューテキストを更新
      const previewDiv = chunkElement.querySelector('.chunk-preview');
      if (previewDiv) {
        const previewText = chunk.status === 'completed' && chunk.translatedStrings.length > 0
          ? chunk.translatedStrings.slice(0, 3).join(', ') + '...'
          : chunk.strings.slice(0, 3).join(', ') + '...';
        previewDiv.textContent = previewText;
      }
      
      // 編集ボタンの状態を更新
      const editButton = chunkElement.querySelector('.edit-button');
      if (editButton) {
        editButton.disabled = chunk.status === 'pending';
        if (chunk.status === 'pending') {
          editButton.style.opacity = '0.5';
          editButton.style.cursor = 'not-allowed';
          editButton.title = this.plugin.modal('EDIT_CHUNK_PENDING');
        } else {
          editButton.style.opacity = '1';
          editButton.style.cursor = 'pointer';
          editButton.title = chunk.status === 'mismatch' ? 
            this.plugin.modal('EDIT_CHUNK_MISMATCH') : 
            this.plugin.modal('EDIT_CHUNK_NORMAL');
        }
      }
    }

  async copyChunk(chunk) {
    try {
      const content = chunk.strings.join('\n');
      await navigator.clipboard.writeText(content);
      new Notice(this.plugin.t('CHUNK_COPY_SUCCESS', { chunkId: chunk.id, count: chunk.strings.length }));
    } catch (error) {
      new Notice(this.plugin.t('ERROR_COPY_FAILED'));
    }
  }

  async pasteChunk(chunk) {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        new Notice(this.plugin.t('ERROR_CLIPBOARD_EMPTY'));
        return;
      }

      const translatedLines = clipboardText.trim().split('\n').map(line => 
        line.replace(/<[^>]*>/g, '').trim()
      );

      const expectedLines = chunk.strings.length;
      const actualLines = translatedLines.length;

      // 柔軟な貼付処理
      chunk.translatedStrings = [];
      
      // 可能な範囲で貼付
      for (let i = 0; i < expectedLines; i++) {
        if (i < actualLines && translatedLines[i]) {
          chunk.translatedStrings.push(translatedLines[i]);
        } else {
          chunk.translatedStrings.push(''); // 不足分は空白
        }
      }

      // 状態の決定
      if (actualLines === expectedLines) {
        chunk.status = 'completed';
        new Notice(this.plugin.t('CHUNK_PASTE_SUCCESS', { chunkId: chunk.id, count: actualLines }));
      } else {
        chunk.status = 'mismatch';
        const difference = actualLines - expectedLines;
        const diffText = difference > 0 ? 
          this.plugin.t('LINES_EXCESS', { difference: difference }) : 
          this.plugin.t('LINES_SHORTAGE', { difference: Math.abs(difference) });
        new Notice(this.plugin.t('CHUNK_PASTE_MISMATCH', { chunkId: chunk.id, applied: Math.min(actualLines, expectedLines), diff: diffText }));
      }
      
      this.updateChunkElement(chunk);
      this.updateHeaderStats();
      this.updateStatusMessage();
      this.updatePreviewButtonState();
      
    } catch (error) {
      new Notice(this.plugin.t('ERROR_PASTE_FAILED'));
    }
  }

  editChunk(chunk) {
    if (chunk.status === 'pending') return;
    
    const modal = new ChunkEditModal(this.app, this.plugin, chunk, () => {
      this.onOpen(); // 編集完了後にモーダルを更新
    });
    modal.open();
  }

  openTranslationPreview() {
    const allCompleted = this.chunkData.chunks.every(c => c.status === 'completed');
    const hasMismatch = this.chunkData.chunks.some(c => c.status === 'mismatch');
    
    if (hasMismatch) {
      new Notice(this.plugin.t('ERROR_CHUNK_MISMATCH'));
      return;
    }
    
    if (!allCompleted) {
      new Notice(this.plugin.t('ERROR_CHUNK_INCOMPLETE'));
      return;
    }

    // 全チャンクを統合
    const originalStrings = [];
    const translatedStrings = [];
    
    for (const chunk of this.chunkData.chunks) {
      originalStrings.push(...chunk.strings);
      translatedStrings.push(...chunk.translatedStrings);
    }

    this.close();
    
    // 翻訳プレビューモーダルを開く
    const pluginManifest = {
      id: this.chunkData.pluginId,
      name: this.chunkData.pluginName
    };
    
    this.plugin.showTranslationPreviewPopup(pluginManifest, originalStrings, translatedStrings);
  }

  onClose() {
    // クリーンアップ
  }

  setupModalResize() {
    const modal = this.modalEl;
    
    // 保存されたサイズを復元
    const savedSize = this.plugin.settings.chunkManagementSize;
    modal.style.width = savedSize.width + 'px';
    modal.style.height = savedSize.height + 'px';
    modal.style.maxWidth = 'none';
    modal.style.maxHeight = 'none';
    modal.style.minWidth = '600px';
    modal.style.minHeight = '400px';
    modal.style.resize = 'none';
    
    // リサイズハンドルを作成
    const resizeHandle = modal.createDiv();
    resizeHandle.className = 'chunk-modal-resize-handle';
    resizeHandle.textContent = '⋰';
    resizeHandle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nw-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--background-primary);
      border-left: 1px solid var(--background-modifier-border);
      border-top: 1px solid var(--background-modifier-border);
      user-select: none;
      transition: color 0.2s ease;
    `;
    
    // リサイズ機能の実装
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(window.getComputedStyle(modal, null).getPropertyValue('width'));
      startHeight = parseInt(window.getComputedStyle(modal, null).getPropertyValue('height'));
      
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
      
      const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const width = Math.max(600, startWidth + (e.clientX - startX));
        const height = Math.max(400, startHeight + (e.clientY - startY));
        
        modal.style.width = width + 'px';
        modal.style.height = height + 'px';
      };
      
      const handleMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          
          // サイズを保存
          const finalWidth = parseInt(modal.style.width);
          const finalHeight = parseInt(modal.style.height);
          this.plugin.settings.chunkManagementSize = {
            width: finalWidth,
            height: finalHeight
          };
          this.plugin.saveSettings();
          
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }
}

// チャンク編集モーダル（翻訳プレビュー機能付き）
class ChunkEditModal extends Modal {
  constructor(app, plugin, chunk, onComplete) {
    super(app);
    this.plugin = plugin;
    this.chunk = chunk;
    this.onComplete = onComplete;
    this.translationInputs = [];
    this.insertButtons = [];
    this.insertUpButtons = [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // モーダルタイトル
    contentEl.createEl('h2', { text: this.plugin.modal('CHUNK_EDIT_TITLE', { chunkId: this.chunk.id }) });

    // サイズ拡縮機能を追加
    this.setupModalResize();

    // ステータス表示
    const statusDiv = contentEl.createDiv();
    statusDiv.style.cssText = `
      padding: 8px 12px;
      background: var(--background-secondary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
    `;

    const updateStatus = () => {
      const totalLines = this.chunk.strings.length;
      const completedLines = this.translationInputs.filter(input => input.value.trim() !== '').length;
      const isAllCompleted = completedLines === totalLines;
      
      statusDiv.empty();
      const statusKey = isAllCompleted ? 'TRANSLATION_STATUS' : 'TRANSLATION_STATUS_INCOMPLETE';
      const statusSpan = statusDiv.createEl('span', {
        text: this.plugin.modal(statusKey, { completed: completedLines, total: totalLines })
      });
      
      saveButton.disabled = !isAllCompleted;
      saveButton.style.opacity = isAllCompleted ? '1' : '0.5';
      
      // 上矢印ボタンの状態を更新
      this.insertUpButtons.forEach((button, index) => {
        const isCurrentRowEmpty = this.translationInputs[index].value.trim() === '';
        const hasUpwardEmpty = this.findPreviousEmptyLine(index) !== -1;
        button.disabled = isAllCompleted || isCurrentRowEmpty || !hasUpwardEmpty;
        button.style.opacity = button.disabled ? '0.5' : '1';
        button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
        
        if (isAllCompleted) {
          button.title = this.plugin.modal('BUTTON_MOVE_UP_DISABLED_ALL_COMPLETED');
        } else if (isCurrentRowEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_UP_DISABLED_EMPTY_LINE');
        } else if (!hasUpwardEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_UP_DISABLED_NO_TARGET');
        } else {
          button.title = this.plugin.modal('MOVE_UP_TOOLTIP');
        }
      });

      // 下矢印ボタンの状態を更新
      this.insertButtons.forEach((button, index) => {
        const isCurrentRowEmpty = this.translationInputs[index].value.trim() === '';
        const hasDownwardEmpty = this.findNextEmptyLine(index) !== -1;
        const isLastRow = index === this.translationInputs.length - 1;
        button.disabled = isAllCompleted || isCurrentRowEmpty || !hasDownwardEmpty || isLastRow;
        button.style.opacity = button.disabled ? '0.5' : '1';
        button.style.cursor = button.disabled ? 'not-allowed' : 'pointer';
        
        if (isAllCompleted) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_ALL_COMPLETED');
        } else if (isCurrentRowEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_EMPTY_LINE');
        } else if (isLastRow) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_LAST_LINE');
        } else if (!hasDownwardEmpty) {
          button.title = this.plugin.modal('BUTTON_MOVE_DOWN_DISABLED_NO_TARGET');
        } else {
          button.title = this.plugin.modal('MOVE_DOWN_TOOLTIP');
        }
      });
    };
    this.updateStatus = updateStatus;

    // スクロール可能なコンテンツエリア
    const scrollContainer = contentEl.createDiv();
    scrollContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 16px;
      min-height: 200px;
    `;

    // contentElにflexレイアウトを追加
    contentEl.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px;
    `;

    // 各翻訳行を作成
    this.chunk.strings.forEach((originalText, index) => {
      const row = scrollContainer.createDiv();
      row.style.cssText = `
        display: grid;
        grid-template-columns: 40px 30px 1fr 1fr 30px 30px;
        gap: 8px;
        margin-bottom: 12px;
        align-items: start;
      `;

      // 行番号
      const lineNumber = row.createDiv();
      lineNumber.textContent = (index + 1).toString();
      lineNumber.style.cssText = `
        text-align: center;
        font-weight: 500;
        color: var(--text-muted);
        padding-top: 8px;
      `;
      
      // オリジナルテキストコピーボタン
      const copyButton = row.createEl('button');
      copyButton.textContent = '📋';
      copyButton.title = this.plugin.modal('COPY_ORIGINAL_TOOLTIP');
      copyButton.style.cssText = `
        padding: 4px;
        background: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        height: 24px;
        margin-top: 6px;
        transition: background-color 0.2s ease;
      `;
      copyButton.addEventListener('mouseenter', () => {
        copyButton.style.background = 'var(--interactive-hover)';
      });
      copyButton.addEventListener('mouseleave', () => {
        copyButton.style.background = 'var(--interactive-normal)';
      });
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(originalText);
          new Notice(this.plugin.t('COPY_SUCCESS', { text: originalText.substring(0, 30) }));
          const originalButtonText = copyButton.textContent;
          copyButton.textContent = '✅';
          setTimeout(() => {
            copyButton.textContent = originalButtonText;
          }, 1000);
        } catch (error) {
          new Notice(this.plugin.t('ERROR_COPY_FAILED'));
        }
      });

      // 元文字列
      const originalDiv = row.createDiv();
      originalDiv.style.cssText = `
        padding: 8px 12px;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        font-size: 13px;
        line-height: 1.4;
        word-wrap: break-word;
        max-height: 100px;
        overflow-y: auto;
      `;
      originalDiv.textContent = originalText;

      // 翻訳入力フィールド
      const translationInput = row.createEl('textarea');
      translationInput.value = this.chunk.translatedStrings[index] || '';
      translationInput.style.cssText = `
        padding: 8px 12px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        font-size: 13px;
        line-height: 1.4;
        min-height: 36px;
        resize: vertical;
      `;

      const debouncedUpdateStatus = this.plugin.adaptiveDebounce(updateStatus, 200);
      translationInput.addEventListener('input', debouncedUpdateStatus);
      this.translationInputs.push(translationInput);

      // 上移動ボタン
      const insertUpButton = row.createEl('button');
      insertUpButton.textContent = '↑';
      insertUpButton.title = this.plugin.modal('MOVE_UP_TOOLTIP');
      insertUpButton.style.cssText = `
        padding: 4px;
        background: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        height: 24px;
        margin-top: 6px;
      `;
      insertUpButton.addEventListener('click', () => this.insertEmptyLineUp(index));
      this.insertUpButtons.push(insertUpButton);

      // 下移動ボタン（既存のinsertButtonをinsertDownButtonに名前変更）
      const insertDownButton = row.createEl('button');
      insertDownButton.textContent = '↓';
      insertDownButton.title = this.plugin.modal('MOVE_DOWN_TOOLTIP');
      insertDownButton.style.cssText = `
        padding: 4px;
        background: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        height: 24px;
        margin-top: 6px;
      `;
      insertDownButton.addEventListener('click', () => this.insertEmptyLine(index));
      this.insertButtons.push(insertDownButton);
    });

    // ボタンエリア
    const buttonArea = contentEl.createDiv();
    buttonArea.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    // 右側ボタングループ
    const rightButtons = buttonArea.createDiv();
    rightButtons.style.cssText = `display: flex; gap: 8px;`;

    // キャンセルボタン
    const cancelButton = rightButtons.createEl('button', { text: this.plugin.modal('CANCEL') });
    cancelButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelButton.addEventListener('click', () => this.close());

    // 保存ボタン
    const saveButton = rightButtons.createEl('button', { text: this.plugin.modal('SAVE') });
    saveButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-accent);
      border: 1px solid var(--interactive-accent);
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-on-accent);
    `;
    
    saveButton.addEventListener('click', async () => {
      const finalTranslatedStrings = this.translationInputs.map(input => input.value.trim());
      const emptyCount = finalTranslatedStrings.filter(str => str === '').length;
      
      if (emptyCount > 0) {
        new Notice(this.plugin.t('ERROR_INCOMPLETE_TRANSLATION', { count: emptyCount }));
        return;
      }
      
      this.chunk.translatedStrings = finalTranslatedStrings;
      this.chunk.status = 'completed';
      
      new Notice(this.plugin.t('CHUNK_EDIT_SUCCESS', { chunkId: this.chunk.id }));
      this.close();
      
      if (this.onComplete) {
        this.onComplete();
      }
    });

    // 初期ステータス更新
    updateStatus();

    // 最初の空のテキストエリアにフォーカス
    const firstEmptyInput = this.translationInputs.find(input => input.value.trim() === '');
    if (firstEmptyInput) {
      setTimeout(() => firstEmptyInput.focus(), 100);
    }
  }

  // 空行挿入機能
  insertEmptyLine(insertIndex) {
    // すべて入力済みの場合は処理を中断
    const isAllCompleted = this.translationInputs.every(input => input.value.trim() !== '');
    if (isAllCompleted) {
      new Notice(this.plugin.t('WARNING_ALL_COMPLETED'));
      return;
    }
    // 最下行チェック
    if (insertIndex === this.translationInputs.length - 1) {
      new Notice(this.plugin.t('WARNING_LAST_LINE'));
      return;
    }
    // 移動先を先に確認
    const targetEmptyIndex = this.findNextEmptyLine(insertIndex);
    if (targetEmptyIndex === -1) {
      new Notice(this.plugin.t('WARNING_NO_TARGET'));
      return;
    }

    // 移動先が確認できてから内容を移動
    const currentText = this.translationInputs[insertIndex].value;
    
    // 移動元より後、移動先より前の要素を1つ後ろにシフト
    for (let i = targetEmptyIndex; i > insertIndex + 1; i--) {
      this.translationInputs[i].value = this.translationInputs[i - 1].value;
    }

    // 移動元を空白にする
    this.translationInputs[insertIndex].value = '';

    // 移動元の直後に元の内容を配置
    this.translationInputs[insertIndex + 1].value = currentText;

    // 空白になった行にフォーカス
    setTimeout(() => {
      this.translationInputs[insertIndex].focus();
    }, 100);

    new Notice(this.plugin.t('BUTTON_SHIFT_SUCCESS', { line: insertIndex + 1 }));
    if (this.updateStatus) {
      this.updateStatus();
    }
  }
  // 上移動機能
  insertEmptyLineUp(insertIndex) {
    // すべて入力済みの場合は処理を中断
    const isAllCompleted = this.translationInputs.every(input => input.value.trim() !== '');
    if (isAllCompleted) {
      new Notice(this.plugin.t('WARNING_ALL_COMPLETED'));
      return;
    }

    // 上の空行を検索
    const targetEmptyIndex = this.findPreviousEmptyLine(insertIndex);
    if (targetEmptyIndex === -1) {
      new Notice(this.plugin.t('WARNING_NO_TARGET'));
      return;
    }

    // 内容を移動
    const currentText = this.translationInputs[insertIndex].value;

    // 移動先より後、移動元より前の要素を1つずつ前にシフト
    for (let i = targetEmptyIndex; i < insertIndex; i++) {
      this.translationInputs[i].value = this.translationInputs[i + 1].value;
    }

    // 移動元を空白にする
    this.translationInputs[insertIndex].value = '';

    // 移動元の直前に元の内容を配置
    this.translationInputs[insertIndex - 1].value = currentText;

    // 移動先にフォーカス
    setTimeout(() => {
      this.translationInputs[insertIndex - 1].focus();
    }, 100);

    new Notice(this.plugin.t('BUTTON_MOVE_SUCCESS', { from: insertIndex + 1, to: insertIndex }));
    if (this.updateStatus) {
      this.updateStatus();
    }
  }

  // 上の空行を検索
  findPreviousEmptyLine(startIndex) {
    for (let i = startIndex - 1; i >= 0; i--) {
      if (this.translationInputs[i].value.trim() === '') {
        return i;
      }
    }
    return -1;
  }

  // 下の空行を検索
  findNextEmptyLine(startIndex) {
    for (let i = startIndex + 1; i < this.translationInputs.length; i++) {
      if (this.translationInputs[i].value.trim() === '') {
        return i;
      }
    }
    return -1;
  }
  setupModalResize() {
    const modal = this.modalEl;
    
    // 保存されたサイズを復元
    const savedSize = this.plugin.settings.chunkEditSize;
    modal.style.width = savedSize.width + 'px';
    modal.style.height = savedSize.height + 'px';
    modal.style.maxWidth = 'none';
    modal.style.maxHeight = 'none';
    modal.style.minWidth = '600px';
    modal.style.minHeight = '400px';
    modal.style.resize = 'none';
    
    // リサイズハンドルを作成
    const resizeHandle = modal.createDiv();
    resizeHandle.className = 'chunk-edit-modal-resize-handle';
    resizeHandle.textContent = '⋰';
    resizeHandle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nw-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--background-primary);
      border-left: 1px solid var(--background-modifier-border);
      border-top: 1px solid var(--background-modifier-border);
      user-select: none;
      transition: color 0.2s ease;
    `;
    
    // リサイズ機能の実装
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(window.getComputedStyle(modal, null).getPropertyValue('width'));
      startHeight = parseInt(window.getComputedStyle(modal, null).getPropertyValue('height'));
      
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
      
      const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const width = Math.max(600, startWidth + (e.clientX - startX));
        const height = Math.max(400, startHeight + (e.clientY - startY));
        
        modal.style.width = width + 'px';
        modal.style.height = height + 'px';
      };
      
      const handleMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          
          // サイズを保存
          const finalWidth = parseInt(modal.style.width);
          const finalHeight = parseInt(modal.style.height);
          this.plugin.settings.chunkEditSize = {
            width: finalWidth,
            height: finalHeight
          };
          this.plugin.saveSettings();
          
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }

  onClose() {
    this.translationInputs = [];
    this.insertButtons = [];
    this.insertUpButtons = [];
  }
}

class CommunityPluginLocalizerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    // 抽出した文字列を保存するマップ（プラグインID別）
    this.extractedStringsMap = new Map();
    this.extractedStringsMap = plugin.extractedStringsMap || new Map();
    // スクロール復元用の遅延時間（ms）
    this.SCROLL_RESTORE_DELAY = 100;
  }

  async display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: this.plugin.st('TITLE') });
    containerEl.createEl("h3", { text: this.plugin.st('LANGUAGE_SECTION') });

    new Setting(containerEl)
      .setName(this.plugin.st('DISPLAY_LANGUAGE_TITLE'))
      .setDesc(this.plugin.st('DISPLAY_LANGUAGE_DESC'))
      .addDropdown(dropdown => dropdown
        .addOption('en', 'English')
        .addOption('ja', '日本語')
        .addOption('ko', '한국어')
        .setValue(this.plugin.settings.noticeLanguage)
        .onChange(async (value) => {
        // スクロール位置を保存
        const scrollPosition = containerEl.scrollTop;
        
        // 設定を更新
        this.plugin.settings.noticeLanguage = value;
        this.plugin.currentLang = value;
        await this.plugin.saveSettings();

        // 全プラグインの翻訳を新言語で再適用
        await this.plugin.applyAllTranslationsForCurrentLanguage();
        // フローティングボタンの言語更新
        const settingsModal = document.querySelector('.modal.mod-settings');
        if (settingsModal && this.plugin.settings.showFloatingButton) {
          this.plugin.removeFloatingButton();
          setTimeout(() => {
            this.plugin.addFloatingButton(settingsModal);
            // 翻訳状態に応じて自動適用
            this.plugin.applyTranslationByState();
          }, 50);
        }
        
        // 設定画面を再描画
        this.display();
        
        // スクロール位置を復元
        setTimeout(() => {
          containerEl.scrollTop = scrollPosition;
        }, this.SCROLL_RESTORE_DELAY);
        
        // 変更確認のnotice
        const languageNames = { en: 'English', ja: '日本語', ko: '한국어' };
        new Notice(this.plugin.t('NOTICE_LANGUAGE_CHANGED', { language: languageNames[value] }));
      })
    );

    // 区切り線を追加
    containerEl.createEl("h3", { text: this.plugin.st('FLOATING_BUTTON_SECTION') });

    // フローティングボタン表示設定を追加
    new Setting(containerEl)
      .setName(this.plugin.st('FLOATING_BUTTON_TITLE'))
      .setDesc(this.plugin.st('FLOATING_BUTTON_DESC'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showFloatingButton)
        .onChange(async (value) => {
          this.plugin.settings.showFloatingButton = value;
          await this.plugin.saveSettings();
          
          if (value) {
            // ON時：位置をコンテンツエリア左上にリセット
            const settingsModal = document.querySelector('.modal.mod-settings');
            if (settingsModal) {
              const container = settingsModal.querySelector('.vertical-tab-content-container') || settingsModal;
              const containerRect = container.getBoundingClientRect();
              const modalRect = settingsModal.getBoundingClientRect();
              const containerOffsetX = containerRect.left - modalRect.left;
              const containerOffsetY = containerRect.top - modalRect.top;
              
              const resetPosition = {
                x: containerOffsetX + 10,
                y: containerOffsetY + 10
              };
              
              this.plugin.settings.buttonPosition = resetPosition;
              this.plugin.buttonCurrentPos = resetPosition;
              await this.plugin.saveSettings();
              
              this.plugin.addFloatingButton(settingsModal);
            }
          } else {
            // OFF時：削除
            this.plugin.removeFloatingButton();
          }
        }));

    // 説明文の2行目を追加
    const floatingButtonDesc = containerEl.querySelector('.setting-item:last-child .setting-item-description');
    floatingButtonDesc.createDiv({
      text: this.plugin.st('FLOATING_BUTTON_DESC2'),
      cls: "setting-item-description"
    });
    // テキスト生成関数を定義
    const getLayoutStatusText = (isHorizontal) => {
      const direction = isHorizontal ? 
        this.plugin.st('HORIZONTAL') : 
        this.plugin.st('VERTICAL');
      return this.plugin.st('MENU_LAYOUT_STATUS', { direction });
    };
      
    // メニュー配置設定を変更（ドロップダウン形式）
    const menuLayoutSetting = new Setting(containerEl)
      .setName(this.plugin.st('MENU_LAYOUT_TITLE'))
      .setDesc(this.plugin.st('MENU_LAYOUT_DESC'))
      .addDropdown(dropdown => dropdown
        .addOption('true', this.plugin.st('HORIZONTAL'))
        .addOption('false', this.plugin.st('VERTICAL'))
        .setValue(this.plugin.settings.menuLayoutHorizontal.toString())
        .onChange(async (value) => {
          this.plugin.settings.menuLayoutHorizontal = value === 'true';
          await this.plugin.saveSettings();

      // 説明テキストを更新
      statusText.textContent = getLayoutStatusText(value === 'true');
          
          // 既存のフローティングボタンを再構築
          const settingsModal = document.querySelector('.modal.mod-settings');
          if (settingsModal) {
            const existingButton = settingsModal.querySelector('.cp-localizer-floating-button');
            if (existingButton) {
              existingButton.remove();
              // 少し遅延して新しいボタンを追加
              setTimeout(() => {
                this.plugin.addFloatingButton(settingsModal);
                // 追加: 翻訳状態に応じて自動適用
                this.plugin.applyTranslationByState();
              }, 100);
            }
          }
          
          const directionText = value === 'true' ? 
            this.plugin.st('HORIZONTAL') : 
            this.plugin.st('VERTICAL');
          new Notice(this.plugin.t('MENU_LAYOUT_CHANGED', { direction: directionText }));
        }));

    // メニュー設定の説明を追加（要素を変数に保存）
    const statusText = menuLayoutSetting.descEl.createDiv({
      text: getLayoutStatusText(this.plugin.settings.menuLayoutHorizontal),
      cls: "setting-item-description"
    });
    statusText.style.color = "var(--text-muted)";

    containerEl.createEl("h3", { text: this.plugin.st('STORAGE_SECTION') });

    const storageInfo = new Setting(containerEl)
      .setName(this.plugin.st('STORAGE_LOCATION_TITLE2'))
      .setDesc(this.plugin.st('STORAGE_LOCATION_DESC'));

    // 保存場所を表示
    const pathDiv = storageInfo.descEl.createDiv({
      text: `📁 CPLocalizer-translations/`,
      cls: "setting-item-description"
    });
    pathDiv.style.cssText = `
      font-family: var(--font-monospace);
      background: var(--background-secondary);
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 12px;
    `;

    // 削除時の注意を追加
    storageInfo.descEl.createDiv({
      text: this.plugin.st('STORAGE_LOCATION_NOTE'),
      cls: "setting-item-description"
    });

    // デスクトップ版でのみ「開く」ボタンを追加
    if (!this.app.isMobile) {
      storageInfo.addButton(button => button
        .setButtonText(this.plugin.st('OPEN_FOLDER'))
        .setTooltip(this.plugin.st('OPEN_FOLDER_TOOLTIP'))
        .onClick(async () => {
          try {
            const translationsDir = 'CPLocalizer-translations';
            
            // フォルダが存在しない場合は作成
            if (!await this.app.vault.adapter.exists(translationsDir)) {
              await this.app.vault.adapter.mkdir(translationsDir);
            }
            
            // Electronでフォルダを開く
            const { shell } = window.require('electron');
            const path = window.require('path');
            const vaultPath = this.app.vault.adapter.basePath || this.app.vault.adapter.path;
            const fullPath = path.join(vaultPath, translationsDir);
            
            await shell.openPath(fullPath);
            new Notice(this.plugin.t('FOLDER_OPENED'));
            
          } catch (error) {
            console.error('フォルダオープンエラー:', error);
            new Notice(this.plugin.t('ERROR_FOLDER_OPEN_FAILED'));
          }
        }));
    }

    containerEl.createEl("h3", { text: this.plugin.st('PLUGIN_LIST_SECTION') });

    const pluginManifests = this.app.plugins.manifests;
    const enabledPlugins = this.app.plugins.enabledPlugins;

    const activePlugins = Object.values(pluginManifests)
      .filter(manifest => enabledPlugins.has(manifest.id));

    activePlugins.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // === 並列処理で全プラグインのステータスを一括取得 ===
    // 全プラグインのデータを事前取得（順序保証）
    const pluginDataList = await Promise.all(
      activePlugins.map(async (manifest, index) => {
        const status = await this.getTranslationStatus(manifest.id);
        const versionStatus = await this.plugin.getVersionStatus(manifest.id);
        return { manifest, status, versionStatus };
      })
    );

    // 順次DOM要素を作成
    pluginDataList.forEach(({ manifest, status, versionStatus }) => {
      const setting = new Setting(containerEl)
        .setName(manifest.name)
        .setDesc(`${status} / ID: ${manifest.id}`);
      
      // バージョン不一致の場合は更新確認ボタンを追加
      if (versionStatus.status === 'version-mismatch') {
        setting.addButton(button => button
          .setButtonText(this.plugin.st('UPDATE_CHECK_BUTTON'))
          .setTooltip(this.plugin.st('UPDATE_CHECK_TOOLTIP'))
          .onClick(async () => {
            // スクロール位置を保存
            const scrollPosition = containerEl.scrollTop;
            
            const success = await this.confirmUpdate(manifest.id, manifest.name);
            if (success) {
              // 設定画面を再表示
              this.display();
              // スクロール位置を復元
              setTimeout(() => {
                containerEl.scrollTop = scrollPosition;
              }, this.SCROLL_RESTORE_DELAY);
            }
          }));
        
        // 説明文を追加
        setting.descEl.createDiv({
          text: this.plugin.st('UPDATE_NOTICE'),
          cls: "setting-item-description"
        });
      }
      
      // 削除ボタンを追加（翻訳済みの場合のみ）
      if (versionStatus.status === 'up-to-date' || versionStatus.status === 'version-mismatch') {
        setting.addButton(button => button
          .setButtonText(this.plugin.st('DELETE_BUTTON'))
          .setTooltip(this.plugin.st('DELETE_TOOLTIP'))
          .onClick(async () => {
            const modal = new TranslationDeleteConfirmModal(this.app, this.plugin, manifest);
            modal.open();
          }));
      }
    });
    // 文字列抽出テスト機能
    containerEl.createEl("h3", { text: this.plugin.st('EXTRACTION_TEST_SECTION') });

    const testStringSetting = new Setting(containerEl)
      .setName(this.plugin.st('STRING_EXTRACTION_TEST_NAME'));

    // 説明文を3行で作成
    testStringSetting.descEl.createEl('div', { text: this.plugin.st('STRING_EXTRACTION_TEST_DESC1') });
    testStringSetting.descEl.createEl('div', { 
      text: this.plugin.st('STRING_EXTRACTION_TEST_DESC2'),
      attr: { style: 'margin-top: 8px; color: var(--text-muted); font-size: 13px;' }
    });
    testStringSetting.descEl.createEl('div', { 
      text: this.plugin.st('STRING_EXTRACTION_TEST_DESC3'),
      attr: { style: 'color: var(--text-muted); font-size: 13px;' }
    });
      
    // テスト用コンテナを作成
    const testContainer = containerEl.createDiv();
    testContainer.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 6px;
      padding: 16px;
      margin: 12px 0;
      background: var(--background-secondary);
    `;

    // テキストエリア
    const testTextArea = testContainer.createEl('textarea');
    testTextArea.placeholder = this.plugin.st('TEST_PLACEHOLDER');
    testTextArea.style.cssText = `
      width: 100%;
      min-height: 80px;
      padding: 8px 12px;
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      background: var(--background-primary);
      font-family: var(--font-text);
      font-size: 14px;
      resize: vertical;
      margin-bottom: 12px;
    `;

    // ボタンエリア
    const buttonArea = testContainer.createDiv();
    buttonArea.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;
    `;

    // 判定実行ボタン
    const testButton = buttonArea.createEl('button');
    testButton.textContent = this.plugin.st('TEST_BUTTON');
    testButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-accent);
      border: 1px solid var(--interactive-accent);
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-on-accent);
      font-weight: 500;
    `;

    // クリアボタン
    const clearButton = buttonArea.createEl('button');
    clearButton.textContent = this.plugin.st('CLEAR_BUTTON');
    clearButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      cursor: pointer;
    `;

    // 結果表示エリア
    const resultArea = testContainer.createDiv();
    resultArea.style.cssText = `
      min-height: 40px;
      display: none;
    `;

    // イベントハンドラー
    testButton.addEventListener('click', () => {
      const inputText = testTextArea.value;
      if (!inputText.trim()) {
        resultArea.style.display = 'block';
        resultArea.empty();
        resultArea.createEl('div', {
          text: this.plugin.st('TEST_ERROR_EMPTY'),
          attr: { style: 'color: var(--text-error); padding: 8px;' }
        });
        return;
      }

      const result = this.plugin.testStringExtraction(inputText);
      this.displayTestResult(resultArea, result);
    });

    clearButton.addEventListener('click', () => {
      testTextArea.value = '';
      resultArea.style.display = 'none';
      resultArea.empty();
    });
  }
  
  // テスト結果表示メソッド
  displayTestResult(resultArea, result) {
    resultArea.style.display = 'block';
    resultArea.empty();
    
    if (!result.success) {
      const errorDiv = resultArea.createDiv();
      errorDiv.style.cssText = `
        padding: 12px;
        background: var(--background-primary);
        border: 2px solid var(--text-error);
        border-radius: 4px;
        color: var(--text-error);
      `;
      errorDiv.createEl('div', { text: this.plugin.st('TEST_RESULT_ERROR') });
      errorDiv.createEl('div', { text: result.error });
      return;
    }

    // メイン結果
    const mainResult = resultArea.createDiv();
    mainResult.style.cssText = `
      padding: 12px;
      background: var(--background-primary);
      border: 2px solid ${result.result ? 'var(--text-success)' : 'var(--text-error)'};
      border-radius: 4px;
      margin-bottom: 12px;
    `;

    const resultText = result.result ? 
    this.plugin.st('TEST_RESULT_SUCCESS') : 
    this.plugin.st('TEST_RESULT_FAILED');
    const resultColor = result.result ? 'var(--text-success)' : 'var(--text-error)';

    mainResult.createEl('div', {
      text: `🔍 ${resultText}`,
      attr: { style: `font-weight: bold; font-size: 16px; color: ${resultColor}; margin-bottom: 8px;` }
    });

    // 入力情報
    const inputDiv = mainResult.createDiv();
    inputDiv.createEl('div', { text: `${this.plugin.st('TEST_INPUT_LABEL')} "${result.inputText}"` });
    
    if (result.normalizedText && result.normalizedText !== result.inputText) {
      inputDiv.createEl('div', { text: `${this.plugin.st('TEST_NORMALIZED_LABEL')} "${result.normalizedText}"` });
    } else {
      inputDiv.createEl('div', { text: `${this.plugin.st('TEST_NORMALIZED_LABEL')} "${result.normalizedText || result.inputText}" ${this.plugin.st('TEST_NORMALIZED_NO_CHANGE')}` });
    }

    // 除外理由（対象外の場合）
    if (!result.result && result.reason && result.detail) {
      const reasonDiv = mainResult.createDiv();
      reasonDiv.style.cssText = `margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--background-modifier-border);`;
      reasonDiv.createEl('div', {
        text: `${this.plugin.st('TEST_EXCLUDE_REASON')} ${result.reason}`,
        attr: { style: 'color: var(--text-error); font-weight: 500;' }
      });
      reasonDiv.createEl('div', {
        text: `${this.plugin.st('TEST_DETAIL_LABEL')} ${result.detail}`,
        attr: { style: 'color: var(--text-muted); margin-top: 4px;' }
      });
    }

    // 判定ステップ
    if (result.steps && result.steps.length > 0) {
      const stepsDiv = resultArea.createDiv();
      stepsDiv.style.cssText = `
        padding: 12px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
      `;

      stepsDiv.createEl('div', {
        text: this.plugin.st('TEST_STEPS_TITLE'),
        attr: { style: 'font-weight: bold; margin-bottom: 8px;' }
      });

      result.steps.forEach((step, index) => {
        const stepDiv = stepsDiv.createDiv();
        stepDiv.style.cssText = `
          padding: 4px 8px;
          margin: 2px 0;
          border-radius: 3px;
          background: ${step.status === '❌' ? 'rgba(var(--color-red-rgb), 0.1)' : 
                      step.status === '✅' ? 'rgba(var(--color-green-rgb), 0.1)' : 
                      'var(--background-secondary)'};
        `;
        
        stepDiv.textContent = `${step.status} ${step.name}`;
        if (step.reason) {
          const reasonSpan = stepDiv.createEl('span', {
            text: ` - ${step.reason}`,
            attr: { style: 'color: var(--text-muted); font-size: 13px;' }
          });
        }
      });
    }
  }

  // 翻訳ステータスを取得
  async getTranslationStatus(pluginId) {
    try {
      const versionStatus = await this.plugin.getVersionStatus(pluginId);
      
      switch (versionStatus.status) {
        case 'up-to-date':
          return this.plugin.st('STATUS_TRANSLATED', { version: versionStatus.currentVersion });
        case 'version-mismatch':
          return this.plugin.st('STATUS_UPDATE_REQUIRED', { 
            savedVersion: versionStatus.savedVersion, 
            currentVersion: versionStatus.currentVersion 
          });
        case 'no-translation':
          return this.plugin.st('STATUS_UNTRANSLATED');
        case 'error':
        default:
          return this.plugin.st('STATUS_UNKNOWN');
      }
    } catch (error) {
      return this.plugin.st('STATUS_UNKNOWN');
    }
  }

  // 更新確認処理
  async confirmUpdate(pluginId, pluginName) {
    try {
      const sanitizedPluginId = this.plugin.sanitizePluginId(pluginId);
      const jsonPath = this.plugin.getTranslationFilePath(pluginId);
      
      if (!await this.app.vault.adapter.exists(jsonPath)) {
        new Notice(this.plugin.t('ERROR_NO_TRANSLATION_FILE'));
        return false;
      }

      // 既存の翻訳データを読み込み
      const jsonContent = await this.app.vault.adapter.read(jsonPath);
      const translationData = JSON.parse(jsonContent);
      
      // メタデータを現在のバージョンに更新
      const currentVersion = this.app.plugins.manifests[pluginId]?.version || '不明';
      translationData._metadata = {
        pluginVersion: currentVersion
      };
      
      // ファイルに保存
      const updatedContent = JSON.stringify(translationData, null, 2);
      await this.app.vault.adapter.write(jsonPath, updatedContent);
      
      new Notice(this.plugin.t('VERSION_UPDATE_SUCCESS', { pluginName, version: currentVersion }));
      return true;
    } catch (error) {
      console.error("更新確認エラー:", error);
      new Notice(this.plugin.t('ERROR_VERSION_UPDATE_FAILED', { error: error.message }));
      return false;
    }
  }
}

// 翻訳削除確認モーダル
class TranslationDeleteConfirmModal extends Modal {
  constructor(app, plugin, pluginManifest) {
    super(app);
    this.plugin = plugin;
    this.pluginManifest = pluginManifest;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // モーダルタイトル
    contentEl.createEl('h2', { text: this.plugin.modal('DELETE_CONFIRM_TITLE', { pluginName: this.pluginManifest.name }) });


    // 警告メッセージ
    const warningDiv = contentEl.createDiv();
    warningDiv.style.cssText = `
      padding: 16px;
      background: var(--background-secondary);
      border: 2px solid var(--text-error);
      border-radius: 6px;
      margin-bottom: 20px;
    `;
    
    const warningTitle = warningDiv.createEl('div', {
      text: this.plugin.modal('DELETE_WARNING_TITLE'),
      attr: { style: 'font-weight: bold; color: var(--text-error); margin-bottom: 8px; font-size: 16px;' }
    });
    
    const warningText = warningDiv.createEl('div');
    warningText.appendText(this.plugin.modal('DELETE_WARNING_TEXT'));
    warningText.createEl('div', { text: ` ${this.pluginManifest.id}.json` });

    // 結果説明
    const resultDiv = contentEl.createDiv();
    resultDiv.style.cssText = `
      padding: 12px;
      margin-bottom: 20px;
      color: var(--text-muted);
    `;
    
    resultDiv.createEl('div', { text: this.plugin.modal('DELETE_RESULT_TITLE') });
    resultDiv.createEl('div', { text: this.plugin.modal('DELETE_RESULT_TRASH') });
    resultDiv.createEl('div', { text: this.plugin.modal('DELETE_RESULT_RECOVERABLE') });

    // ボタンエリア
    const buttonArea = contentEl.createDiv();
    buttonArea.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    // キャンセルボタン
    const cancelButton = buttonArea.createEl('button', { text: this.plugin.modal('CANCEL') });
    cancelButton.style.cssText = `
      padding: 8px 16px;
      background: var(--interactive-normal);
      border: 1px solid var(--background-modifier-border);
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelButton.addEventListener('click', () => this.close());

    // 削除実行ボタン
    const deleteButton = buttonArea.createEl('button', { text: this.plugin.modal('DELETE_EXECUTE') });
    deleteButton.style.cssText = `
      padding: 8px 16px;
      background: var(--text-error);
      border: 1px solid var(--text-error);
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-on-accent);
      font-weight: bold;
    `;
    
    deleteButton.addEventListener('click', async () => {
      const success = await this.plugin.executeTranslationDeletion(
        this.pluginManifest.id,
        this.pluginManifest.name
      );
      
      if (success) {
        this.close();
      }
    });

    // フォーカスをキャンセルボタンに設定（安全のため）
    setTimeout(() => cancelButton.focus(), 100);
  }

  onClose() {
    // クリーンアップ
  }
}