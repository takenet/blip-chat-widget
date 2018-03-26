const CHAT_URL_LOCAL = 'http://localhost:8082/'
const CHAT_URL_HMG = 'https://hmg-chat.blip.ai/'
const CHAT_URL_PROD = 'https://chat.blip.ai/'

const CHAT_READY_CODE = 'RequestCookie'
const START_CONNECTION_CODE = 'BlipSdkStartConnection'
const CREATE_ACCOUNT_CODE = 'CreateAccount'
const CHAT_CONNECTED_CODE = 'ChatConnected'
const SEND_MESSAGE_CODE = 'SendMessage'
const SEND_COMMAND_CODE = 'SendCommand'
const USER_IRIS_ACCOUNT = 'UserIrisAccount'
const USER_ACCOUNT_KEY = 'blipSdkUAccount'
const PARENT_NOTIFICATION_CODE = 'NewBotMessage'
const COOKIES_EXPIRATION = 8.64e7

const DEV_AUTH = 'Dev'
const GUEST_AUTH = 'Guest'

const CONSTANTS = {
  CHAT_URL_LOCAL,
  CHAT_URL_HMG,
  CHAT_URL_PROD,
  CHAT_READY_CODE,
  START_CONNECTION_CODE,
  CHAT_CONNECTED_CODE,
  SEND_MESSAGE_CODE,
  SEND_COMMAND_CODE,
  USER_IRIS_ACCOUNT,
  USER_ACCOUNT_KEY,
  CREATE_ACCOUNT_CODE,
  COOKIES_EXPIRATION,
  DEV_AUTH,
  GUEST_AUTH,
  PARENT_NOTIFICATION_CODE
}

module.exports = CONSTANTS
