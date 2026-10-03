import { BrowserWindow, Notification } from 'electron';
import { msUntilNext } from '../shared/reminder';

/** One gentle daily nudge at the chosen time. The wording never counts missed days. */
export class ReminderScheduler {
  private timer?: ReturnType<typeof setTimeout>;

  set(time: string | undefined): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!time || !Notification.isSupported()) return;
    this.timer = setTimeout(() => {
      const n = new Notification({ title: 'A moment for you', body: 'Paroh is here whenever you want to write.', silent: true });
      n.on('click', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      });
      n.show();
      this.set(time);
    }, msUntilNext(time, new Date()));
  }
}
