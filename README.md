# Repository

`git clone https://gitlab.com/samuelstake/blip-chat-widget.git`

# Running

* `npm install`
* `npm start`
* Project will be running on `http://localhost:3000`

# Deploy

## Homologation

url: [https://hmg-blip-chat.herokuapp.com/](https://hmg-blip-chat.herokuapp.com/)

`git push staging master`

## Production

url: [https://blip-chat.herokuapp.com/](https://blip-chat.herokuapp.com/)

`git push production master`

# Optional parameters

| Property          | Description                                         |
| ----------------- | --------------------------------------------------- |
| withAppKey        | Set the bot's idenfigier                            |
| withButton        | Set the button color and icon                       |
| withAuth          | Set the auth type and user account                  |
| withEventHandler  | Set the events to be called. Params: name and function |
| withTarget        | Set the element that will present the chat          |

*Supported events:
OnEnter - Set the event to run on first time opening the chat
OnLeave - Set the event to run on openening the chat
OnLoad  - Set the event to run on closing the chat

## Example

```js
var builder = new ChatBuilder()
  .withAppKey('YmxpcHRlc3RjYXJkczoxOGE5NzUwYS1kZjAxLTRhNTgtODA1ZC1kY2ExYmI2NTBmZjk=')
  .withButton({
    color: '#F00',
    icon:
      'https://www.google.com.br/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
  })
  .withAuth({
    authType: 'Dev',
    userAccount: {
      identity: '1234567',
      password: 'MTIzNDU2',
      name: 'User test',
      email: 'user@blip.ai',
    },
  })
  .withEventHandler('OnEnter', () => console.log('enter'))
  .withEventHandler('OnLeave', () => console.log('leave'))
  .withEventHandler('OnLoad', () => builder.sendMessage('chatloaded'))
  .withTarget('mydiv')
```
