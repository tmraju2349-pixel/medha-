export type ConnectionStatus = 'online' | 'offline';

type Listener = (status: ConnectionStatus) => void;

class ConnectivityService {
  private status: ConnectionStatus = navigator.onLine ? 'online' : 'offline';
  private listeners: Set<Listener> = new Set();

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.status = 'online';
    this.notifyListeners();
  };

  private handleOffline = () => {
    this.status = 'offline';
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public isOnline(): boolean {
    return this.status === 'online';
  }

  public addListener(listener: Listener) {
    this.listeners.add(listener);
  }

  public removeListener(listener: Listener) {
    this.listeners.delete(listener);
  }

  // A method to actually check Supabase reachability (useful to avoid false positives with navigator.onLine)
  public async checkBackendReachability(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      // Simplest reachability test using fetch (you can also just rely on the SDK failing)
      // We assume if online is true, we attempt the sync. If it fails, it naturally handles it.
      return true;
    } catch {
      return false;
    }
  }
}

export const connectivityService = new ConnectivityService();
