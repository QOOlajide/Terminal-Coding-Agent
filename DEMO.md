# 🎯 Codebanger Demo - Real-Time @ File Mentions

## The Magic of @ Mentions

Just like in Cursor's chat interface, typing `@` instantly triggers file autocomplete!

## 🚀 Quick Start

```bash
npm run build
codebanger
```

## 📹 Live Demo Scenarios

### Scenario 1: Simple File Reference
```
You type:     Add logging to @
              ↑ [Dropdown appears instantly!]
              
Filter by:    "index"
              ↑ [List filters to show matching files]
              
Select:       src/index.ts
              ↑ [File inserts inline]
              
Result:       Add logging to @src/index.ts
```

### Scenario 2: Multiple Files
```
You type:     Merge @ and @ into one file
              ↑           ↑
              [First @]   [Second @]
              
Step 1:       @ triggers → select "src/utils.ts"
Step 2:       @ triggers → select "src/helpers.ts"
              
Result:       Merge @src/utils.ts and @src/helpers.ts into one file
```

### Scenario 3: Mid-Sentence Reference
```
You type:     The bug in @ needs fixing
                         ↑
                         [@ triggers dropdown]
              
Select:       src/index.ts
              
Result:       The bug in @src/index.ts needs fixing
                         ↑
Continue:     [Keep typing after the inserted filename]
```

## 🎮 Controls

- **Type @** → Instant dropdown appears
- **Type letters** → Filters file list in real-time
- **Arrow keys** → Navigate file list
- **Enter** → Select file and insert
- **Backspace** → Delete characters
- **Enter (on command line)** → Submit your command

## ✨ Features

### Real-Time Filtering
As you type after the dropdown appears, files filter instantly:
```
Type: src/    → Shows only files in src/
Type: index   → Shows only files with "index" in name
Type: .ts     → Shows only TypeScript files
```

### Natural Flow
```
Start → Type naturally → Press @ when needed → Select file → Keep typing → Repeat
```

### Auto-Open in Editor
After submitting your command:
```
✓ Command received:
  Refactor @src/index.ts and @src/utils.ts

✓ Referenced files:
  1. src/index.ts
  2. src/utils.ts

? Open referenced file(s) in editor? (Y/n)
```

Select `Y` → Files open automatically in Cursor or VS Code!

## 🎨 Visual Flow

```
┌─────────────────────────────────────────────┐
│ 💬 Your command: Fix the bug in @          │  ← You're typing
└─────────────────────────────────────────────┘
                                    ↓
                            [@ Detected!]
                                    ↓
┌─────────────────────────────────────────────┐
│ 📁 Select file (type to filter):            │
│ ❯ src/index.ts                              │  ← Autocomplete dropdown
│   src/utils.ts                              │     appears instantly
│   package.json                              │
│   README.md                                 │
└─────────────────────────────────────────────┘
                                    ↓
                            [Select file]
                                    ↓
┌─────────────────────────────────────────────┐
│ 💬 Your command: Fix the bug in @src/index │  ← File inserted!
│                                        .ts_ │     Continue typing
└─────────────────────────────────────────────┘
```

## 🔑 Key Differences from Old Behavior

### ❌ Old Way:
1. Type full command with placeholder "@"
2. Press Enter
3. THEN select files one by one
4. Can't see what you're referencing

### ✅ New Way (Current):
1. Type naturally, press @ when needed
2. Autocomplete appears INSTANTLY
3. Filter and select in real-time
4. File name inserts inline
5. See exactly what you're referencing
6. Keep typing naturally

## 💡 Pro Tips

1. **Use descriptive commands**: The file references make your intent crystal clear
2. **Multiple references**: Add as many @ mentions as you need
3. **Partial paths work**: Type "@src/" to see only files in src/
4. **Quick navigation**: Use up/down arrows for fast selection

## 🎯 Try These Commands

```bash
codebanger
```

Then try:
- `"Add error handling to @"`
- `"Refactor @ to use TypeScript"`
- `"Copy the logic from @ to @"`
- `"The function in @ has a memory leak"`
- `"Compare @ and @ for differences"`

## 🚦 What Happens Next

After you press Enter on your command:
1. ✅ Command is displayed with all file references
2. 📋 List of all referenced files shown
3. ❓ Prompt to open files in editor
4. 🚀 Files open in Cursor/VS Code automatically
5. 💡 Command saved for AI processing (future feature)

---

**Enjoy the seamless workflow! 🎉**

