'use strict';
import { v4 as uuidv4 } from 'uuid';

export default class Chat {
  constructor() {
    this.nickname = String();
    this.formContainer = document.querySelector('.form');
    this.form = this.formContainer.querySelector('form');
    this.formButton = document.querySelector('.btn-primary')
    this.chatContainer = document.querySelector('.direct-chat');
    this.chatBody = document.querySelector('.direct-chat-messages');
    this.chatButton = document.querySelector('.btn-warning');
    this.chatInput = document.querySelector('.chat-input');
    this.url = 'https://websocketchatbe.herokuapp.com';
    this.xhr = new XMLHttpRequest();
    this.ws = new WebSocket('wss://websocketchatbe.herokuapp.com/ws');
    this.ws.binaryType = 'blob';
  }

  init() {
    this.loadUserUuidFromLocalStorage();
    this.checkUUID();
    this.formSubmitEventListener();
    this.xhrLoadEventListener();
    this.webSocketEventListener();
  }

  // methods
  checkUUID() {
    if ( this.uuid ) {
      this.removeHiddenForElement( this.chatContainer )
      let params = `&method=getAllMessages`;
      this.xhr.open('POST', this.url, true);
      this.xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      this.xhr.send( params );
    } else {
      this.removeHiddenForElement( this.formContainer );
    }
  }

  // events
  formSubmitEventListener() {
    this.formButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.nickname =  this.form.querySelector('input').value;
      this.uuid = uuidv4();
      if ( this.nickname ) {
        let params =
          `&uuid=${ this.uuid }`
        + `&nickname=${ this.nickname }`
        + `&method=POST`;
        this.xhr.open('POST', this.url, true);
        this.xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        this.xhr.send( params );
      }
    })
  }

  // API
  xhrLoadEventListener() {
    this.xhr.addEventListener('load', () => {
      if ( this.xhr.status >= 200 && this.xhr.status < 300 ) {
        try {
          if ( this.xhr.status === 290 ) {
            this.response = JSON.parse( this.xhr.responseText );
            this.saveUserUuidToLocalStorage();
            this.form.querySelector('input').value = '';
            this.removeHiddenForElement( this.chatContainer );
            this.hideElement( this.formContainer );
            this.redrawChatList();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  webSocketEventListener() {
    this.ws.addEventListener('open', () => {
      // After this we can send messages ws.send('hello!');
      this.chatButton.addEventListener('click', event => {
        event.preventDefault();
        if ( this.chatInput.value.length > 0 ) {
          this.ws.send(JSON.stringify({
            uuid: this.uuid,
            name: this.nickname,
            date: `${ new Date().toLocaleDateString() } ${ new Date().toLocaleTimeString() }`,
            message: this.chatInput.value,
          }));
          this.chatInput.value = '';
          this.checkUUID();
          this.redrawChatList();
        }
      })
    });

    this.ws.addEventListener('message', (evt) => {
      // handle evt.data
      if ( evt.data === 'toUpdate' ) {
        this.checkUUID();
        this.redrawChatList();
      }
    });
    this.ws.addEventListener('close', (evt) => {
      // After this we can't send messages
    });
    this.ws.addEventListener('error', () => {
      // console.log('error');
    });
  }

  // UI
  redrawChatList() {
    this.chatBody.textContent = '';
    if ( this.response.length > 0) {
      this.response.forEach(element => {
        if ( element.uuid === this.uuid ) {
          this.chatBody.insertAdjacentHTML('beforeend',
            `
            <div class="direct-chat-msg">
              <div class="direct-chat-info clearfix">
                <span class="direct-chat-name pull-left"> ${ element.name } </span>
                <span class="direct-chat-timestamp pull-right"> ${ element.date } </span>
              </div>
              <img class="direct-chat-img" src="https://img.icons8.com/color/36/000000/person-male.png" alt="message user image">
              <div class="direct-chat-text"> ${ element.message } </div>
            </div>
          `)
        } else {
          this.chatBody.insertAdjacentHTML('beforeend',
            `
            <div class="direct-chat-msg right">
              <div class="direct-chat-info clearfix">
                <span class="direct-chat-name pull-right"> ${ element.name } </span>
                <span class="direct-chat-timestamp pull-right"> ${ element.date } </span>
              </div>
              <img class="direct-chat-img" src="https://img.icons8.com/office/36/000000/person-male.png" alt="message user image">
              <div class="direct-chat-text"> ${ element.message } </div>
            </div>
          `)
        }

      })
    }
    this.chatBody.scrollTop = this.chatBody.scrollHeight;
  }

  hideElement( element ) {
    element.classList.add( 'hidden' );
  }

  removeHiddenForElement( element ) {
    element.classList.remove('hidden');
  }

  loadUserUuidFromLocalStorage() {
    const chatLocalStorage = JSON.parse(localStorage.getItem('chat'));
    if ( chatLocalStorage ) {
      this.uuid = chatLocalStorage.uuid;
      this.nickname = chatLocalStorage.nickname;
    }
  }

  saveUserUuidToLocalStorage() {
    localStorage.setItem('chat', JSON.stringify({
      uuid: this.uuid,
      nickname: this.nickname,
    }));
  }
}
