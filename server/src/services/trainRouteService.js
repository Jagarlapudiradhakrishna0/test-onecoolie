/**
 * server/src/services/trainRouteService.js
 *
 * ONECOOLIE Train-Aware Route & Stop Engine
 *
 * Provides authoritative train route sequence, station stop lookup,
 * direction/ordering validation, and assistant acceptance checks.
 *
 * Data Sources:
 * 1. stationTimetables.js (South Central Railway authoritative timetables with exact stop sequence & platforms)
 * 2. trains.json (All-India official timetable index with origin, destination, and stops)
 */

const fs = require('fs');
const path = require('path');
const { STATION_TIMETABLES } = require('../data/stationTimetables');
const { SUPPORTED_STATIONS } = require('./railwayService');

const TRAINS_FILE_PATH = path.join(__dirname, '..', 'data', 'trains.json');

// Authoritative ONECOOLIE Operating Stations strictly restricted to:
// Kazipet Junction (KZJ), Secunderabad Junction (SC), Warangal (WL), Vijayawada Junction (BZA)
const CORE_OPERATIONAL_STATIONS = {
  KZJ: 'Kazipet Junction',
  SC: 'Secunderabad Junction',
  WL: 'Warangal',
  BZA: 'Vijayawada Junction'
};

const KNOWN_STATION_NAMES = { ...CORE_OPERATIONAL_STATIONS };

/**
 * Returns human-readable name for a railway station code
 */
function getStationName(code) {
  if (!code) return '';
  const clean = String(code).trim().toUpperCase();
  return CORE_OPERATIONAL_STATIONS[clean] || clean;
}

/**
 * Loads trains from trains.json
 */
let cachedTrainsJson = null;
function getTrainsJson() {
  if (cachedTrainsJson) return cachedTrainsJson;
  try {
    if (fs.existsSync(TRAINS_FILE_PATH)) {
      const raw = fs.readFileSync(TRAINS_FILE_PATH, 'utf8');
      cachedTrainsJson = JSON.parse(raw);
      return cachedTrainsJson;
    }
  } catch (err) {
    console.error('[TRAIN ROUTE SERVICE] Error loading trains.json:', err.message);
  }
  return [];
}

/**
 * Retrieves the authentic, ordered stops for a given train number.
 * Preserves the exact train journey sequence, filtered strictly to ONECOOLIE's
 * authorized operating stations (Kazipet, Warangal, Vijayawada, Secunderabad).
 *
 * @param {string} trainNumber - E.g. '12738'
 * @returns {object|null} { train_no, train_name, from, to, stops: [{ code, name, platform, arr, dep, sequence }] }
 */
