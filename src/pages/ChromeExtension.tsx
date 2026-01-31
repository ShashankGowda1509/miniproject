import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Chrome, Download, FileCode, FolderTree, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { useState } from 'react';

const manifestJson = `{
  "manifest_version": 3,
  "name": "Interview Assistant - AI Learning Helper",
  "version": "1.0.0",
  "description": "AI-powered learning assistant for note-taking and language improvement during online meetings.",
  "permissions": [
    "activeTab",
    "sidePanel",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://meet.google.com/*",
    "https://zoom.us/*",
    "https://*.zoom.us/*"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://meet.google.com/*",
        "https://zoom.us/*",
        "https://*.zoom.us/*"
      ],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_title": "Open Interview Assistant"
  }
}`;

const backgroundJs = `// background.js - Service Worker for Interview Assistant Extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSCRIPT_UPDATE') {
    // Forward transcript to side panel
    chrome.runtime.sendMessage({
      type: 'NEW_TRANSCRIPT',
      data: message.data
    });
  }
  
  if (message.type === 'GET_AI_SUGGESTION') {
    // Placeholder for AI API call
    // In production, call your AI backend here
    const suggestion = generateSuggestion(message.question);
    sendResponse({ suggestion });
  }
  
  return true; // Keep message channel open for async response
});

// Placeholder suggestion generator
function generateSuggestion(question) {
  // This would call your AI API in production
  return {
    suggestion: "Consider structuring your answer with: 1) A brief introduction, 2) Key points with examples, 3) A concise conclusion.",
    tips: [
      "Use specific examples from your experience",
      "Keep your answer focused and relevant",
      "Maintain a confident but humble tone"
    ]
  };
}

// Store transcript history
let transcriptHistory = [];

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'SAVE_TRANSCRIPT') {
    transcriptHistory.push({
      timestamp: new Date().toISOString(),
      text: message.text,
      speaker: message.speaker
    });
    
    // Save to storage
    chrome.storage.local.set({ transcriptHistory });
  }
});`;

const contentJs = `// content.js - Content script for capturing meeting audio/captions

// Wait for page to load
window.addEventListener('load', () => {
  initializeCaptionObserver();
});

function initializeCaptionObserver() {
  // Google Meet caption observer
  const meetCaptionSelectors = [
    '[data-message-text]',
    '.iOzk7',
    '.zs7s8d'
  ];
  
  // Zoom caption observer
  const zoomCaptionSelectors = [
    '.transcript-message',
    '.closed-caption-text'
  ];
  
  const allSelectors = [...meetCaptionSelectors, ...zoomCaptionSelectors];
  
  // Create MutationObserver for caption changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        processNewCaptions();
      }
    });
  });
  
  // Start observing document body
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  console.log('Interview Assistant: Caption observer initialized');
}

function processNewCaptions() {
  // Find caption elements
  const captionElements = document.querySelectorAll(
    '[data-message-text], .iOzk7, .transcript-message'
  );
  
  captionElements.forEach((el) => {
    const text = el.textContent?.trim();
    if (text && !el.dataset.processed) {
      el.dataset.processed = 'true';
      
      // Send to background script
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT_UPDATE',
        data: {
          text: text,
          timestamp: Date.now(),
          source: detectPlatform()
        }
      });
      
      // Check if it's a question
      if (isQuestion(text)) {
        chrome.runtime.sendMessage({
          type: 'QUESTION_DETECTED',
          data: { text }
        });
      }
    }
  });
}

function detectPlatform() {
  if (window.location.hostname.includes('meet.google.com')) {
    return 'google-meet';
  }
  if (window.location.hostname.includes('zoom.us')) {
    return 'zoom';
  }
  return 'unknown';
}

function isQuestion(text) {
  const questionIndicators = [
    '?',
    'what',
    'why',
    'how',
    'when',
    'where',
    'who',
    'could you',
    'can you',
    'tell me',
    'describe',
    'explain'
  ];
  
  const lowerText = text.toLowerCase();
  return questionIndicators.some(indicator => lowerText.includes(indicator));
}

// Inject notification for user
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'interview-assistant-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}`;

const sidepanelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Assistant</title>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>📝 Interview Assistant</h1>
      <p class="subtitle">AI Learning Helper</p>
    </header>
    
    <div class="tabs">
      <button class="tab active" data-tab="transcript">Transcript</button>
      <button class="tab" data-tab="suggestions">AI Tips</button>
      <button class="tab" data-tab="notes">Notes</button>
    </div>
    
    <div class="content">
      <!-- Transcript Tab -->
      <div id="transcript-tab" class="tab-content active">
        <div class="transcript-list" id="transcript-list">
          <p class="empty-state">Waiting for captions...</p>
        </div>
      </div>
      
      <!-- Suggestions Tab -->
      <div id="suggestions-tab" class="tab-content">
        <div class="suggestion-card" id="current-question">
          <h3>Detected Question</h3>
          <p class="question-text">No question detected yet</p>
        </div>
        
        <div class="suggestion-card">
          <h3>💡 AI Suggestions</h3>
          <div id="ai-suggestions">
            <p class="empty-state">Tips will appear when a question is detected</p>
          </div>
        </div>
      </div>
      
      <!-- Notes Tab -->
      <div id="notes-tab" class="tab-content">
        <textarea id="user-notes" placeholder="Take notes here..."></textarea>
        <button class="btn" id="save-notes">Save Notes</button>
      </div>
    </div>
    
    <footer class="footer">
      <small>AI Learning Assistant - For educational purposes only</small>
    </footer>
  </div>
  
  <script src="sidepanel.js"></script>
