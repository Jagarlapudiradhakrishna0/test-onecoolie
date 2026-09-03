const fs = require('fs');
const path = require('path');
const {
  fetchLiveStationBoard,
  fetchPnrStatus,
  syncAllStationsToDatabase,
  SUPPORTED_STATIONS
} = require('../services/railwayService');

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

  let liveTrains = [];
  try {
    if (station && SUPPORTED_STATIONS[station.toUpperCase()]) {
      const board = await fetchLiveStationBoard(station.toUpperCase(), 6);
      if (board?.allTrains) {
        liveTrains = board.allTrains.map((t) => ({
          train_no: t.trainNumber,
          train_name: t.trainName,
          train_type: t.trainType,
          from: { code: t.origin, name: t.origin },
          to: { code: t.destination, name: t.destination },
          stops: [{ code: station.toUpperCase(), name: SUPPORTED_STATIONS[station.toUpperCase()] }],
          scheduled_arrival: t.scheduledArrival,
          expected_arrival: t.expectedArrival,
          scheduled_departure: t.scheduledDeparture,
          expected_departure: t.expectedDeparture,
          platform: t.platform,
          delay_minutes: t.delayMinutes,
          status: t.status,
          is_live: true
        }));
      }
    }
  } catch (err) {
    // Live board fallback
  }

  const allCatalog = getTrainsDatabase();

  // Pre-booking catalogue for station
  const stationCatalog = station
    ? allCatalog.filter((t) => t.stops?.some((s) => s.code.toUpperCase() === station.toUpperCase()))
    : allCatalog;

  // If no query string, return live running trains first, followed by station pre-booking catalogue!
  if (!q) {
    const combined = [
      ...liveTrains,
      ...stationCatalog.filter((ct) => !liveTrains.some((lt) => lt.train_no === ct.train_no))
    ].slice(0, 35);
    return res.json(combined);
  }

  // Filter live trains matching query
  const liveMatches = liveTrains.filter((t) =>
    t.train_no.toLowerCase().includes(q) ||
    t.train_name.toLowerCase().includes(q) ||
    t.from?.name?.toLowerCase().includes(q) ||
    t.to?.name?.toLowerCase().includes(q)
  );

  // Combine with catalog for advance pre-booking
  const catalogMatches = allCatalog
    .filter((t) =>
      t.train_no.toLowerCase().includes(q) ||
      t.train_name.toLowerCase().includes(q) ||
      t.from?.name?.toLowerCase().includes(q) ||
      t.to?.name?.toLowerCase().includes(q) ||
      t.stops?.some((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    )
    .filter((ct) => !liveMatches.some((lt) => lt.train_no === ct.train_no));

  const combined = [...liveMatches, ...catalogMatches].slice(0, 35);

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

/**
 * Dynamically update Train API key in memory
 * POST /api/trains/update-key
 */
exports.updateTrainApiKey = (req, res) => {
  const { apiKey, apiHost } = req.body;
  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({ success: false, message: 'API key is required.' });
  }
  process.env.TRAIN_API_KEY = apiKey.trim();
  if (apiHost) process.env.TRAIN_API_HOST = apiHost.trim();
  return res.json({ success: true, message: 'Train API Key updated successfully.' });
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