function getTrainRouteStops(trainNumber) {
  if (!trainNumber) return null;
  const cleanNo = String(trainNumber).trim().toUpperCase();

  // 1. Check curated South Central Railway timetables first (Authoritative timetable order)
  const timetableEntry = STATION_TIMETABLES.find(
    (t) => String(t.train_no).trim().toUpperCase() === cleanNo
  );

  if (timetableEntry) {
    const stopsList = [];
    const seenCodes = new Set();

    // Add origin if defined and not already in stops
    if (timetableEntry.from?.code) {
      const origCode = timetableEntry.from.code.toUpperCase();
      stopsList.push({
        code: origCode,
        name: getStationName(origCode) || timetableEntry.from.name || origCode,
        platform: '1',
        arr: null,
        dep: timetableEntry.scheduled_departure || null,
        is_origin: true,
        sequence: stopsList.length + 1
      });
      seenCodes.add(origCode);
    }

    // Add intermediate stations in the exact chronological sequence defined in timetable
    if (timetableEntry.stations && typeof timetableEntry.stations === 'object') {
      for (const [stCode, stInfo] of Object.entries(timetableEntry.stations)) {
        const code = stCode.toUpperCase();
        if (!seenCodes.has(code)) {
          stopsList.push({
            code,
            name: getStationName(code) || code,
            platform: stInfo.platform || '1',
            arr: stInfo.arr || null,
            dep: stInfo.dep || null,
            sequence: stopsList.length + 1
          });
          seenCodes.add(code);
        } else {
          // Update platform & times on existing stop (e.g. Origin)
          const existing = stopsList.find((s) => s.code === code);
          if (existing) {
            if (stInfo.platform) existing.platform = stInfo.platform;
            if (stInfo.arr) existing.arr = stInfo.arr;
            if (stInfo.dep) existing.dep = stInfo.dep;
          }
        }
      }
    }

    // Add destination if defined and not already in stops
    if (timetableEntry.to?.code) {
      const destCode = timetableEntry.to.code.toUpperCase();
      if (!seenCodes.has(destCode)) {
        stopsList.push({
          code: destCode,
          name: getStationName(destCode) || timetableEntry.to.name || destCode,
          platform: '1',
          arr: timetableEntry.scheduled_arrival || null,
          dep: null,
          is_destination: true,
          sequence: stopsList.length + 1
        });
        seenCodes.add(destCode);
      }
    }

    // Filter strictly to ONECOOLIE's authorized operational stations (KZJ, SC, WL, BZA)
    // preserving the train's authentic journey order
    const operationalStops = stopsList
      .filter((s) => Boolean(CORE_OPERATIONAL_STATIONS[s.code]))
      .map((s) => ({
        ...s,
        name: CORE_OPERATIONAL_STATIONS[s.code]
      }));

    operationalStops.forEach((s, idx) => {
      s.sequence = idx + 1;
    });

    return {
      train_no: timetableEntry.train_no,
      train_name: timetableEntry.train_name,
      train_type: timetableEntry.train_type || 'EXPRESS',
      from: timetableEntry.from,
      to: timetableEntry.to,
      stops: operationalStops
    };
  }

  // 2. Fallback to All-India trains.json database
  const catalog = getTrainsJson();
  const catalogEntry = catalog.find(
    (t) => String(t.train_no).trim().toUpperCase() === cleanNo
  );

  if (catalogEntry) {
    const stopsList = [];
    const seenCodes = new Set();

    // Origin
    if (catalogEntry.from?.code) {
      const origCode = catalogEntry.from.code.toUpperCase();
      stopsList.push({
        code: origCode,
        name: getStationName(origCode) || catalogEntry.from.name || origCode,
        platform: '1',
        arr: null,
        dep: catalogEntry.scheduled_departure || null,
        is_origin: true,
        sequence: stopsList.length + 1
      });
      seenCodes.add(origCode);
    }

    // Stops array from trains.json
    if (Array.isArray(catalogEntry.stops)) {
      for (const st of catalogEntry.stops) {
        const code = (st.code || '').toUpperCase();
        if (code && !seenCodes.has(code)) {
          stopsList.push({
            code,
            name: getStationName(code) || st.name || code,
            platform: '1',
            arr: null,
            dep: null,
            sequence: stopsList.length + 1
          });
          seenCodes.add(code);
        }
      }
    }

    // Destination
    if (catalogEntry.to?.code) {
      const destCode = catalogEntry.to.code.toUpperCase();
      if (!seenCodes.has(destCode)) {
        stopsList.push({
          code: destCode,
          name: getStationName(destCode) || catalogEntry.to.name || destCode,
          platform: '1',
          arr: catalogEntry.scheduled_arrival || null,
          dep: null,
          is_destination: true,
          sequence: stopsList.length + 1
        });
        seenCodes.add(destCode);
      }
    }

    // Filter strictly to ONECOOLIE's authorized operational stations (KZJ, SC, WL, BZA)
    // preserving the train's authentic journey order
    const operationalStops = stopsList
      .filter((s) => Boolean(CORE_OPERATIONAL_STATIONS[s.code]))
      .map((s) => ({
        ...s,
        name: CORE_OPERATIONAL_STATIONS[s.code]
      }));

    operationalStops.forEach((s, idx) => {
      s.sequence = idx + 1;
    });

    return {
      train_no: catalogEntry.train_no,
      train_name: catalogEntry.train_name,
      train_type: catalogEntry.train_type || 'EXPRESS',
      from: catalogEntry.from,
      to: catalogEntry.to,
      stops: operationalStops
    };
  }

  return null;
}

/**
 * Validates that:
 * 1. The train exists
 * 2. Boarding station is a valid scheduled stop
 * 3. Destination station is a valid scheduled stop (if provided)
 * 4. Boarding station occurs BEFORE destination station on the train's route
 *
 * @param {string} trainNumber
 * @param {string} boardingCode
 * @param {string} [destinationCode]
 * @returns {object} { valid: boolean, error?: string, train?: object, boardingStop?: object, destinationStop?: object }
 */
function validateTrainStations(trainNumber, boardingCode, destinationCode) {
  if (!trainNumber) {
    return { valid: false, error: 'Train number is required.' };
  }

  const routeData = getTrainRouteStops(trainNumber);
  if (!routeData || !Array.isArray(routeData.stops) || routeData.stops.length === 0) {
    return {
      valid: false,
      error: `Train ${trainNumber} does not stop at any supported station (Kazipet, Warangal, Vijayawada, Secunderabad).`
    };
  }

  const cleanBoarding = String(boardingCode || '').trim().toUpperCase();
  const cleanDest = destinationCode ? String(destinationCode).trim().toUpperCase() : null;

  if (!cleanBoarding) {
    return { valid: false, error: 'Boarding station is required.' };
  }

  const boardingIndex = routeData.stops.findIndex((s) => s.code === cleanBoarding);
  if (boardingIndex === -1) {
    const validCodes = routeData.stops.map((s) => `${s.name} (${s.code})`).join(', ');
    return {
      valid: false,
      error: `Station '${cleanBoarding}' is not a scheduled stop for train ${trainNumber}. Scheduled stops: ${validCodes}`
    };
  }

  let destIndex = -1;
  if (cleanDest) {
    destIndex = routeData.stops.findIndex((s) => s.code === cleanDest);
    if (destIndex === -1) {
      const validCodes = routeData.stops.map((s) => `${s.name} (${s.code})`).join(', ');
      return {
        valid: false,
        error: `Destination '${cleanDest}' is not a scheduled stop for train ${trainNumber}. Scheduled stops: ${validCodes}`
      };
    }

    if (destIndex <= boardingIndex) {
      return {
        valid: false,
        error: `Destination station (${cleanDest}) must appear after boarding station (${cleanBoarding}) on train ${trainNumber}'s route.`
      };
    }
  }

  return {
    valid: true,
    train: routeData,
    boardingStop: routeData.stops[boardingIndex],
    destinationStop: destIndex >= 0 ? routeData.stops[destIndex] : null
  };
}

