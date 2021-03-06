export default class Tabs {
  constructor (eventEmitter) {
    this.eventEmitter = eventEmitter
    this.tabs = []

    chrome.commands.onCommand.addListener((command) => {
      if (command === 'activate') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'activate' })
          }
        })
      }
    })

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.tabs) {
        sendResponse({ tabs: this.tabs })
      } else if (request.selectTab) {
        this.selectTab(request.selectTab)
      }
    })

    chrome.windows.onFocusChanged.addListener(() => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]) {
          this.unshiftTab(this.findTab(tabs[0].id))
        }
      })
    })

    this.eventEmitter.on('omnibox:select-tab', (tab) => {
      this.selectTab(tab)
    })

    chrome.tabs.onCreated.addListener((tab) => {
      this.addTab(tab)
    })

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.replaceTab(tabId, tab)
    })

    chrome.tabs.onRemoved.addListener((id) => {
      this.removeTab(id)
    })

    chrome.tabs.onActivated.addListener((info) => {
      this.unshiftTab(this.findTab(info.tabId))
    })

    chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
      this.removeTab(removedTabId)
    })

    this.getTabs()
  }

  getTabs () {
    chrome.windows.getAll({ populate: true }, (windows) => {
      let focused
      windows.forEach((w) => {
        w.tabs.map((t) => this.enhanceTab(t))

        if (w.focused) {
          focused = w
        } else {
          this.tabs = w.tabs.concat(this.tabs)
        }
      })

      if (focused) {
        this.tabs = focused.tabs.concat(this.tabs)
        this.unshiftTab(focused.tabs.find((tab) => tab.active))
      }
    })
  }

  selectTab (tab) {
    chrome.windows.update(tab.windowId, { focused: true })
    chrome.tabs.update(tab.id, { selected: true })
  }

  findTab (id) {
    return this.tabs.find((tab) => tab && tab.id === id)
  }

  addTab (tab) {
    this.enhanceTab(tab)

    if (tab.active) {
      this.tabs.unshift(tab)
    } else {
      this.tabs.push(tab)
    }
  }

  replaceTab (oldId, newTab) {
    this.enhanceTab(newTab)

    this.tabs[this.tabs.indexOf(this.findTab(oldId))] = newTab
  }

  unshiftTab (tab) {
    const index = this.tabs.indexOf(tab)
    if (index === -1) {
      this.tabs.unshift(tab)
    } else {
      this.tabs.unshift(this.tabs.splice(index, 1)[0])
    }
  }

  removeTab (id) {
    this.tabs.splice(this.tabs.indexOf(this.findTab(id)), 1)
  }

  toDataURL (url, callback) {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => {
      const reader = new FileReader()
      reader.onloadend = () => {
        callback(reader.result)
      }
      reader.readAsDataURL(xhr.response)
    }
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    xhr.send()
  }

  enhanceTab (tab) {
    this.toDataURL('chrome://favicon/size/16@1x/' + tab.url, (dataUrl) => {
      tab.favIconDataUrl = dataUrl
    })
  }
}
