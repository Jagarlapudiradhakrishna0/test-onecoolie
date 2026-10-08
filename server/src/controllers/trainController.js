const fs = require('fs');
const path = require('path');
const {
  fetchLiveStationBoard,
  fetchPnrStatus,
  syncAllStationsToDatabase,
  SUPPORTED_STATIONS
} = require('../services/railwayService');
const { getStationTimetable, findTrainsInTimetable } = require('../data/stationTimetables');

const TRAINS_FILE_PATH = path.join(__dirname, '..', 'data', 'trains.json');

/**
 * Returns latest trains from disk
 */
const getTrainsDatabase = () => {
  try {
    if (fs.existsSync(TRAINS_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(TRAINS_FILE_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading trains.json:', err.message);
  }
  return [];
};

/**
 * Real-Time train search with live telemetry lookup & advance pre-booking
 * GET /api/trains/search?query=...&station=KZJ
 */
exports.searchTrains = async (req, res) => {
  const { query = '', station } = req.query;
  const q = String(query).toLowerCase().trim();
  const stationCode = station ? station.toUpperCase().trim() : null;

  let liveTrains = [];
  try {
    if (stationCode && SUPPORTED_STATIONS[stationCode]) {
      const board = await fetchLiveStationBoard(stationCode, 4);
      if (board?.allTrains) {
        liveTrains = board.allTrains.map((t) => ({
          train_no: t.trainNumber,
          train_name: t.trainName,
          train_type: t.trainType,
          from: { code: t.origin, name: t.origin },
          to: { code: t.destination, name: t.destination },
          stops: [{ code: stationCode, name: SUPPORTED_STATIONS[stationCode] }],
          scheduled_arrival: t.scheduledArrival,
          expected_arrival: t.expectedArrival,
          scheduled_departure: t.scheduledDeparture,
          expected_departure: t.expectedDeparture,
          platform: t.platform,
          delay_minutes: t.delayMinutes,
          status: t.status,
          is_live: true,
          is_advance_schedule: false,
          diffMinutes: t.diffMinutes
        }));
      }
    }
  } catch (err) {
    // Live board fallback
  }

  // Get authentic South Central Railway schedule for the station
  const stationTimetable = stationCode ? getStationTimetable(stationCode) : [];

  // Current time in IST
  const str = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const now = new Date(str);
  const currentDayMinutes = now.getHours() * 60 + now.getMinutes();

  // Convert station timetable into formatted advance catalog trains
  const advanceFromTimetable = stationTimetable
    .filter((st) => !liveTrains.some((lt) => lt.train_no === st.train_no))
    .map((st) => {
      const [hh, mm] = (st.scheduled_arrival || st.scheduled_departure || '00:00').split(':').map(Number);
      let diffMinutes = (hh * 60 + mm) - currentDayMinutes;
      if (diffMinutes < -30) diffMinutes += 1440;

      return {
        train_no: st.train_no,
        train_name: st.train_name,
        train_type: st.train_type || 'EXPRESS',
        from: st.from,
        to: st.to,
        stops: [{ code: stationCode, name: SUPPORTED_STATIONS[stationCode] }],
        scheduled_arrival: st.scheduled_arrival,
        expected_arrival: st.scheduled_arrival,
        scheduled_departure: st.scheduled_departure,
        expected_departure: st.scheduled_departure,
        platform: st.platform || '1',
        delay_minutes: 0,
        status: 'Advance Schedule',
        is_live: false,
        is_advance_schedule: true,
        diffMinutes
      };
    })
    .sort((a, b) => a.diffMinutes - b.diffMinutes);

  // If no search query, return live running trains first, followed by chronologically sorted schedule!
  if (!q) {
    const combined = [...liveTrains, ...advanceFromTimetable].slice(0, 40);
    return res.json(combined);
  }

  // Parse train number (e.g. 5 digits like 12721) or keywords
  const numberMatch = q.match(/\b\d{4,5}\b/);
  const searchNumber = numberMatch ? numberMatch[0] : null;
  const tokens = q.split(/[\s·•\-_–—]+/).filter((t) => t.length > 2);

  const isMatch = (t) => {
    const no = (t.train_no || '').toLowerCase();
    const name = (t.train_name || '').toLowerCase();
    const fromName = (t.from?.name || '').toLowerCase();
    const toName = (t.to?.name || '').toLowerCase();

    // Direct train number match
    if (searchNumber && no === searchNumber) return true;
    if (no.includes(q) || (no.length >= 4 && q.includes(no))) return true;

    // Direct string match
    if (name.includes(q) || q.includes(name) || fromName.includes(q) || toName.includes(q)) {
      return true;
    }

    // Token match
    if (tokens.length > 0) {
      const fullText = `${no} ${name} ${fromName} ${toName}`;
      if (tokens.some((tok) => fullText.includes(tok))) {
        return true;
      }
    }

    return false;
  };

  // Filter live trains matching query
  const liveMatches = liveTrains.filter(isMatch);

  // Filter station timetable matching query
  const timetableMatches = advanceFromTimetable
    .filter((t) => !liveMatches.some((lt) => lt.train_no === t.train_no))
    .filter(isMatch);

  // Fallback to allCatalog for any other train across Indian Railways
  const allCatalog = getTrainsDatabase();
  const catalogMatches = allCatalog
    .filter((t) =>
      !liveMatches.some((lt) => lt.train_no === t.train_no) &&
      !timetableMatches.some((tt) => tt.train_no === t.train_no) &&
      (isMatch(t) || t.stops?.some((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)))
    )
    .map((ct) => ({
      ...ct,
      expected_arrival: ct.scheduled_arrival || null,
      expected_departure: ct.scheduled_departure || null,
      platform: ct.platform || '1',
      delay_minutes: 0,
      status: 'Advance Schedule',
      is_live: false,
      is_advance_schedule: true
    }));

  const combined = [...liveMatches, ...timetableMatches, ...catalogMatches].slice(0, 40);
  res.json(combined);
};

/**
 * Auto-sync all pilot stations from live railway APIs into trains.json
 * POST /api/trains/sync
 */
exports.syncTrainsDatabase = async (req, res) => {
  try {
    const results = await syncAllStationsToDatabase();
    const updated = getTrainsDatabase();
    res.json({
      success: true,
      message: 'Trains database automatically updated from API feeds.',
      syncedStations: results,
      totalTrainsInDatabase: updated.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Real-Time Live Station Board (Arrivals & Departures)
 * GET /api/trains/live-station?stationCode=KZJ&hours=4
 */
exports.getLiveStationBoard = async (req, res) => {
  try {
    const { stationCode = 'KZJ', hours = '4' } = req.query;

    const normalizedCode = String(stationCode).toUpperCase().trim();

    if (!SUPPORTED_STATIONS[normalizedCode]) {
      return res.status(400).json({
        message: `Invalid station code '${stationCode}'. Supported stations: ${Object.keys(SUPPORTED_STATIONS).join(', ')}`
      });
    }

    const data = await fetchLiveStationBoard(normalizedCode, parseInt(hours, 10) || 4);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    const status = error.status || 500;
    console.error('LIVE STATION BOARD ERROR:', error.message);

    return res.status(status).json({
      success: false,
      message: error.message || 'Live train information is temporarily unavailable.',
      code: error.code || 'TRAIN_API_ERROR'
    });
  }
};

/**
 * Returns the list of supported stations
 * GET /api/trains/supported-stations
 */
exports.getSupportedStations = (req, res) => {
  const stations = Object.entries(SUPPORTED_STATIONS).map(([code, name]) => ({
    code,
    name
  }));
  res.json(stations);
};

const { validateTrainHost, ALLOWED_TRAIN_API_HOSTS } = require('../utils/ssrfValidator');

/**
 * Dynamically update Train API key in memory (Admin only)
 * POST /api/trains/update-key
 */
exports.updateTrainApiKey = (req, res) => {
  const { apiKey, apiHost } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return res.status(400).json({ success: false, message: 'API key is required.' });
  }

  // Key format validation (no malicious characters / buffer overflow)
  const cleanKey = apiKey.trim();
  if (cleanKey.length > 128 || !/^[A-Za-z0-9_-]+$/.test(cleanKey)) {
    return res.status(400).json({ success: false, message: 'Malformed API key format.' });
  }

  if (apiHost) {
    if (!validateTrainHost(apiHost)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unauthorized train API host. Host must belong to approved providers list: ' + ALLOWED_TRAIN_API_HOSTS.join(', ')
      });
    }
    const cleanHost = apiHost.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
    process.env.TRAIN_API_HOST = cleanHost;
    process.env.TRAIN_API_BASE_URL = `https://${cleanHost}`;
  }

  process.env.TRAIN_API_KEY = cleanKey;
  return res.json({ success: true, message: 'Train API configuration updated successfully.' });
};

/**
 * PNR Status Lookup
 * GET /api/trains/pnr-status?pnrNumber=1234567890
 */
exports.getPnrStatus = async (req, res) => {
  try {
    const { pnrNumber } = req.query;
    if (!pnrNumber) {
      return res.status(400).json({ success: false, message: 'PNR number is required.' });
    }

    const data = await fetchPnrStatus(pnrNumber);
    return res.json({ success: true, data });

  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Unable to fetch PNR details.'
    });
  }
};

const { getTrainRouteStops } = require('../services/trainRouteService');

/**
 * Train Route & Stops Lookup
 * GET /api/trains/:trainNo/route
 */
exports.getTrainRoute = async (req, res) => {
  try {
    const { trainNo } = req.params;
    if (!trainNo) {
      return res.status(400).json({ success: false, message: 'Train number is required.' });
    }

    const routeData = getTrainRouteStops(trainNo);
    if (!routeData) {
      return res.status(404).json({
        success: false,
        message: `Unable to load stations for train ${trainNo}.`
      });
    }

    return res.json({
      success: true,
      ...routeData
    });
  } catch (error) {
    console.error('GET TRAIN ROUTE ERROR:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching train route stops.'
    });
  }
};