/**
 * Evaluates whether an assistant has genuinely accepted/in-progress a booking.
 * Once accepted, station & train details must be locked to prevent invalidating the assistant.
 *
 * @param {object} booking
 * @returns {boolean}
 */
function isAssistantAcceptedBooking(booking) {
  if (!booking) return false;

  const rawStatus = String(booking.booking_status || booking.status || '').toLowerCase();
  const rawAssistantStatus = String(booking.assistant_status || booking.services?.assistant_status || '').toLowerCase();

  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled' || rawAssistantStatus === 'cancelled';
  if (isCancelled) return false;

  // Genuine assistant acceptance states
  const acceptedStates = ['accepted', 'arriving', 'reached', 'arrived', 'in_service', 'completed'];

  if (booking.assistant_id && acceptedStates.includes(rawAssistantStatus)) {
    return true;
  }

  if (
    booking.assistant_id &&
    acceptedStates.includes(rawStatus) &&
    rawAssistantStatus !== 'pending' &&
    rawAssistantStatus !== 'assigned'
  ) {
    return true;
  }

  return false;
}

/**
 * Validates whether requested booking changes are permitted for this booking state.
 *
 * Rules:
 * - Completed/Cancelled/In-service bookings cannot be modified
 * - If assistant has accepted: station & train details are strictly locked
 * - If assistant has not accepted: train and stations are validated for authentic route sequence
 *
 * @param {object} booking
 * @param {object} requestedChanges
 * @returns {object} { allowed: boolean, error?: string, isAssistantAccepted: boolean, lockedFields?: string[] }
 */
function canModifyBookingDetails(booking, requestedChanges = {}) {
  if (!booking) {
    return { allowed: false, error: 'Booking not found.' };
  }

  const currentStatus = String(booking.booking_status || booking.status || '').toLowerCase();
  if (['in_service', 'completed', 'cancelled', 'canceled'].includes(currentStatus)) {
    return {
      allowed: false,
      error: `Bookings in '${currentStatus}' status cannot be modified.`
    };
  }

  const isAccepted = isAssistantAcceptedBooking(booking);

  const {
    station_code,
    source,
    destination,
    train_number,
    train_no
  } = requestedChanges;

  if (isAccepted) {
    const stationChanged = Boolean(
      (station_code && station_code.trim().toUpperCase() !== String(booking.station_code || '').trim().toUpperCase()) ||
      (source && source.trim().toUpperCase() !== String(booking.source || '').trim().toUpperCase())
    );
    const destChanged = Boolean(
      destination && destination.trim().toUpperCase() !== String(booking.destination || '').trim().toUpperCase()
    );
    const targetTrainNo = (train_number || train_no || '').trim().toUpperCase();
    const currentTrainNo = String(booking.train_number || booking.train_no || '').trim().toUpperCase();
    const trainChanged = Boolean(targetTrainNo && targetTrainNo !== currentTrainNo);

    if (stationChanged || destChanged || trainChanged) {
      return {
        allowed: false,
        error: 'Station and train details cannot be changed after an assistant has accepted this booking.'
      };
    }

    return {
      allowed: true,
      isAssistantAccepted: true,
      lockedFields: ['station_code', 'source', 'destination', 'train_number', 'train_no']
    };
  }

  // Before assistant acceptance: validate train and route stops
  const targetTrain = (train_number || train_no || booking.train_number || booking.train_no || '').trim();
  const targetBoarding = (station_code || source || booking.station_code || booking.source || '').trim().toUpperCase();
  const targetDestination = (destination || booking.destination || '').trim().toUpperCase();

  if (targetTrain && targetBoarding) {
    const routeValidation = validateTrainStations(targetTrain, targetBoarding, targetDestination);
    if (!routeValidation.valid) {
      return {
        allowed: false,
        error: routeValidation.error
      };
    }
    return {
      allowed: true,
      isAssistantAccepted: false,
      train: routeValidation.train,
      boardingStop: routeValidation.boardingStop,
      destinationStop: routeValidation.destinationStop
    };
  }

  return {
    allowed: true,
    isAssistantAccepted: false
  };
}

module.exports = {
  KNOWN_STATION_NAMES,
  getStationName,
  getTrainRouteStops,
  validateTrainStations,
  isAssistantAcceptedBooking,
  canModifyBookingDetails
};
