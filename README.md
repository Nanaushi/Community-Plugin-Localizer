# Community-Plugin-Localizer

A plugin that enables translation and localization of Obsidian community plugins into multiple languages.
You can translate plugin settings screen text from English to **various languages**.
While the example shows translation from English to Japanese,
all languages supported by translation services including Google Translate are available.

English → Japanese

English → Arabic

English → Korean

English → German

English → French

etc...

https://github.com/user-attachments/assets/53b34cae-2a7b-47de-9a52-73aae6b07a35



## ✨ Features

### 🚀 Core Features
- **Floating Button**: Direct access to translation tools from any plugin settings screen, movable and hideable so it doesn't interfere with reading text.
- **String Extraction**: Automatically extract translatable text from each plugin settings screen
- **Translation Preview**: Edit translations before and after application
- **Advanced Search**: Powerful search functionality to quickly find and navigate translations
- **Row Movement Tools**: Intuitive up/down movement buttons to organize translations
- **Chunk Management**: Efficient processing with automatic text splitting for large translations
- **One-Click Translation Toggle**: Instantly switch between original and translated text
- **Version Management**: Track plugin updates and maintain translation compatibility

### 🌐 Supported Languages for Plugin Settings Screen
- **English** (Default)
- **日本語** (Japanese)
- **한국어** (Korean)

**We plan to add more supported languages upon request.**

https://github.com/user-attachments/assets/7a007970-c606-454c-8a11-7f1922a86756

## 📦 Installation

### Community Plugin (Recommended)
1. Open Obsidian settings
2. Navigate to Community Plugins
3. Search for "Community Plugin Localizer"
4. Install and enable the plugin

### Manual Installation
1. Download the latest release from GitHub
2. Extract files to `VaultFolder/.obsidian/plugins/community-plugin-localizer/`
3. Restart Obsidian and enable the plugin

## 🎮 Usage

### Quick Start

https://github.com/user-attachments/assets/b09c83bd-ce64-4bcb-bcc3-01b040b042c2

1. Open any plugin's settings screen
2. Click the floating button (☰)
3. Click "📋 Extract" button to extract translatable strings
4. Paste into your preferred translation website (Ctrl + V)
5. Select and copy all translation results
6. Press "📝 Paste Translation" button to paste translations
7. Preview and edit in the built-in editor
8. Use "🌐 Translation ON/OFF" button to toggle translations anytime

### Step-by-Step Guide

#### 1. Text Extraction
- Navigate to any community plugin's settings
- Click the floating button
- Select "📋 Extract" to collect translatable text
- Text is automatically copied to clipboard

#### 2. Translation
- Use your preferred translation tool (ChatGPT, Google Translate, etc.)
- Translate line by line in the same order
- Copy the translated text

#### 3. Preview and Edit
- Click "📝 Paste Translation" to import translations
- Review and adjust translations in the preview modal
- Use search functionality to find specific text
- Move rows up and down for better organization

#### 4. Application
- Save translations
- Toggle between original and translated text with "🌐 Translation ON/OFF"

### Advanced Features

#### Chunk Management
For plugins with large amounts of text:
- Automatic splitting into manageable chunks
- Edit and translate individual chunks
- Track status of each chunk
- Seamless merging when complete

#### Search and Navigation
- Real-time search across original and translated text
- Keyboard shortcuts: Enter (next), Shift+Enter (previous)
- Visual highlighting of search results

## ⚙️ Settings

### Language Settings
- **Display Language**: Select the interface language for the plugin
- **Notification Language**: Set the language for notification messages

### Floating Button
- **Show/Hide**: Toggle floating button visibility
- **Menu Layout**: Switch between horizontal/vertical button layout
- **Position**: Change position via drag & drop (auto-saved)

### Storage Management
- **Translation Files**: Stored in `CPLocalizer-translations/` folder
- **Backup System**: Deleted translations moved to trash for recovery
- **Version Tracking**: Automatic monitoring of plugin versions

*Deletion uses Obsidian's official API trash method.
*The destination for deleted translation files varies based on the official Obsidian setting "Settings > Files & Links > Deleted Files".

## 🎨 Customization

### Button Position
- Drag the floating button to any position within the settings panel
- Position is remembered across sessions
- Reset to default with settings toggle

### Layout Options
- **Horizontal**: Arrange buttons in a row (default)
- **Vertical**: Stack buttons vertically (suitable for narrow screens like mobile)

### Modal Sizing
- All modals are resizable and remember their size
- Drag corners to adjust size as needed
- Optimized for both desktop and mobile

## 📁 File Structure

```
VaultFolder/
├── CPLocalizer-translations/
│   ├── plugin-id.json         # Uncategorized translations
│   ├── plugin-id_ja.json      # Japanese translations
│   └── plugin-id_ko.json      # Korean translations
└── .obsidian/
    └── plugins/
        └── community-plugin-localizer/
```

## 🔧 Translation File Format

Translation files use JSON format with metadata:

```json
{
  "_metadata": {
    "pluginVersion": "1.2.3"
  },
  "Original Text": "Translated Text",
  "Settings": "設定",
  "Enable feature": "機能を有効化"
}
```

## 🛠️ Testing Tools

### String Extraction Test
- Test whether any string is extracted as translatable
- Detailed step-by-step analysis of the extraction process
- Understand why specific strings are included/excluded

### Detection Rules
The plugin uses rules to identify translatable text:
- **Include**: User-facing text, setting descriptions, button labels
- **Exclude**: Technical terms, file paths, variable names, plugin names
- **Protect**: Important UI keywords that should remain in English

## 🚨 Troubleshooting

### Common Issues

#### Floating Button Not Visible
- Check if "Show Floating Button" is enabled in settings
- Toggle "Show Floating Button" off/on to reset position
- Button may be positioned off-screen (reset with toggle)

#### Translations Not Applied
- Verify "Translation ON" is active
- Close and reopen the settings window
- Switch between plugin tabs
- Check if translation files exist in `CPLocalizer-translations/`

#### Empty Extraction Results
- Plugin may not have translatable UI elements (non-English strings are not extracted)
- Some plugins use non-standard UI components
- Use extraction test tool to verify text detection

## 🤝 Contributing

### Translation Contributions
We welcome requests for additional languages to display in this plugin's settings screen.

### Feature Requests / Bugs

- Please create a new issue.

### Questions & Others

- Please create a new discussion.
