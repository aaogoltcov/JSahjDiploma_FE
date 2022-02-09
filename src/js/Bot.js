'use strict';

import BSON from "bson";
import { v4 as uuidv4 } from 'uuid';
import EmojiPopover from 'emoji-popover';

export default class Bot {
  constructor() {
    // Chat container
    this.chatInput = document.querySelector('input.publisher-input');
    this.chatContainer = document.getElementById('chat-content');
    this.chatBody = document.querySelector('.chat-body');
    this.chatButton = document.getElementById('chat-button');
    this.pinnedMessageContainer = document.querySelector('.pinned-message');

    // Websocket
    this.ws = new WebSocket('wss://jsahjdiplomabe.herokuapp.com');
    this.url = 'https://jsahjdiplomabe.herokuapp.com'

    // Upload files
    this.fileSelect = document.querySelector('.file-browser');
    this.fileElem = document.getElementById('input');
    this.dropbox = document.querySelector('.publisher');
    this.filesContainer = document.querySelector('.list-group');
    this.uploadedFiles = [];
    this.page = Number();

    // Video recording
    this.videoRecordPopupbutton = document.querySelector('.fa-video');
    this.videoRecordingModal = document.getElementById('videoRecordingModal');
    this.videoRecordingUpCloseButton = document.getElementById('upCloseButton');
    this.videoRecordingDownCloseButton = document.getElementById('downCloseButton');
    this.videoPreview = document.getElementById("preview");
    this.videoRecording = document.getElementById("recording");
    this.videoStartButton = document.getElementById("startButton");
    this.videoStopButton = document.getElementById("stopButton");
    this.videoDownloadButton = document.getElementById("downloadButton");
    this.recordedBlob = new Blob();

    // Geolocation
    if ( navigator.geolocation ) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.querySelector('.geo-container').insertAdjacentHTML('beforeend',
            `
              <iframe src="https://yandex.ru/map-widget/v1/?azimut=
                ${ position.coords.latitude }%ll${ position.coords.longitude }&z=16"
                width="100%"></iframe>
            `);
        }, (error) => {
          console.log( error );
        });
      }
  }

  init() {
    this.page = 0;
    this.webSocketEventListener();
    this.uploadFilesEventListener();
    this.getData({ method: 'getAllMessages', page: this.page }, false);
    this.chatContainerScrollEventListener();
    this.addEmojis();
    this.addVideoRecording();
  }

  // [[API]]
  // [Get data from Backend with Fetch]
  getData( params, lazyLoading ) {
    params['lazyLoading'] = lazyLoading;
    fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify( params ),
    })
      .then(response => response.json())
      .then(result => { if (params.method === 'getAllMessages') {
        if ( result.length > 0 ) {
          this.redrawChat( result, lazyLoading )
        } else {
          this.page = this.page - 1;
        }
      }
    });
  }

  // [Send and get data with websocket]
  webSocketEventListener() {
    // Send data to server
    this.ws.addEventListener('open', () => {

      // Chat button event listener
      this.chatInput.addEventListener("keyup", event => {
        if (event.keyCode === 13) {
          event.preventDefault();
          this.chatButton.click();
        }
      });
      this.chatButton.addEventListener('click', event => {
        event.preventDefault();
        if ( this.chatInput.value.length > 0 || this.uploadedFiles.length > 0 ) {
          this.ws.binaryType = "blob";
          this.ws.send(BSON.serialize({
            type: 'human',
            date: `${ new Date().toLocaleDateString('ru-RU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) } ${ new Date().toLocaleTimeString() }`,
            uuid: uuidv4(),
            message: this.chatInput.value.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>'),
            files: this.uploadedFiles,
            pinned: false,
          }));

        }
        this.chatInput.value = '';
        this.filesContainer.innerHTML = '';
        this.uploadedFiles = [];
      })
    });

    // Get data from server
    this.ws.addEventListener('message', (evt) => {
      if ( evt.data === 'welcome') {
        console.log( "Websocket message: ", evt.data );
      } else {
        const data = JSON.parse( evt.data );
        console.log( "Websocket message: ", data.name );
        if ( data.name === 'messagesUploaded' ) {
          this.page = 0;
          this.getData({ method: 'getAllMessages', page: this.page }, false);
        } else if ( data.name === 'pinnedUploaded' ) {
          this.getData({ method: 'getAllMessages', page: this.page }, false);
        }
      }
    });
    this.ws.addEventListener('close', (evt) => {
      console.log('Websocket is closed: ', evt.data);
      window.location.reload();
    });
    this.ws.addEventListener('error', (evt) => {
      console.log('Websocket error: ', evt.data);
      window.location.reload();
    });
  }

  // [[Chat]]
  // [Redraw UI Chat]
  redrawChat( result, lazyLoading ) {
    const messageTemplate = function( container, element ) {
      container.insertAdjacentHTML('beforeend',
        `  
              <div class="media media-chat media-chat-reverse">
                <div class="media-body">
                  <p>${ element.message } <span class="files" data-id="${ element.uuid }"></span></p>                  
                  <p class="meta"><time datetime="${ element.date }">${ element.date }</time></p>
                </div>
                <div>                
                  <span class="publisher-btn file-group message-clip">
                    <i class="fa fa-paperclip file-browser" data-id="${ element.uuid }"></i>
                    <input type="file" id="input" multiple>
                  </span>
                </div>
              </div>
          `)
    }

    !lazyLoading ? this.chatBody.textContent = "" : false;
    !lazyLoading ? this.pinnedMessageContainer.textContent = "" : false;

    if ( result ) {
      for (let item of result) {
        let pageContainer = document.createElement('div');
        pageContainer.dataset.page = item.page;
        this.chatBody.insertAdjacentElement('afterbegin', pageContainer);
        (item.data).forEach( e => {
          const element = BSON.deserialize( Buffer.from(e.data) );
          //  [Redraw bot or human messages]
          if ( element.type === 'bot' ) {
            pageContainer.insertAdjacentHTML('beforeend',
              `
              <div class="media media-chat"> <img class="avatar" alt="Bot" src="https://img.icons8.com/color/48/000000/clr_nyx-music-player.png">
                <div class="media-body">
                  <p>${ element.message } <span class="files" data-id="${ element.uuid }"></span></p>
                  <p class="meta"><time datetime="${ element.date }>${ element.date }</time></p>
                </div>
              </div>
          `)
          } else {
            if ( element.pinned === true ) {
              messageTemplate( this.pinnedMessageContainer, element );
            } else {
              messageTemplate( pageContainer, element );
            }

            // [Redraw files links]
            const parentElement = document.querySelector(`[data-id="${ element.uuid }"]`);
            element.files.forEach( file => {
              if ( element.message.length > 0 ) {
                this.addFiles( parentElement, file, true );
              } else {
                this.addFiles( parentElement, file, false );
              }
            })
          }
        })
      }
    }


    if ( result ) {


      // [Scrolling for lazy loading]
      let pagesHeight = Number();
      for (let page = 0; page <= ( this.page > 0 ? this.page - 1 : this.page ); page++) {
        pagesHeight += document.querySelector(`div[data-page="${ page.toString() }"]`).scrollHeight;
      }
      this.chatContainer.scrollTo({
        top: this.chatContainer.scrollHeight - pagesHeight,
      });
    }

    if ( !lazyLoading ) {
      this.chatContainer.scrollTo({
        top: this.chatContainer.scrollHeight,
        behavior: "smooth",
      });
    }
    this.pinnedMessagesEventListener();
  }

  //[Add files links]
  addFiles( parentElement, file, newString ) {
    const fileLink = document.createElement('a');
    fileLink.name = file.name;
    fileLink.download = file.name;
    fileLink.href = file.file;
    fileLink.rel = "noopener";
    fileLink.textContent = file.name;
    if ( file.type.search('video') >= 0 ) {
      const videoElement = document.createElement('video');
      videoElement.src = file.file;
      videoElement.type = file.type;
      videoElement.controls = true;
      newString ? parentElement.insertAdjacentHTML('beforeend',`<br>`) : false;
      parentElement.insertAdjacentElement('beforeend', fileLink);
      parentElement.insertAdjacentElement('beforeend', videoElement);
    } else if ( file.type.search('audio') >= 0 ) {
      const audioElement = document.createElement('audio');
      audioElement.controls = true;
      audioElement.src = file.file;
      audioElement.type = file.type;
      newString ? parentElement.insertAdjacentHTML('beforeend',`<br>`) : false;
      parentElement.insertAdjacentElement('beforeend', fileLink);
      parentElement.insertAdjacentElement('beforeend', audioElement);
    } else {
      newString ? parentElement.insertAdjacentHTML('beforeend',`<br>`) : false;
      parentElement.insertAdjacentHTML('beforeend',
  `
          <a name="${ file.name }" download="${ file.name }" href="${ file.file }" rel="noopener">${ file.name }</a>
          <div><embed src="${ file.file }" style="border: none;" width="100%" height="100%"></div>
        `
      )
    }
  }

  chatContainerScrollEventListener() {
    this.chatContainer.addEventListener('scroll', () => {
      if ( this.chatContainer.scrollTop === 0) {
        this.getData({ method: 'getAllMessages', page: this.page += 1 }, true);
      }
    })
  }

  // [Emojis popover]
  addEmojis() {
    new EmojiPopover({
      button: '.fa-smile',
      container: 'body',
      targetElement: 'input.publisher-input',
      emojiList: [
        {
          value: String.fromCodePoint(parseInt ("1F600", 16)),
          label: 'grinning face',
        },
        {
          value: String.fromCodePoint(parseInt ("1F601", 16)),
          label: 'beaming face with smiling eyes',
        },
        {
          value: String.fromCodePoint(parseInt ("1F923", 16)),
          label: 'rolling on the floor laughing',
        },
        {
          value: String.fromCodePoint(parseInt ("1F642", 16)),
          label: 'slightly smiling face',
        },
        {
          value: String.fromCodePoint(parseInt ("1F643", 16)),
          label: 'upside-down face',
        },
        {
          value: String.fromCodePoint(parseInt ("1F609", 16)),
          label: 'winking face',
        },
      ],
    }).onSelect(value => { this.chatInput.value += value })
  }

  // [[Upload files]]
  // [Upload files event listener]
  uploadFilesEventListener() {
    this.fileSelect.addEventListener("click", event => {
      if ( this.fileElem ) { this.fileElem.click() }
      event.preventDefault();
    }, false);
    this.fileElem.addEventListener("change",  () => {
      this.uploadedFilesToArrayBuffer(this.fileElem.files).then( () => {
        this.uploadedFilesUITreatment()
      });
      this.fileElem.value = "";
    })
    this.dropbox.addEventListener("dragleave", event => {
      event.stopPropagation();
      event.preventDefault();
      removeFocusedInput( this.dropbox );
    }, false);
    this.dropbox.addEventListener("dragover", event => {
      event.stopPropagation();
      event.preventDefault();
      if ( !this.dropbox.classList.contains("focusedInput") ) {
        this.dropbox.classList.add("focusedInput")
      }
    }, false);
    this.dropbox.addEventListener("drop", event => {
      event.stopPropagation();
      event.preventDefault();
      this.uploadedFilesToArrayBuffer( event.dataTransfer.files );
      this.uploadedFilesUITreatment();
      removeFocusedInput( this.dropbox );
    }, false);

    // Remove focused input for drag and drop for files upload
    function removeFocusedInput( dropbox ) {
      if ( dropbox.classList.contains("focusedInput") ) {
        dropbox.classList.remove("focusedInput")
      }
    }
  }

  // [Files upload UI treatment]
  uploadedFilesUITreatment() {
    this.filesContainer.innerHTML = '';
    this.uploadedFiles.forEach( element => {
      this.filesContainer.insertAdjacentHTML('beforeend',
        `
          <div href="#" class="list-group-item flex-column align-items-start">
            <div class="d-flex w-100 justify-content-between">
              <small class="mb-1"> ${ element.name } </small>
              <small> ${ element.size } MB</small>
            </div>
          </div>
        `)
    })
  }

  // [Recording video]
  showVideoRecordingModal() {
    this.videoRecordingModal.classList.add('show');
    this.videoRecordingModal.style.display = 'flex';
  }

  closeVideoRecordingModal() {
    this.videoRecordingModal.classList.remove('show');
    this.videoRecordingModal.style.display = 'none';
  }

  addVideoRecording() {
    this.videoRecordPopupbutton.addEventListener('click', () => { this.showVideoRecordingModal() });
    this.videoRecordingUpCloseButton.addEventListener('click', () => { this.closeVideoRecordingModal() });
    this.videoRecordingDownCloseButton.addEventListener('click', () => { this.closeVideoRecordingModal() });

    function stop(stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    this.videoStartButton.addEventListener("click", () => {
      navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      }).then(stream => {
        this.videoPreview.srcObject = stream;
        this.videoDownloadButton.href = stream;
        this.videoPreview.captureStream = this.videoPreview.captureStream || this.videoPreview.mozCaptureStream;
        return new Promise(resolve => this.videoPreview.onplaying = resolve);
      }).then(() => {
        let recorder = new MediaRecorder(this.videoPreview.captureStream());
        let data = [];
        recorder.ondataavailable = event => data.push(event.data);
        recorder.start();
        let stopped = new Promise((resolve, reject) => {
          recorder.onstop = resolve;
          recorder.onerror = event => reject(event.name);
        });

        let recorded = function() {
          recorder.state === "recording" && recorder.stop()
        };

        return Promise.all([
          stopped,
          recorded,
        ])
          .then(() => data);
      })
        .then (recordedChunks => {
          this.videoRecording.textContent = "";
          this.videoRecording.value = "";
          this.recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
          this.videoRecording.src = URL.createObjectURL(this.recordedBlob);
          this.videoDownloadButton.href = this.videoRecording.src;
          this.videoDownloadButton.download = "RecordedVideo.webm";
        })
    }, false);

    this.videoStopButton.addEventListener("click", () => {
      stop(this.videoPreview.srcObject);
    }, false);

    this.blobDownload();

  }

  blobDownload() {
    this.videoDownloadButton.addEventListener('click', () => {
      if ( this.recordedBlob ) {
        this.uploadedFilesToArrayBuffer([this.recordedBlob]).then( () => { this.uploadedFilesUITreatment() });
      }
      this.closeVideoRecordingModal();
    })
  }

  // [Prepare array buffer for sending to server]
  uploadedFilesToArrayBuffer(files) {
    return new Promise((resolve) => {
      let promisesArray = [];
      files.forEach(file => {
        promisesArray.push(
          new Promise((resolve) => {
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              resolve(
                {
                  name: file.name ? file.name : `${file.type} file`,
                  size: (file.size * 0.00000095367432).toFixed(2),
                  type: file.type,
                  file: reader.result,
                }
              )
            };
            reader.onerror = () => {
              console.log(reader.error);
            };
          })
        );
      })
      Promise.all(promisesArray).then( items => {
        for (let item of items) {
          this.uploadedFiles.push(item);
        }
        resolve(this.uploadedFiles);
      })
    })
  }

  // Pinned messages
  pinnedMessagesEventListener() {
    const ws = this.ws;
    const sendPinnedMessage = function( element ) {
      this.handleEvent = function( event ) {
        ws.send(BSON.serialize({
          type: 'pinned',
          uuid: event.target.dataset['id'],
        }));
      };
      element.removeEventListener('click', this, false);
      element.addEventListener('click', this, false);
    }
    document.querySelectorAll('.message-clip').forEach( element => {
      new sendPinnedMessage( element );
    })
  }
}