</body>
</html>`;

const sidepanelCss = `/* Side Panel Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  line-height: 1.5;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
}

.header {
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.subtitle {
  font-size: 12px;
  color: #64748b;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.tab.active {
  background: #3b82f6;
  color: white;
}

.content {
  flex: 1;
  overflow: hidden;
}

.tab-content {
  display: none;
  height: 100%;
  overflow-y: auto;
}

.tab-content.active {
  display: block;
}

.transcript-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transcript-item {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  font-size: 13px;
}

.transcript-item .timestamp {
  font-size: 10px;
  color: #94a3b8;
}

.suggestion-card {
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.suggestion-card h3 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #334155;
}

.question-text {
  font-size: 14px;
  font-weight: 500;
  color: #3b82f6;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 24px;
  font-size: 13px;
}

#user-notes {
  width: 100%;
  height: calc(100% - 50px);
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 13px;
}

.btn {
  width: 100%;
  padding: 10px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 8px;
}

.btn:hover {
  background: #2563eb;
}

.footer {
  padding-top: 16px;
  text-align: center;
  border-top: 1px solid #e2e8f0;
  margin-top: 16px;
}

.footer small {
  color: #94a3b8;
  font-size: 10px;
}`;

const sidepanelJs = `// Side Panel JavaScript

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show corresponding content
    const tabName = tab.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
  });
});

// Listen for transcript updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NEW_TRANSCRIPT') {
    addTranscriptItem(message.data);
  }
  
  if (message.type === 'QUESTION_DETECTED') {
    handleQuestionDetected(message.data);
  }
});

function addTranscriptItem(data) {
  const list = document.getElementById('transcript-list');
  
  // Remove empty state if present
  const emptyState = list.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  const item = document.createElement('div');
  item.className = 'transcript-item';
  item.innerHTML = \`
    <div class="timestamp">\${new Date(data.timestamp).toLocaleTimeString()}</div>
    <div class="text">\${data.text}</div>
  \`;
  
  list.appendChild(item);
  list.scrollTop = list.scrollHeight;
}

function handleQuestionDetected(data) {
  // Update question display
  document.querySelector('.question-text').textContent = data.text;
  
  // Request AI suggestion
  chrome.runtime.sendMessage({
    type: 'GET_AI_SUGGESTION',
    question: data.text
  }, (response) => {
    if (response && response.suggestion) {
      displaySuggestions(response.suggestion);
    }
  });
}

function displaySuggestions(suggestion) {
  const container = document.getElementById('ai-suggestions');
  container.innerHTML = \`
    <p>\${suggestion.suggestion}</p>
    <ul>
      \${suggestion.tips.map(tip => \`<li>\${tip}</li>\`).join('')}
    </ul>
  \`;
}

// Save notes
document.getElementById('save-notes').addEventListener('click', () => {
  const notes = document.getElementById('user-notes').value;
  chrome.storage.local.set({ userNotes: notes }, () => {
    alert('Notes saved!');
  });
});

// Load saved notes
chrome.storage.local.get(['userNotes'], (result) => {
  if (result.userNotes) {
    document.getElementById('user-notes').value = result.userNotes;
  }
});`;

export default function ChromeExtension() {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const copyToClipboard = (content: string, fileName: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const files = [
    { name: 'manifest.json', content: manifestJson, language: 'json' },
    { name: 'background.js', content: backgroundJs, language: 'javascript' },
    { name: 'content.js', content: contentJs, language: 'javascript' },
    { name: 'sidepanel.html', content: sidepanelHtml, language: 'html' },
    { name: 'sidepanel.css', content: sidepanelCss, language: 'css' },
    { name: 'sidepanel.js', content: sidepanelJs, language: 'javascript' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Chrome className="h-6 w-6 text-primary" />
            Chrome Extension - AI Learning Assistant
          </CardTitle>
          <CardDescription>
            A Chrome extension for live transcription and AI-assisted note-taking during online meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Educational Purpose Only</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This extension is designed as an AI learning assistant and note-taking helper. 
                  It is NOT intended for cheating or unethical use during actual interviews or exams.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Features</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Live transcription from Google Meet/Zoom
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Question detection from conversation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  AI-powered suggestions and tips
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Note-taking side panel
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Installation Steps</h4>
              <ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
                <li>Download/create all the files below</li>
                <li>Open Chrome → Settings → Extensions</li>
                <li>Enable "Developer mode"</li>
                <li>Click "Load unpacked" and select folder</li>
                <li>Pin the extension to toolbar</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Folder Structure */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderTree className="h-5 w-5" />
            Extension Folder Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-foreground text-primary-foreground p-4 rounded-lg text-sm overflow-x-auto">
{`interview-assistant-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js             # Content script for page injection
├── content.css            # Styles for injected elements
├── sidepanel.html         # Side panel UI
├── sidepanel.css          # Side panel styles
├── sidepanel.js           # Side panel logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png`}
          </pre>
        </CardContent>
      </Card>

      {/* File Contents */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCode className="h-5 w-5" />
            Extension Files
          </CardTitle>
          <CardDescription>
            Copy each file to create the complete extension
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={files[0].name}>
            <TabsList className="flex flex-wrap h-auto gap-2 mb-4">
              {files.map((file) => (
                <TabsTrigger key={file.name} value={file.name} className="text-xs">
                  {file.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {files.map((file) => (
              <TabsContent key={file.name} value={file.name}>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(file.content, file.name)}
                  >
                    {copiedFile === file.name ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <pre className="bg-foreground text-primary-foreground p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                    {file.content}
                  </pre>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Download All Button */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">
            To use this extension, copy all the files above into a folder and load it in Chrome as an unpacked extension.
          </p>
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Download as ZIP (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
