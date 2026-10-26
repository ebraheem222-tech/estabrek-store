/**
 * A line between the admin's editor and the parts of the page that answer it themselves
 * (the 3D stage's scene editor). Only the studio frame opens it (StudioBridge, which checks
 * the admin's address); everywhere else nothing is ever sent or heard.
 */
type Message = Record<string, unknown> & { type?: string };
type Listener = (msg: Message) => void;

let sender: ((msg: Message) => void) | null = null;
const listeners = new Set<Listener>();

export const studioLink = {
  /** The bridge opens the line (or closes it with null); listeners hear `linkOpen`. */
  open(send: ((msg: Message) => void) | null) {
    sender = send;
    if (send) listeners.forEach((l) => l({ type: "linkOpen" }));
  },
  get isOpen() {
    return sender !== null;
  },
  /** To the admin (nothing when the line is closed). */
  send(msg: Message) {
    sender?.(msg);
  },
  /** From the admin, through the bridge. */
  emit(msg: Message) {
    listeners.forEach((l) => l(msg));
  },
  listen(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
