import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Compass,
  Crosshair,
  Pause,
  Play,
  Radio,
  ShieldAlert,
  Navigation,
  Plus,
  Trash2,
  Phone,
  Share2,
  Check,
  AlertTriangle,
  RotateCcw,
  Home,
  ShieldCheck,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';

export const GeofencingView: React.FC = () => {
  const {
    db,
    currentLocation,
    addSafeZone,
    deleteSafeZone,
    updateHomeRadius,
    triggerSOS,
    clearSOS,
    sosActive,
    sosCountdown,
    cancelSOSCountdown,
    activeSafeZone,
    warningZone,
    zoneStatus,
    distanceToHome,
    isLiveTracking,
    startLiveTracking,
    stopLiveTracking,
    simulateBreach,
    simulateReturnHome,
    getWhatsAppSOSUrl,
    calibrateGPS,
    gpsAccuracyQuality,
    addToast,
    setHomeToCurrentLocation,
    accuracyTolerance,
    currentPatient,
    battery,
    trackingMode,
    setTrackingMode,
    lastSosDispatch,
  } = useMedha();

  const patientName = currentPatient?.name || db.book.profile.name || 'Patient';
  const patientFirstName = patientName.split(' ')[0] || patientName;
  const caregiverName = db.caregivers?.[0]?.name || currentPatient?.emergencyContact?.split('(')[0]?.trim() || 'Guardian';
  const caregiverFirstName = caregiverName.split(' ')[0] || caregiverName;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const caregiverMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const breadcrumbPolylineRef = useRef<any>(null);
  const warningLayerRef = useRef<any>(null);
  const zoneLayersRef = useRef<Record<number, any>>({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(60);
  const [newZoneCategory, setNewZoneCategory] = useState<'home' | 'temple' | 'park' | 'market' | 'other'>('temple');
  const [isPendingClick, setIsPendingClick] = useState(false);

  const homeZone = db.zones.find((z) => z.id === 1 || z.category === 'home') || db.zones[0] || {
    id: 1,
    name: '🏠 Home',
    lat: 26.1832,
    lng: 91.7425,
    r: 75,
  };

  const currentSafe = activeSafeZone();
  const currentWarn = warningZone();

  // Initialize Map centered on user or Home
  useEffect(() => {
    if (!mapContainerRef.current || !(window as any).L || leafletMapRef.current) return;

    const L = (window as any).L;
    const initialLat = currentLocation?.lat || homeZone.lat || 26.1832;
    const initialLng = currentLocation?.lng || homeZone.lng || 91.7425;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      maxZoom: 19,
    }).setView([initialLat, initialLng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    leafletMapRef.current = map;

    // Handle map click for adding safe place
    map.on('click', (e: any) => {
      if (!isPendingClick) return;
      const categoryIcons: Record<string, string> = {
        home: '🏠',
        temple: '🛕',
        park: '🌳',
        market: '🍵',
        other: '📍',
      };
      const icon = categoryIcons[newZoneCategory] || '📍';
      const name = newZoneName.trim() || `${icon} Custom Safe Place`;
      addSafeZone(`${icon} ${name.replace(/^[^\w\s]+\s*/, '')}`, e.latlng.lat, e.latlng.lng, newZoneRadius);
      setIsPendingClick(false);
      setShowAddForm(false);
      setNewZoneName('');
      addToast('Safe place placed on map 📍', '✅');
    });

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isPendingClick, newZoneName, newZoneRadius, newZoneCategory, addSafeZone, addToast, currentLocation?.lat, currentLocation?.lng, homeZone.lat, homeZone.lng]);

  // Render zones, amber buffers, breadcrumbs, and user marker
  useEffect(() => {
    const map = leafletMapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // Clear old zone circles
    Object.values(zoneLayersRef.current).forEach((layer) => map.removeLayer(layer));
    zoneLayersRef.current = {};

    if (warningLayerRef.current) {
      map.removeLayer(warningLayerRef.current);
      warningLayerRef.current = null;
    }

    if (breadcrumbPolylineRef.current) {
      map.removeLayer(breadcrumbPolylineRef.current);
      breadcrumbPolylineRef.current = null;
    }

    // Render breadcrumbs path if available
    if (db.breadcrumbs && db.breadcrumbs.length > 1) {
      const latLngs = db.breadcrumbs.map((pt) => [pt.lat, pt.lng]);
      breadcrumbPolylineRef.current = L.polyline(latLngs, {
        color: '#2B6CB0',
        weight: 3,
        opacity: 0.7,
        dashArray: '5 8',
      }).addTo(map);
      breadcrumbPolylineRef.current.bindTooltip(`🚶 ${patientFirstName}’s walking path history`);
    }

    // Render safe zones
    db.zones.forEach((z) => {
      if (z.lat == null || z.lng == null) return;

      const isHome = z.id === 1 || z.category === 'home';
      const color = isHome ? '#0E7C66' : z.category === 'temple' ? '#D97706' : z.category === 'park' ? '#16A34A' : '#0284C7';

      const circle = L.circle([z.lat, z.lng], {
        radius: z.r,
        color: color,
        fillColor: color,
        fillOpacity: 0.14,
        weight: 2.5,
        dashArray: isHome ? undefined : '6 5',
      }).addTo(map);

      circle.bindTooltip(
        `<div style="font-family:sans-serif;font-weight:bold;font-size:12px;">${z.name} · ${z.r}m<br/><span style="font-size:10px;color:#666;">${z.address || 'Designated safety perimeter'}</span></div>`,
        { sticky: true }
      );
      zoneLayersRef.current[z.id] = circle;

      // Draw amber warning buffer ring around safe zones (+25m)
      const amberRing = L.circle([z.lat, z.lng], {
        radius: z.r + 25,
        color: '#F59E0B',
        fillColor: 'transparent',
        weight: 1.5,
        dashArray: '3 6',
        opacity: 0.5,
      }).addTo(map);
      amberRing.bindTooltip(`⚠️ Amber Buffer (${z.name} +25m)`);
      zoneLayersRef.current[z.id * 1000] = amberRing;
    });

    // Render user marker & accuracy
    if (currentLocation) {
      const ll = [currentLocation.lat, currentLocation.lng];
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(ll);
      } else {
        userMarkerRef.current = L.marker(ll, {
          title: `${patientFirstName}’s Current Location`,
          riseOnHover: true,
        }).addTo(map);
        userMarkerRef.current.bindTooltip(`📍 ${patientName} (Live GPS)`).openTooltip();
      }

      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(ll).setRadius(currentLocation.accuracy || 10);
      } else {
        accuracyCircleRef.current = L.circle(ll, {
          radius: currentLocation.accuracy || 10,
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      }
    }

    // Render caregiver marker
    if (db.caregiverLocation) {
      const caregiverIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #D97706; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">👩‍⚕️</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const cll = [db.caregiverLocation.lat, db.caregiverLocation.lng];
      if (caregiverMarkerRef.current) {
        caregiverMarkerRef.current.setLatLng(cll);
      } else {
        caregiverMarkerRef.current = L.marker(cll, {
          title: 'Caregiver Location',
          icon: caregiverIcon,
          riseOnHover: true,
        }).addTo(map);
        caregiverMarkerRef.current.bindTooltip(`👩‍⚕️ Caregiver (${caregiverFirstName})`).openTooltip();
      }
    } else if (caregiverMarkerRef.current) {
      map.removeLayer(caregiverMarkerRef.current);
      caregiverMarkerRef.current = null;
    }

  }, [db.zones, db.breadcrumbs, currentLocation, db.caregiverLocation, patientFirstName, patientName, caregiverFirstName]);

  const handleCenterOnMe = () => {
    if (currentLocation && leafletMapRef.current) {
      leafletMapRef.current.setView([currentLocation.lat, currentLocation.lng], 17);
    } else if (homeZone.lat && homeZone.lng && leafletMapRef.current) {
      leafletMapRef.current.setView([homeZone.lat, homeZone.lng], 16);
    }
  };

  const handleArmZoneAdd = () => {
    setIsPendingClick(true);
    addToast('Tap anywhere on the map to place this safe zone 👆', '📍');
  };

  const handleTakeMeHome = () => {
    const lat = homeZone.lat || 26.1832;
    const lng = homeZone.lng || 91.7425;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(url, '_blank');
    addToast('Opening walking navigation to Home in Google Maps 🧭', '🚶');
  };

  const applyPresetTemplate = (name: string, r: number, cat: 'home' | 'temple' | 'park' | 'market') => {
    setNewZoneName(name);
    setNewZoneRadius(r);
    setNewZoneCategory(cat);
  };

  return (
    <section id="page-geo" className="page active space-y-4">
      {/* 5-Second Accidental Trigger Cancellation Banner */}
      {sosCountdown !== null && (
        <div
          id="sosCountdownBanner"
          className="card p-4 items-center justify-between gap-3 text-white flex flex-wrap shadow-lift animate-pulse"
          style={{ background: 'linear-gradient(120deg,#F59E0B,#D97706)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">⏱️</span>
            <div>
              <p className="text-base font-extrabold">
                Perimeter Breach Detected — Alerting {caregiverFirstName} in {sosCountdown}s
              </p>
              <p className="text-xs text-white/90">
                If this is a false alarm or test, cancel immediately.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              id="cancelSOSCountdownBtn"
              onClick={cancelSOSCountdown}
              className="px-4 py-2 rounded-xl bg-white font-extrabold text-sm cursor-pointer shadow-sm"
              style={{ color: '#D97706' }}
            >
              Cancel / False Alarm ✕
            </button>
            <button
              onClick={() => triggerSOS('immediate trigger', true)}
              className="px-3 py-2 rounded-xl bg-red-600 font-bold text-xs cursor-pointer text-white"
            >
              Alert Now 🚨
            </button>
          </div>
        </div>
      )}

      {/* SOS Active Emergency Banner */}
      {sosActive && (
        <div
          id="geoBanner"
          className="card p-4 items-center justify-between gap-3 text-white flex flex-wrap shadow-lift"
          style={{ background: 'linear-gradient(120deg,#D65A3F,#C2452D)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <p className="text-base font-extrabold">
                SOS Active · Outside All Safe Zones!
              </p>
              <p className="text-xs text-white/90">
                Guardian {caregiverName} has been alerted with live GPS coordinates.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              id="geoWhatsAppSOS"
              href={getWhatsAppSOSUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              💬 WhatsApp {caregiverFirstName} Pin
            </a>
            <button
              id="geoImSafe"
              onClick={clearSOS}
              className="px-4 py-2 rounded-xl bg-white font-extrabold text-xs cursor-pointer"
              style={{ color: '#C2452D' }}
            >
              I'm safe ✓
            </button>
          </div>
        </div>
      )}

      {/* Status Ribbon (Safe vs Warning vs Breach) */}
      {!sosActive && sosCountdown === null && (
        <div
          className="p-3.5 rounded-2xl flex items-center justify-between gap-3 border flex-wrap"
          style={{
            background:
              zoneStatus === 'safe'
                ? '#F0FDF4'
                : zoneStatus === 'warning'
                ? '#FFFBEB'
                : '#FEF2F2',
            borderColor:
              zoneStatus === 'safe'
                ? '#BBF7D0'
                : zoneStatus === 'warning'
                ? '#FDE68A'
                : '#FECACA',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">
              {zoneStatus === 'safe' ? '🛡️' : zoneStatus === 'warning' ? '⚠️' : '🚨'}
            </span>
            <div>
              <p
                className="text-xs font-bold"
                style={{
                  color:
                    zoneStatus === 'safe'
                      ? '#166534'
                      : zoneStatus === 'warning'
                      ? '#92400E'
                      : '#991B1B',
                }}
              >
                {zoneStatus === 'safe'
                  ? `Inside ${currentSafe?.name || 'Safe Zone'} · Safe Perimeter Protected`
                  : zoneStatus === 'warning'
                  ? `Caution: Near Perimeter Edge (${distanceToHome ?? 0}m from Home) · Approaching buffer`
                  : `Outside All Safe Zones (${distanceToHome ?? 0}m away)`}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isLiveTracking
                  ? 'Continuous GPS patrol active · updating every few seconds'
                  : 'GPS standing by · Tap "Continuous Live GPS" for active patrol'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTakeMeHome}
              className="chip px-3 py-1.5 text-xs font-extrabold bg-white hover:bg-gray-50 cursor-pointer shadow-xs border flex items-center gap-1"
              style={{ color: '#0E7C66' }}
            >
              🧭 Take Me Home
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-4 lg:col-span-2">
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-5 h-5 text-[#0E7C66]" />
                  <h3 className="font-display font-bold text-lg ink">Live Geofencing Map</h3>
                </div>
                {isLiveTracking && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                    ● Live Patrol
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    gpsAccuracyQuality === 'high'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : gpsAccuracyQuality === 'medium'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-orange-50 text-orange-800 border-orange-200'
                  }`}
                  title="GPS accuracy radius with adaptive smoothing filter"
                >
                  <Radio className="w-3 h-3 text-emerald-700" />
                  <span>{gpsAccuracyQuality === 'high' ? 'Satellite' : gpsAccuracyQuality === 'medium' ? 'Assisted' : 'Network'}</span>
                  {currentLocation?.accuracy ? ` ±${Math.round(currentLocation.accuracy)}m` : ''}
                </span>
              </div>
              <p className="text-xs muted mt-0.5">
                Guwahati, Assam · OpenStreetMap with Safe Perimeters &amp; Walking Trail
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                id="calibrateGpsBtn"
                onClick={calibrateGPS}
                className="chip px-2.5 py-2 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer border border-blue-200 flex items-center gap-1.5"
                title="Force refresh high-precision satellite coordinates"
              >
                <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                <span>Calibrate GPS</span>
              </button>

              {isLiveTracking ? (
                <button
                  id="stopTrackingBtn"
                  onClick={stopLiveTracking}
                  className="chip px-3 py-2 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer border border-rose-200 flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5 text-rose-600" />
                  <span>Pause GPS</span>
                </button>
              ) : (
                <button
                  id="useRealLoc"
                  onClick={() => startLiveTracking(true)}
                  className="chip px-3 py-2 text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer border border-emerald-200 flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Continuous Live GPS</span>
                </button>
              )}

              <button
                id="homeWalk"
                onClick={handleCenterOnMe}
                className="chip px-3 py-2 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer flex items-center gap-1.5"
                title={`Center on ${patientFirstName}`}
              >
                <Crosshair className="w-3.5 h-3.5 text-[#0E7C66]" />
                <span>Center</span>
              </button>

              <button
                id="takeMeHomeBtn"
                onClick={handleTakeMeHome}
                className="chip px-3 py-2 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer flex items-center gap-1.5"
                title="Open Walking Navigation"
              >
                <Navigation className="w-3.5 h-3.5 text-[#0E7C66]" />
                <span>Take Me Home</span>
              </button>
            </div>
          </div>

          {/* Leaflet Map Stage */}
          <div
            ref={mapContainerRef}
            id="geoMap"
            className="w-full rounded-xl relative z-1 overflow-hidden"
            style={{ height: '440px', background: '#F2EEE4', border: '1.5px solid var(--line)' }}
          />

          {/* Map Sub-Controls & Home Radius Adjuster */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold muted">Home radius:</label>
            <input
              id="radiusRange"
              type="range"
              min="30"
              max="300"
              step="5"
              value={homeZone.r || 75}
              onChange={(e) => updateHomeRadius(+e.target.value)}
              className="flex-1 min-w-32 cursor-pointer"
            />
            <span id="radiusVal" className="text-xs font-bold ink min-w-12">
              {homeZone.r || 75} m
            </span>
            <button
              id="anchorHomeBtn"
              onClick={setHomeToCurrentLocation}
              className="chip px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer border border-emerald-200 flex items-center gap-1.5"
              title={`Set Home safe zone to ${patientFirstName}'s current GPS location`}
            >
              <Home className="w-3.5 h-3.5 text-emerald-700" />
              <span>Anchor Home Here</span>
            </button>
            <button
              id="addZoneBtn"
              onClick={() => setShowAddForm(!showAddForm)}
              className="chip px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer"
            >
              {showAddForm ? '✕ Close form' : '➕ Add safe place'}
            </button>
          </div>

          {/* Add Safe Zone Panel */}
          {showAddForm && (
            <div id="addZoneForm" className="mt-3 p-3.5 rounded-xl border bg-[#FBFDFB] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold ink">Configure new safe place:</span>
                <span className="text-[11px] muted">Preset templates:</span>
              </div>

              {/* Preset Chips */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('🏠 Nizarapara Home', 75, 'home')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white border font-bold hover:bg-gray-50 cursor-pointer"
                >
                  🏠 Home (75m)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('🛕 Nabagraha Mandir', 65, 'temple')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white border font-bold hover:bg-gray-50 cursor-pointer"
                >
                  🛕 Mandir (65m)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('🌳 Dighalipukhuri Lake', 85, 'park')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white border font-bold hover:bg-gray-50 cursor-pointer"
                >
                  🌳 Lake Park (85m)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('🍵 Tea Corner & Market', 50, 'market')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white border font-bold hover:bg-gray-50 cursor-pointer"
                >
                  🍵 Tea Stall (50m)
                </button>
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <input
                  id="zoneNameInp"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Place name (e.g. Guwahati Library)"
                  className="chip px-3 py-2 bg-white text-sm flex-1 min-w-44"
                />

                <div className="flex items-center gap-1.5">
                  <span className="text-xs muted">Radius:</span>
                  <input
                    type="number"
                    min="20"
                    max="400"
                    step="5"
                    value={newZoneRadius}
                    onChange={(e) => setNewZoneRadius(+e.target.value)}
                    className="w-16 px-2 py-1.5 text-xs bg-white border rounded-lg text-center font-bold"
                  />
                  <span className="text-xs muted">m</span>
                </div>

                <button
                  id="zonePlaceBtn"
                  onClick={handleArmZoneAdd}
                  className={`btn-p px-4 py-2 text-xs cursor-pointer ${
                    isPendingClick ? 'bg-amber-600 animate-pulse' : ''
                  }`}
                >
                  {isPendingClick ? '👆 Tap on map now' : '📍 Tap map to place'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Simulation / Drill Row */}
          <div className="mt-4 pt-3 border-t flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold muted">Emergency & Drill Simulations:</span>
            <div className="flex gap-2">
              <button
                id="simulateBreachBtn"
                onClick={simulateBreach}
                className="chip px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                title="Test how SOS and geofence breach works"
              >
                🚶 Simulate Wander Breach
              </button>
              <button
                id="simulateReturnHomeBtn"
                onClick={simulateReturnHome}
                className="chip px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                title={`Return ${patientFirstName} safely to Home`}
              >
                🏡 Return to Home
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Safe Zones List & Emergency Card */}
        <div className="space-y-4">
          {/* Safe Zones List */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0E7C66]" />
                <h3 className="font-display font-bold text-lg ink">Designated Zones</h3>
              </div>
              <span className="text-xs font-bold muted">{db.zones.length} places</span>
            </div>

            <div id="zonesList" className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {db.zones.map((zone, idx) => (
                <div
                  key={`safe-zone-${zone.id}-${idx}`}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-[#F6F9F7] transition-all hover:bg-[#EEF5F1]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold ink truncate">{zone.name}</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white text-gray-700 border">
                        {zone.r}m
                      </span>
                    </div>
                    {zone.address && (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{zone.address}</p>
                    )}
                  </div>

                  {zone.id === 1 ? (
                    <span
                      className="chip px-2 py-0.5 text-[9px] font-bold bg-[#EDF6F2]"
                      style={{ color: '#0A5C4C' }}
                    >
                      PRIMARY
                    </span>
                  ) : (
                    <button
                      onClick={() => deleteSafeZone(zone.id)}
                      className="w-7 h-7 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                      title="Remove zone"
                      aria-label="Remove zone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Dispatch & SOS Info Card */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="font-display font-bold text-lg ink">Emergency Dispatch</h3>
            </div>
            <p className="text-xs muted leading-relaxed">
              If {patientFirstName} leaves designated safe areas, MEDHA alerts {caregiverName} with live GPS coordinates, accuracy estimates, and walking directions back home.
            </p>

            <div className="mt-3 p-2.5 rounded-xl bg-gray-50 border space-y-1">
              <div className="flex justify-between text-xs">
                <span className="muted">Status:</span>
                <span
                  className="font-bold flex items-center gap-1"
                  style={{
                    color:
                      zoneStatus === 'safe'
                        ? '#0A5C4C'
                        : zoneStatus === 'warning'
                        ? '#D97706'
                        : 'var(--danger)',
                  }}
                >
                  {zoneStatus === 'safe' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Inside safe perimeter</span>
                    </>
                  ) : zoneStatus === 'warning' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Approaching boundary</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Perimeter breached</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="muted">Distance to Home:</span>
                <span className="font-bold ink">{distanceToHome ?? 0} meters</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="muted">Accuracy:</span>
                <span className="font-bold ink">
                  ±{Math.round(currentLocation?.accuracy || 10)}m · {gpsAccuracyQuality.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="muted">Applied Tolerance:</span>
                <span className="font-bold text-teal-800">
                  ±{Math.round(accuracyTolerance)}m buffer
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="muted">Coordinates:</span>
                <span className="font-mono text-[11px] ink">
                  {currentLocation?.lat.toFixed(4)}, {currentLocation?.lng.toFixed(4)}
                </span>
              </div>
            </div>

            {/* Direct WhatsApp Emergency Link */}
            <a
              id="geoWhatsAppQuick"
              href={getWhatsAppSOSUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <span>💬 Dispatch WhatsApp Location to {caregiverFirstName}</span>
            </a>

            {/* Test SOS Button */}
            <button
              id="testSOS"
              onClick={() => triggerSOS('manual test button', false)}
              className="mt-2 w-full py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg,#D65A3F,#C2452D)' }}
            >
              🚨 Test SOS (5s Countdown Drill)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
