```javascript
(function() {
    'use strict';

    const BrowserState = {
        tabs: [],
        currentTabId: null,
        nextTabId: 1
    };

    class Tab {
        constructor(id, url = 'about:blank') {
            this.id = id;
            this.history = [];
            this.currentHistoryIndex = -1;
            this.title = 'New Tab';
            
            if (url && url !== 'about:blank') {
                this.addToHistory(url);
            }
        }

        addToHistory(url) {
            if (this.currentHistoryIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.currentHistoryIndex + 1);
            }
            this.history.push(url);
            this.currentHistoryIndex = this.history.length - 1;
        }

        getCurrentUrl() {
            return this.currentHistoryIndex >= 0 ? this.history[this.currentHistoryIndex] : '';
        }

        canGoBack() {
            return this.currentHistoryIndex > 0;
        }

        canGoForward() {
            return this.currentHistoryIndex < this.history.length - 1;
        }

        goBack() {
            if (this.canGoBack()) {
                this.currentHistoryIndex--;
                return this.getCurrentUrl();
            }
            return null;
        }

        goForward() {
            if (this.canGoForward()) {
                this.currentHistoryIndex++;
                return this.getCurrentUrl();
            }
            return null;
        }
    }

    const URLHandler = {
        normalize(input) {
            if (!input || input.trim() === '') {
                return 'about:blank';
            }

            const trimmed = input.trim();

            if (trimmed === 'about:blank') {
                return trimmed;
            }

            if (trimmed.match(/^https?:\/\//i)) {
                return trimmed;
            }

            if (trimmed.includes('.') && !trimmed.includes(' ')) {
                return 'https://' + trimmed;
            }

            return 'https://www.google.com/search?q=' + encodeURIComponent(trimmed);
        },

        isValid(url) {
            if (url === 'about:blank') return true;
            
            try {
                new URL(url);
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    const TabManager = {
        createTab(url = 'about:blank') {
            const tab = new Tab(BrowserState.nextTabId++, url);
            BrowserState.tabs.push(tab);
            this.renderTabBar();
            this.switchToTab(tab.id);
            return tab;
        },

        getTab(id) {
            return BrowserState.tabs.find(tab => tab.id === id);
        },

        getCurrentTab() {
            return this.getTab(BrowserState.currentTabId);
        },

        closeTab(id) {
            const index = BrowserState.tabs.findIndex(tab => tab.id === id);
            if (index === -1) return;

            BrowserState.tabs.splice(index, 1);

            if (BrowserState.tabs.length === 0) {
                this.createTab();
                return;
            }

            if (BrowserState.currentTabId === id) {
                const newIndex = Math.min(index, BrowserState.tabs.length - 1);
                this.switchToTab(BrowserState.tabs[newIndex].id);
            } else {
                this.renderTabBar();
            }
        },

        switchToTab(id) {
            const tab = this.getTab(id);
            if (!tab) return;

            BrowserState.currentTabId = id;
            this.renderTabBar();
            Navigation.loadCurrentTabUrl();
            UIManager.updateControls();
        },

        renderTabBar() {
            const tabsContainer = document.getElementById('tabs');
            if (!tabsContainer) return;

            tabsContainer.innerHTML = '';

            BrowserState.tabs.forEach(tab => {
                const tabElement = document.createElement('div');
                tabElement.className = 'tab' + (tab.id === BrowserState.currentTabId ? ' active' : '');
                tabElement.dataset.tabId = tab.id;

                const tabTitle = document.createElement('span');
                tabTitle.className = 'tab-title';
                tabTitle.textContent = tab.title || 'New Tab';

                const closeButton = document.createElement('button');
                closeButton.className = 'tab-close';
                closeButton.textContent = '×';
                closeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closeTab(tab.id);
                });

                tabElement.appendChild(tabTitle);
                tabElement.appendChild(closeButton);

                tabElement.addEventListener('click', () => {
                    this.switchToTab(tab.id);
                });

                tabsContainer.appendChild(tabElement);
            });
        }
    };

    const Navigation = {
        loadUrl(url) {
            const tab = TabManager.getCurrentTab();
            if (!tab) return;

            const normalizedUrl = URLHandler.normalize(url);

            if (!URLHandler.isValid(normalizedUrl)) {
                this.handleError('Invalid URL');
                return;
            }

            const currentUrl = tab.getCurrentUrl();
            if (normalizedUrl !== currentUrl) {
                tab.addToHistory(normalizedUrl);
            }

            this.loadIntoIframe(normalizedUrl);
            UIManager.updateControls();
        },

        loadIntoIframe(url) {
            const iframe = document.getElementById('browser-view');
            if (!iframe) return;

            if (url === 'about:blank') {
                iframe.src = 'about:blank';
                return;
            }

            iframe.src = url;

            iframe.onerror = () => {
                this.handleError('Failed to load page');
            };
        },

        loadCurrentTabUrl() {
            const tab = TabManager.getCurrentTab();
            if (!tab) return;

            const url = tab.getCurrentUrl();
            if (url) {
                this.loadIntoIframe(url);
            } else {
                this.loadIntoIframe('about:blank');
            }
        },

        goBack() {
            const tab = TabManager.getCurrentTab();
            if (!tab || !tab.canGoBack()) return;

            const url = tab.goBack();
            if (url) {
                this.loadIntoIframe(url);
                UIManager.updateControls();
            }
        },

        goForward() {
            const tab = TabManager.getCurrentTab();
            if (!tab || !tab.canGoForward()) return;

            const url = tab.goForward();
            if (url) {
                this.loadIntoIframe(url);
                UIManager.updateControls();
            }
        },

        reload() {
            const tab = TabManager.getCurrentTab();
            if (!tab) return;

            const url = tab.getCurrentUrl();
            if (url) {
                this.loadIntoIframe(url);
            }
        },

        handleError(message) {
            console.error('Navigation error:', message);
            const iframe = document.getElementById('browser-view');
            if (iframe) {
                const errorDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (errorDoc) {
                    errorDoc.open();
                    errorDoc.write(`
                        <!DOCTYPE html>
                        <html>
                        <head><title>Error</title></head>
                        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                            <h1>Unable to load page</h1>
                            <p>${message}</p>
                        </body>
                        </html>
                    `);
                    errorDoc.close();
                }
            }
        }
    };

    const UIManager = {
        updateControls() {
            const tab = TabManager.getCurrentTab();
            const urlInput = document.getElementById('browser-url');
            const backBtn = document.getElementById('btn-back');
            const forwardBtn = document.getElementById('btn-forward');

            if (urlInput && tab) {
                urlInput.value = tab.getCurrentUrl() || '';
            }

            if (backBtn) {
                backBtn.disabled = !tab || !tab.canGoBack();
            }

            if (forwardBtn) {
                forwardBtn.disabled = !tab || !tab.canGoForward();
            }
        },

        updateTabTitle(title) {
            const tab = TabManager.getCurrentTab();
            if (tab) {
                tab.title = title || 'New Tab';
                TabManager.renderTabBar();
            }
        }
    };

    const EventManager = {
        init() {
            const urlInput = document.getElementById('browser-url');
            const backBtn = document.getElementById('btn-back');
            const forwardBtn = document.getElementById('btn-forward');
            const reloadBtn = document.getElementById('btn-reload');
            const newTabBtn = document.getElementById('btn-new-tab');
            const iframe = document.getElementById('browser-view');

            if (urlInput) {
                urlInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        Navigation.loadUrl(urlInput.value);
                    }
                });

                urlInput.addEventListener('focus', () => {
                    urlInput.select();
                });
            }

            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    Navigation.goBack();
                });
            }

            if (forwardBtn) {
                forwardBtn.addEventListener('click', () => {
                    Navigation.goForward();
                });
            }

            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    Navigation.reload();
                });
            }

            if (newTabBtn) {
                newTabBtn.addEventListener('click', () => {
                    TabManager.createTab();
                });
            }

            if (iframe) {
                iframe.addEventListener('load', () => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const title = iframeDoc.title;
                        if (title) {
                            UIManager.updateTabTitle(title);
                        }
                    } catch (e) {
                        console.log('Cannot access iframe content (cross-origin)');
                    }
                });

                iframe.addEventListener('error', () => {
                    Navigation.handleError('Page failed to load');
                });
            }

            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                    e.preventDefault();
                    TabManager.createTab();
                }

                if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                    e.preventDefault();
                    const tab = TabManager.getCurrentTab();
                    if (tab && BrowserState.tabs.length > 1) {
                        TabManager.closeTab(tab.id);
                    }
                }

                if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                    e.preventDefault();
                    Navigation.reload();
                }

                if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                    e.preventDefault();
                    if (urlInput) {
                        urlInput.focus();
                        urlInput.select();
                    }
                }
            });
        }
    };

    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                TabManager.createTab();
                EventManager.init();
            });
        } else {
            TabManager.createTab();
            EventManager.init();
        }
    }

    initialize();
})();
```
