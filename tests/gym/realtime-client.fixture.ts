const harness = (window as any).__realtimeTest;
class Channel {
  name: string;
  listeners: Array<{ name: string; listener: (message: any) => void }> = [];
  archived: Array<{ name: string; listener: (message: any) => void }> = [];
  presence: any;
  detached = false;
  constructor(name: string) {
    this.name = name;
    this.presence = {
      subscribe: (listener: (message: any) => void) => { this.archived.push({ name: "presence", listener }); return Promise.resolve(); },
      unsubscribe: () => {}, enter: () => Promise.resolve(), leave: () => Promise.resolve(),
      get: () => new Promise(resolve => { harness.presence.push({ channel: this, resolve }); }),
    };
  }
  subscribe(name: string, listener: (message: any) => void) { const item = { name, listener }; this.listeners.push(item); this.archived.push(item); return Promise.resolve(); }
  unsubscribe(name?: string, listener?: (message: any) => void) { this.listeners = this.listeners.filter(item => name && (item.name !== name || (listener && item.listener !== listener))); }
  detach() { this.detached = true; return Promise.resolve(); }
  emit(name: string, data: unknown, archived = false) { for (const item of archived ? this.archived : this.listeners) if (item.name === name) item.listener({ data, clientId: "synthetic", action: "enter" }); }
}
export class Realtime {
  serial = harness.clients.length + 1;
  closed = false;
  options: any;
  auth: any;
  channels: any;
  allChannels = new Map<string, Channel>();
  constructor(options: any) {
    this.options = options;
    this.auth = { tokenDetails: null, authorize: () => new Promise((resolve, reject) => {
      harness.authorizations.push({ client: this, resolve: () => {
        const workspace = new URL(options.authUrl, location.origin).searchParams.get("workspaceId");
        const capability: Record<string, string[]> = workspace ? {
          [`user:synthetic:workspace:${workspace}:chat`]: ["subscribe"],
          [`workspace:${workspace}:presence`]: ["subscribe", "presence"],
          [`workspace:${workspace}:user:synthetic:presence`]: ["subscribe", "presence"],
          [`workspace:${workspace}:user:contact:presence`]: ["subscribe"],
          [`migration:${workspace}`]: ["subscribe"],
        } : {};
        this.auth.tokenDetails = { capability: JSON.stringify(capability) }; resolve(this.auth.tokenDetails);
      }, reject });
    }) };
    this.channels = { get: (name: string) => {
      if (!this.allChannels.has(name)) this.allChannels.set(name, new Channel(name));
      return this.allChannels.get(name);
    } };
    harness.clients.push(this);
  }
  close() { this.closed = true; }
}
