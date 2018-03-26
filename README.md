# Running

* `npm install`
* `npm start`
* Project will be running on `http://localhost:3000`

# Optional parameters

| Property          | Description                                             |
| ----------------- | ------------------------------------------------------- |
| withAppKey        | Set the bot's app key                                   |
| withButton        | Set the button color and icon                           |
| withAuth          | Set the auth type, user identity and password           |
| withAccount       | Set the user account                                    |
| withEventHandler  | Set the events to be called. Params: name and function* |
| withTarget        | Set the element that will present the chat              |

*Supported events:
OnEnter - Set the event to run on first time opening the chat
OnLeave - Set the event to run on openening the chat
OnLoad  - Set the event to run on closing the chat

## Example

```js
<script src="https://unpkg.com/blip-chat-widget" type="text/javascript">
</script>
<script>
    (function () {
        window.onload = function () {
          var builder = new BlipChat()
            .withAppKey('YmxpcHRlc3RjYXJkczoxOGE5NzUwYS1kZjAxLTRhNTgtODA1ZC1kY2ExYmI2NTBmZjk=')
            .withButton({
              color: '#F00',
              icon:
                'https://www.google.com.br/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
            })
            .withAuth({
              authType: BlipChat.DEV_AUTH,
              userIdentity: '1234567',
              userPassword: 'MTIzNDU2',
            })
            .withAccount({
              fullName: 'John Doe',
              email:'johndoe@gmail.com',
              phoneNumber: '+15055034455',
              city: 'Decatur',
            })
            .withEventHandler(BlipChat.ENTER_EVENT, function () {
              console.log('enter')
            })
            .withEventHandler(BlipChat.LEAVE_EVENT, function () {
              console.log('leave')
            })
            .withEventHandler(BlipChat.LOAD_EVENT, function () {
              console.log('chatloaded')
            })
          builder.build()
      }
    })();
</script>
```

#Features

##Destroy chat widget

Destroys the widget that was added to your page. See example bellow:

##Toogle chat widget

Toogles the chat widget window. See example bellow:

##Send message

Sends a message to your bot. The message can be a simple text or any lime document. See example bellow:

##Send command

Sends a command.
