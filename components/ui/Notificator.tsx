'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { AudioManager } from '@/lib/audio';

export interface NotificatorRef {
  message: (
    message: string,
    type?: 'info' | 'warn' | 'error',
    time?: number,
    after?: () => void,
    sfx?: boolean
  ) => void;
  dialog: (
    buildDialogFunction: (
      closeDialogFunc: () => void,
      createButton: (
        label: string,
        onClick: (this: GlobalEventHandlers, ev: MouseEvent) => any
      ) => HTMLButtonElement
    ) => {
      text?: string;
      innerHTML?: string;
      buttons: Array<HTMLButtonElement>;
    },
    soundtrack?: 'winning' | 'losing'
  ) => void;
}

interface NotificatorProps { }

const Notificator = forwardRef<NotificatorRef, NotificatorProps>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    message(message, type = 'info', time = 2, after, sfx = true) {
      const folder = document.querySelector('div.notify') as HTMLDivElement;
      if (!folder) return;

      const element = document.createElement('div') as HTMLDivElement;
      element.className = 'notification';
      element.textContent = message;
      element.setAttribute('data-notif-type', type);

      folder.appendChild(element);
      let alreadyHidden = false;
      const animationText = 'popoff .7s cubic-bezier(.62,.25,1,-0.73)';

      element.onclick = () => {
        alreadyHidden = true;
        element.style.animation = animationText;
        setTimeout(() => {
          folder.removeChild(element);
          element.remove();
          if (after) after();
        }, 700);
      };

      setTimeout(() => {
        if (!alreadyHidden) {
          element.style.animation = animationText;
          setTimeout(() => {
            folder.removeChild(element);
            element.remove();
            if (after) after();
          }, 700);
        }
      }, time * 1000);

      if (sfx) {
        AudioManager.getInstance().playNotification();
      }
    },

    dialog(buildDialogFunction, soundtrack) {
      const dialogScreen = document.querySelector(
        'div.dialog-screen'
      ) as HTMLDivElement;
      const dialogElement = document.querySelector(
        'div.dialog-box'
      ) as HTMLDivElement;

      if (!dialogScreen || !dialogElement) return;

      const textsElement = dialogElement.querySelector(
        'div.texts'
      ) as HTMLDivElement;
      const buttonsElement = dialogElement.querySelector(
        'div.buttons'
      ) as HTMLDivElement;

      const functionResults = buildDialogFunction(
        () => {
          dialogScreen.setAttribute('data-show', 'false');
          dialogElement.setAttribute('data-show', 'false');
          dialogElement.style.animation =
            'dialogout 1s cubic-bezier(.5,0,1,.5)';
          setTimeout(() => {
            dialogElement.style.animation = '';
            textsElement.textContent = '';
            buttonsElement.replaceChildren();
          }, 1000);
        },
        (label, onClick) => {
          const button = document.createElement('button');
          button.onclick = onClick;
          button.textContent = label;
          return button;
        }
      );

      dialogElement.setAttribute('data-show', 'true');
      dialogScreen.setAttribute('data-show', 'true');
      const resolvedText =
        typeof functionResults.text === 'string'
          ? functionResults.text
          : (functionResults.innerHTML || '');
      textsElement.textContent = resolvedText;
      for (const button of functionResults.buttons) {
        buttonsElement.appendChild(button);
      }

      // Play soundtrack
      if (soundtrack === 'losing') {
        AudioManager.getInstance().playWrongAnswer();
      } else if (soundtrack === 'winning') {
        AudioManager.getInstance().playWin();
      }
    },
  }));

  return (
    <>
      <div className="notify"></div>
      <div className="dialog-screen" data-show="false"></div>
      <div className="dialog-box" data-show="false">
        <div className="texts"></div>
        <div className="buttons"></div>
      </div>
    </>
  );
});

Notificator.displayName = 'Notificator';

export default Notificator;
