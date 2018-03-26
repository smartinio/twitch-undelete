var chat = null
var observer = null
var messageObservers = []
var removedMessages = {}
var getId = idMaker()

/**
 * Finds the chat container
 */
document.onreadystatechange = function () {
  let interval = setInterval(function () {
    let amsg = document
      .querySelector('.chat-line__message')

    if (!amsg) {
      return
    }

    clearInterval(interval)
    chat = amsg.parentElement
    observer = getChatObserver()
    observer.observe(chat, {
      childList: true
    })
  }, 500)

  // Add some styling to the undeleted messages
  addCss()
}

/**
 * Adds a message observer for every new message.
 * Keeps at most 30 observers running at one time,
 * which is approximately 1-2x the number of messages
 * visible at a time on a 1080p screen.
 * 
 * @param {Mutation} mutation
 */
function handleNewMessage(mutation) {
  if (mutation.addedNodes.length == 0) {
    return
  }
  let message = mutation.addedNodes[0]
  let moid = getId.next().value
  let messageObserver = getMessageObserver()
  messageObserver.observe(message, {
    childList: true,
    subtree: true
  })
  messageObservers.push(messageObserver)

  if (messageObservers.length > 30) {
    let oldest = messageObservers.shift()
    oldest.disconnect()
  }
}

/**
 * Replaces deleted messages
 * with their original data
 * 
 * @param {Mutation} mutation 
 */
function handleMessageModified(mutation) {
  let id = mutation.target.dataset.tuid
  let addedMessage = mutation.addedNodes[0]

  if (!id || !addedMessage.className.includes('deleted')) {
    return
  }

  let originalMessage = removedMessages[id]
  addedMessage.innerHTML = originalMessage.innerHTML
  addedMessage.classList.add('tu-re-added')
  delete removedMessages[id]

  // hack to avoid unforseen growth of map
  if (Object.keys(removedMessages).length > 10) {
    removedMessages = {}
  }
}

/**
 * Stores removed messages
 * so they can be restored
 * 
 * @param {Mutation} mutation 
 */
function handleMessageRemoved(mutation) {
  let removedMessage = mutation.removedNodes[0]
  if (!isMessage(removedMessage)) {
    return false
  }
  let tuid = getId.next().value
  removedMessages[tuid] = removedMessage
  mutation.target.dataset.tuid = mutation.target.dataset.tuid || tuid
}

/**
 * Checks if the removed node
 * is actually a chat message
 * 
 * @param {Node} removedMessage
 * @returns Boolean
 */
function isMessage(removedMessage) {
  let invalid = (
    !removedMessage.innerHTML ||
    removedMessage.innerHTML.length < 2 ||
    removedMessage.innerHTML.includes('placeholder') ||
    removedMessage.className.includes('deleted') ||
    removedMessage.className.includes('tooltip')
  )

  return !invalid
}

/**
 * Factory for the chat observer
 */
function getChatObserver() {
  return new MutationObserver(
    function (mutationsList) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          handleNewMessage(mutation)
        }
      }
    }
  )
}

/**
 * Factory for message observers
 */
function getMessageObserver() {
  return new MutationObserver(
    function (mutationsList) {
      for (let mutation of mutationsList) {
        let relevant
        // Removed message
        if (mutation.removedNodes.length == 1) {
          relevant = handleMessageRemoved(mutation)
          if (!relevant) {
            continue
          }
        }
        // Added message
        if (mutation.addedNodes.length == 1) {
          handleMessageModified(mutation)
        }
      }
    }
  )
}

/**
 * Adds styling to undeleted messages
 */
function addCss() {
  let style = document.createElement('style')
  style.innerHTML = `
    .tu-re-added {
      font-weight: bold !important;
      color: red !important;
    }
  `
  document
    .getElementsByTagName('head')[0]
    .appendChild(style)
}

/**
 * Generates ID's for removed messages
 */
function* idMaker() {
  let index = 0
  while (index < index + 1) {
    yield index++
  }
}