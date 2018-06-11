# Running

* `npm install`
* `npm start`
* Project will be running on `http://localhost:3000`

# Installation

Add the script element inside the **body** of your web page. To get the script with your app key, go to [BLiP portal][1]. Choose the desired bot, go to the upper menu and access `Channels > Blip Chat`. On the `Setup` tab you will be able to get the required script. You also have to sign up all website domains into which Blip Chat will be included, otherwise it will not work. 
That's all :)

*For **publishing** purposes, download the script and make a reference to it locally. CDN may have availability problems and cause BLiP Chat instability.*

```html
<script src="https://unpkg.com/blip-chat-widget" type="text/javascript"></script>
<script>
    (function () {
        window.onload = function () {
            new BlipChat()
            .withAppKey('YOUR-APP-KEY')
            .withButton({"color":"#2CC3D5"})
            .build();
        }
    })();
</script>
```

# Optional parameters

| Property          | Description                                             |
| ----------------- | ------------------------------------------------------- |
| withAppKey        | Set the bot's app key                                   |
| withButton        | Set the button's color and icon                           |
| withAuth          | Set the auth type, user identity and password           |
| withAccount       | Set the user account                                    |
| withEventHandler  | Set the events to be called. Params: name and function* |
| withTarget        | Set the element that will contain the chat              |

*Supported events:
<br>OnEnter - Set the event to run on opening the chat
<br>OnLeave - Set the event to run on closing the chat
<br>OnLoad  - Set the event to run after loading the chat

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

# Guidelines

### HTTPS

It's pretty recommended to use SSL certificate for the site that will receive the BLiP Chat. This is necessary for security reasons and for some cards to work properly.

### Geolocalization Card

This card only works if your website has a SSL certificate and is accessed via HTTPS. This occurs because of security polices of browsers.

# Script usage



# Features

## Destroy chat widget

Destroys the widget that was added to your page. See example below:

## Toogle chat widget

Toggles the chat widget window. See example below:

## Send message

Sends a message to your bot. The message can be a simple text or any LIME Protocol document. See example below:

## Send command

Sends a command.

 [1]: https://preview.blip.ai

## Check if is user first interaction

Boolean value indicating if it is the first time that the user is interacting with the bot.

Example showing the bot starting the interaction, if it is the first time of the user openning it.

```js
<script src="https://unpkg.com/blip-chat-widget" type="text/javascript"></script>
<script>
    (function () {
        window.onload = function () {
          var blipClient = new BlipChat()
          .withAppKey('YOUR-APP-KEY')
          .withEventHandler(BlipChat.LOAD_EVENT, function () {
			
            if (blipClient.widget.isFirstTime) {
              blipClient.sendMessage({
                  "type": "application/vnd.lime.chatstate+json",
                  "content": {
                    "state": "starting"
                  }
              });
            }
				
          });
          blipClient.build();
        }
    })();
</script>
```