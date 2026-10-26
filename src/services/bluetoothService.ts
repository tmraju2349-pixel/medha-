/**
 * Web Bluetooth Management Service for MEDHA
 * Handles hardware Bluetooth permission requests, device discovery, and caregiver sync.
 */

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  pairedAt: number;
}

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Requests Bluetooth device permission and pairs with nearby device
 */
export async function requestBluetoothDevicePermission(): Promise<{
  success: boolean;
  device?: BluetoothDeviceInfo;
  error?: string;
  isIframeBlocked?: boolean;
}> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      error: 'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera on desktop or Android.',
    };
  }

  try {
    // Request device with generic services or acceptAllDevices
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'battery_service',
        'device_information',
        'generic_access',
        'heart_rate',
      ],
    });

    const pairedInfo: BluetoothDeviceInfo = {
      id: device.id,
      name: device.name || 'MEDHA Companion Link',
      connected: device.gatt ? device.gatt.connected : true,
      pairedAt: Date.now(),
    };

    // Store in localStorage for persistent session indication
    try {
      localStorage.setItem('medha_bluetooth_device', JSON.stringify(pairedInfo));
    } catch {
      // ignore
    }

    return {
      success: true,
      device: pairedInfo,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    const isCancel = err.name === 'NotFoundError' || msg.includes('cancelled') || msg.includes('canceled') || msg.includes('User cancelled');
    const isIframe = msg.includes('Permissions policy') || msg.includes('feature policy') || msg.includes('iframe');

    return {
      success: false,
      error: isCancel ? 'Pairing prompt was dismissed.' : msg,
      isIframeBlocked: isIframe,
    };
  }
}

export function getSavedBluetoothDevice(): BluetoothDeviceInfo | null {
  try {
    const raw = localStorage.getItem('medha_bluetooth_device');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSavedBluetoothDevice(): void {
  try {
    localStorage.removeItem('medha_bluetooth_device');
  } catch {
    // ignore
  }
}
